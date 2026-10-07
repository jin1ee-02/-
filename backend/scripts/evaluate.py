"""Small human-readable evaluation and repeatability check for the live model."""

import argparse
import csv
import json
from pathlib import Path

from fastapi import HTTPException

from app.analysis import get_analyzer
from app.schemas import ConversationInput


def meld(path, limit, provider) -> int:
    """Thermometer check on MELD (PDF p26): does emotion >= 2 (분명한 짜증 이상) match MELD's anger/disgust labels?
    MELD is English and labels seven emotion classes, so only this binary 'expressed anger' view is comparable."""
    with open(path, encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    hit = predicted = actual = count = 0
    for index, row in enumerate(rows):
        if count == limit:
            break
        context = [r for r in rows[max(0, index - 10):index] if r["Dialogue_ID"] == row["Dialogue_ID"]]
        request = ConversationInput(speaker=row["Speaker"][:40], text=row["Utterance"][:2000], recent_messages=[{"speaker": r["Speaker"][:40], "text": r["Utterance"][:2000]} for r in context])
        emotion = provider.analyze(request).emotion
        if emotion is None:
            continue
        count += 1
        gold, guess = row["Emotion"].lower() in ("anger", "disgust"), emotion >= 2
        hit, predicted, actual = hit + (gold and guess), predicted + guess, actual + gold
    precision, recall = hit / max(1, predicted), hit / max(1, actual)
    print(f"MELD {count}개 발화 | 분노·혐오 {actual}개 | precision={precision:.2f} recall={recall:.2f} f1={2 * precision * recall / max(1e-9, precision + recall):.2f}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="한국어 갈등 신호 예시 평가")
    parser.add_argument("--meld", help="MELD CSV 경로 (예: dev_sent_emo.csv). 지정하면 감정 온도계의 분노 감지를 평가")
    parser.add_argument("--limit", type=int, default=200, help="--meld에서 평가할 발화 수")
    parser.add_argument("--repeats", type=int, default=1, help="같은 예시 반복 횟수 (기본 1)")
    args = parser.parse_args()
    if not 1 <= args.repeats <= 10:
        parser.error("--repeats는 1~10 사이여야 합니다.")

    cases = json.loads((Path(__file__).resolve().parents[1] / "examples" / "eval_cases.json").read_text(encoding="utf-8"))
    try:
        provider = get_analyzer()
        # Repeated measurements must invoke the model rather than replay the cache.
        provider.cache_enabled = False
    except HTTPException as error:
        print(error.detail)
        return 2
    if args.meld:
        return meld(args.meld, args.limit, provider)
    failures = 0
    for case in cases:
        request = ConversationInput.model_validate(case["input"])
        samples = [provider.analyze(request) for _ in range(args.repeats)]
        checks = case["checks"]
        passed = all(
            all(("min" not in bounds or getattr(sample, field) >= bounds["min"])
                and ("max" not in bounds or getattr(sample, field) <= bounds["max"])
                for field, bounds in checks.items())
            for sample in samples
        )
        failures += not passed
        scores = [{field: getattr(sample, field) for field in checks} for sample in samples]
        spread = {field: max(getattr(x, field) for x in samples) - min(getattr(x, field) for x in samples)
                  for field in checks}
        print(f"{'PASS' if passed else 'FAIL'} | {case['name']} | scores={scores} | spread={spread}")
    print(f"{len(cases) - failures}/{len(cases)} cases passed ({args.repeats} runs each)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
