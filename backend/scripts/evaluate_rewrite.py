"""Language-purification evaluation (PDF p26): toxicity mitigation and semantic preservation, before vs after.

Always reported: the project's own conflict score of the original and of each alternative.
Optional, need `transformers` + `torch` and download a model on first use:
  --similarity [MODEL]  cosine similarity of sentence embeddings (the plan's Sentence-BERT metric)
  --toxicity [MODEL]    an independent Korean toxicity classifier, replacing the plan's Perspective API,
                        which accepts no new users and shuts down on 2026-12-31.
"""

import argparse
import json
from pathlib import Path

from app.analysis import get_analyzer
from app.provider import get_provider
from app.schemas import ConversationInput
from app.scoring import conflict_score


def embedder(name):
    """Mean-pooled sentence embeddings, the pooling Sentence-BERT models are trained with."""
    import torch
    from transformers import AutoModel, AutoTokenizer
    tokenizer, model = AutoTokenizer.from_pretrained(name), AutoModel.from_pretrained(name)
    def similarity(first, second):
        batch = tokenizer([first, second], padding=True, truncation=True, return_tensors="pt")
        with torch.no_grad():
            hidden = model(**batch).last_hidden_state
        mask = batch["attention_mask"].unsqueeze(-1)
        vectors = (hidden * mask).sum(1) / mask.sum(1)
        return float(torch.nn.functional.cosine_similarity(vectors[0], vectors[1], dim=0))
    return similarity


def toxicity_scorer(name, clean_label):
    """Toxicity = 1 - P(clean) for a classifier that has a 'clean' class."""
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    tokenizer, model = AutoTokenizer.from_pretrained(name), AutoModelForSequenceClassification.from_pretrained(name)
    labels = {label.lower(): index for index, label in model.config.id2label.items()}
    if clean_label.lower() not in labels:
        raise SystemExit(f"{name}에 '{clean_label}' 라벨이 없습니다. 라벨: {list(labels)} → --clean-label로 지정하세요.")
    multi_label = model.config.problem_type == "multi_label_classification"
    def toxicity(text):
        with torch.no_grad():
            logits = model(**tokenizer(text, truncation=True, return_tensors="pt")).logits[0]
        probabilities = torch.sigmoid(logits) if multi_label else torch.softmax(logits, dim=0)
        return 1 - float(probabilities[labels[clean_label.lower()]])
    return toxicity


def main() -> int:
    parser = argparse.ArgumentParser(description="언어 순화 평가: 독성 감소와 의미 보존")
    parser.add_argument("--cases", default=str(Path(__file__).resolve().parents[1] / "examples" / "rewrite_cases.json"))
    parser.add_argument("--similarity", nargs="?", const="jhgan/ko-sroberta-multitask", help="문장 임베딩 모델 (기본 jhgan/ko-sroberta-multitask)")
    parser.add_argument("--toxicity", nargs="?", const="smilegate-ai/kor_unsmile", help="한국어 독성 분류 모델 (기본 smilegate-ai/kor_unsmile)")
    parser.add_argument("--clean-label", default="clean", help="독성 분류 모델에서 '문제 없음'을 뜻하는 라벨 이름")
    args = parser.parse_args()
    analyzer, generator = get_analyzer(), get_provider()
    analyzer.cache_enabled = False
    similarity = embedder(args.similarity) if args.similarity else None
    toxicity = toxicity_scorer(args.toxicity, args.clean_label) if args.toxicity else None
    mean = lambda values: sum(values) / len(values)
    totals = {"conflict_before": [], "conflict_after": [], "similarity": [], "toxicity_before": [], "toxicity_after": []}
    for case in json.loads(Path(args.cases).read_text(encoding="utf-8")):
        request = ConversationInput.model_validate(case)
        before = conflict_score(analyzer.analyze(request))
        alternatives = generator.alternatives(request)
        after = [conflict_score(analyzer.analyze(request.model_copy(update={"text": text}))) for text in alternatives]
        totals["conflict_before"].append(before)
        totals["conflict_after"].append(mean(after))
        line = f"{request.text}\n  갈등 점수 {before:.0f} → {[round(x) for x in after]}"
        if similarity:
            scores = [similarity(request.text, text) for text in alternatives]
            totals["similarity"].append(mean(scores))
            line += f" | 의미 유사도 {[round(x, 2) for x in scores]}"
        if toxicity:
            original, rewritten = toxicity(request.text), [toxicity(text) for text in alternatives]
            totals["toxicity_before"].append(original)
            totals["toxicity_after"].append(mean(rewritten))
            line += f" | 독성 {original:.2f} → {[round(x, 2) for x in rewritten]}"
        print(line + "".join(f"\n  {index + 1}. {text}" for index, text in enumerate(alternatives)))
    print("평균 | " + " | ".join(f"{key}={mean(values):.2f}" for key, values in totals.items() if values))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
