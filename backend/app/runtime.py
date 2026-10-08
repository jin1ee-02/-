"""Bounded in-process caching and admission control; no chat text in logs."""

import contextvars
import hashlib
import json
import os
import threading
import time
from collections import OrderedDict
from contextlib import contextmanager

from fastapi import HTTPException

# Per-request collector for token/latency metadata; a list is installed by the code that wants the totals.
usage_log: contextvars.ContextVar[list | None] = contextvars.ContextVar("usage_log", default=None)


def usage_total(entries) -> dict | None:
    if not entries:
        return None
    return {key: round(sum(entry[key] for entry in entries), 2) for key in ("inputTokens", "cachedTokens", "outputTokens", "seconds")}


MODEL_SLOTS = threading.BoundedSemaphore(max(1, int(os.getenv("MODEL_CONCURRENCY", "4"))))
MODEL_WAIT = float(os.getenv("MODEL_WAIT_SECONDS", "20"))


@contextmanager
def model_slot():
    # Typing previews, sends and a verdict's judge panel overlap all the time; queue briefly instead of rejecting.
    if not MODEL_SLOTS.acquire(timeout=MODEL_WAIT):
        raise HTTPException(429, "AI가 다른 요청을 처리하고 있어요. 잠시 후 다시 시도해주세요.", headers={"Retry-After": "3"})
    try:
        yield
    finally:
        MODEL_SLOTS.release()


class TTLCache:
    def __init__(self, size=256, ttl=60):
        self.size, self.ttl = size, ttl
        self.entries = OrderedDict()
        self.lock = threading.Lock()

    def call(self, key_data, operation):
        key = hashlib.sha256(json.dumps(key_data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with self.lock:
            entry = self.entries.get(key)
            if entry and entry[0] > time.monotonic():
                self.entries.move_to_end(key)
                return entry[1]
            self.entries.pop(key, None)
        # Model concurrency is controlled separately. Exceptions are never cached.
        value = operation()
        with self.lock:
            self.entries[key] = (time.monotonic() + self.ttl, value)
            while len(self.entries) > self.size:
                self.entries.popitem(last=False)
        return value


analysis_cache = TTLCache()
