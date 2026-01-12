from __future__ import annotations

from decimal import Decimal

MIN_RELATIVE = Decimal("0")
MAX_RELATIVE = Decimal("2")
ECOLOGICO_MIN = Decimal("70")
ATENCAO_MIN = Decimal("40")


def compute_eco_score(total: Decimal, average: Decimal) -> Decimal:
    if average <= 0:
        return Decimal("100")
    relative = total / average
    if relative < MIN_RELATIVE:
        relative = MIN_RELATIVE
    if relative > MAX_RELATIVE:
        relative = MAX_RELATIVE
    normalized = relative / MAX_RELATIVE
    score = Decimal("100") - (normalized * Decimal("100"))
    return score.quantize(Decimal("0.01"))


def classify_score(score: Decimal) -> str:
    if score >= ECOLOGICO_MIN:
        return "Ecológico"
    if score >= ATENCAO_MIN:
        return "Atenção"
    return "Crítico"