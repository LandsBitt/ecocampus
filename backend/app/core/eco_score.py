from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EcoScoreConfig:
    # Lower/upper bounds for normalizing relative consumption.
    min_relative: float = 0.5
    max_relative: float = 1.5
    eco_threshold: int = 70
    attention_threshold: int = 40


CONFIG = EcoScoreConfig()


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def compute_eco_score(total: float, average: float, config: EcoScoreConfig = CONFIG) -> float:
    if average <= 0:
        return 100.0
    relative = total / average
    normalized = (relative - config.min_relative) / (config.max_relative - config.min_relative)
    normalized = _clamp(normalized, 0.0, 1.0)
    score = 100.0 - (normalized * 100.0)
    return _clamp(score, 0.0, 100.0)


def classify_score(score: float, config: EcoScoreConfig = CONFIG) -> str:
    if score >= config.eco_threshold:
        return "Ecológico"
    if score >= config.attention_threshold:
        return "Atenção"
    return "Crítico"