"""Verdict evaluation in the AITA label space (PDF p23, p26), A/B swap consistency, and round-stability analysis.

Labels follow AITA from A's point of view: nta (A 잘못 없음), yta (A 잘못), esh (둘 다), nah (둘 다 아님).
Runs with whichever provider is configured; with the offline rules it only checks that the pipeline runs.
"""

import argparse
import csv
import json
import os
from pathlib import Path

from app.provider import get_provider
from app.schemas import VerdictInput
from app.verdict import build_core_state, run_debate, vote

GOLD_VOTE = {"nta": "A", "yta": "B", "esh": "even", "nah": "even"}


def total(side) -> float:
    return (side.logic + side.emotionControl + side.evidence) / 3


def label(result, fault=55, margin=10) -> str:
    """Map the six scores to an AITA label. Thresholds are starting values to tune on labelled data."""
    a, b = total(result.plaintiff), total(result.defendant)
    if a < fault and b < fault:
        return "esh"
    if abs(a - b) < margin:
        return "nah" if min(a, b) >= fault else "esh"
    return "nta" if a > b else "yta"


def load_aita(path, top_k):
    """AITA-Reddit-Dataset rows (title, text, verdict, score): the top-k posts by score.
    A post is one person's account, so every message is A's and B has no voice (the limitation noted in the plan)."""
    with open(path, encoding="utf-8", newline="") as handle:
        rows = sorted(csv.DictReader(handle), key=lambda row: -int(float(row.get("score") or 0)))
    cases = []
    for row in rows:
        if row.get("verdict", "").lower() not in GOLD_VOTE or not row.get("text", "").strip():
            continue
        body = row["text"].strip()
        chunks = [row["title"].strip()[:2000] or "(제목 없음)"] + [body[i:i + 2000] for i in range(0, min(len(body), 18000), 2000)]
        cases.append({"name": row["title"][:50], "label": row["verdict"].lower(), "relationship": "기타", "messages": [{"speaker": "A", "text": chunk} for chunk in chunks]})
        if len(cases) == top_k:
            break
    return cases


def judge(case, provider, swap=False):
    flip = {"A": "B", "B": "A"}
    messages = [{"speaker": flip[m["speaker"]] if swap else m["speaker"], "text": m["text"]} for m in case["messages"]]
    request = VerdictInput(room_id="eval", requester="A", mode="UFC", relationship=case["relationship"], recent_messages=messages, request_id="eval")
    snapshot = {"messages": messages, "relationship": case["relationship"], "temperature": 0, "version": 0}
    snapshot["core"] = build_core_state(request, snapshot, provider).model_dump()
    return run_debate(request, snapshot, provider, calls=1)


def main() -> int:
    parser = argparse.ArgumentParser(description="다툼판결 평가 (AITA 라벨 + A/B 교환 일관성 + 라운드 안정성)")
    parser.add_argument("--cases", default=str(Path(__file__).resolve().parents[1] / "examples" / "verdict_cases.json"))
    parser.add_argument("--aita", help="AITA-Reddit-Dataset CSV 경로 (title,text,verdict,score). 지정하면 --cases 대신 사용")
    parser.add_argument("--top-k", type=int, default=20, help="--aita에서 score 상위 몇 개를 쓸지")
    parser.add_argument("--swap", action="store_true", help="A/B를 바꿔 다시 판결하고 점수가 따라 바뀌는지 확인 (호출 2배)")
    parser.add_argument("--stability", action="store_true", help="조기 종료 없이 최대 라운드까지 돌리고 논문의 Beta-Binomial + KS 규칙으로 수렴 라운드를 분석")
    args = parser.parse_args()
    if args.swap and args.aita:
        parser.error("--swap은 양쪽 발화가 있는 --cases에서만 의미가 있습니다.")
    if args.stability:
        # Full-length debates are needed to see where the judgment distribution really stops moving.
        os.environ.update({"VERDICT_STABILITY_DELTA": "-1", "VERDICT_MAX_ROUNDS": "3"})
    provider = get_provider()
    cases = load_aita(args.aita, args.top_k) if args.aita else json.loads(Path(args.cases).read_text(encoding="utf-8"))
    correct = calls = rounds = 0
    correct_judges = []  # per case: number of panel judges agreeing with the gold label in each round
    for case in cases:
        result = judge(case, provider)
        predicted = label(result)
        correct += predicted == case["label"]
        calls += result.modelCalls
        rounds += result.rounds
        correct_judges.append([sum(vote(b) == GOLD_VOTE[case["label"]] for b in trace.beliefs) for trace in result.roundTrace])
        line = f"{'OK ' if predicted == case['label'] else 'MISS'} | {case['name']} | 정답={case['label']} 예측={predicted} | A={total(result.plaintiff):.0f} B={total(result.defendant):.0f} belief={result.belief:.2f} | {result.rounds}라운드 {result.stopReason}"
        if args.swap:
            swapped = judge(case, provider, swap=True)
            calls += swapped.modelCalls
            # After swapping speakers, the old A is the new B: a position-neutral judge keeps each person's score.
            drift = max(abs(total(result.plaintiff) - total(swapped.defendant)), abs(total(result.defendant) - total(swapped.plaintiff)))
            line += f" | 교환 후 점수 차이={drift:.1f}"
        print(line)
    print(f"정확도 {correct}/{len(cases)} | 평균 {rounds / len(cases):.1f}라운드 | 모델 호출 {calls}회 | provider={getattr(provider, 'vendor', 'openai')}/{provider.model}")
    if args.stability:
        from scripts.stability import stopping_round
        by_round = [[scores[t] for scores in correct_judges] for t in range(min(len(scores) for scores in correct_judges))]
        stop, distances = stopping_round(by_round, result.judges)
        print("라운드별 정답 심사위원 수:", by_round)
        print("연속 라운드 간 KS 거리 D_t:", [round(d, 3) for d in distances], "| 논문 규칙(D<0.05, 2회 연속) 수렴 라운드:", stop or "최대 라운드 안에 수렴하지 않음")
        if len(cases) < 30:
            print(f"주의: 사례 {len(cases)}개로는 혼합분포 추정이 불안정합니다. 수십 개 이상의 라벨된 사례로 실행하세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
