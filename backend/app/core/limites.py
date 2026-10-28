"""Limites de um lançamento, usados pela API (422) e repetidos nos CHECK do banco.

A migration 0013 grava os mesmos números nos CHECK de `lancamentos`. Mudou aqui,
precisa de uma migration nova com o valor novo.
"""
from __future__ import annotations

from decimal import Decimal

# Mês no formato AAAA-MM, de 2000 a 2099, com mês de 01 a 12. Recusa `2026-13`
# e `0000-00` (achado C7), que antes entravam e somavam num mês inexistente.
MES_PATTERN = r"^20\d{2}-(0[1-9]|1[0-2])$"

# Teto do consumo de UM lançamento (um campus ou um ponto de medição, num mês),
# em m³ ou kWh. O maior valor mensal da base local é 43.751 kWh (um campus
# inteiro, carga CPFL); a universidade toda fica na casa das centenas de
# milhares de kWh por mês. 10 milhões deixa folga de mais de 200 vezes sobre o
# maior campus e ainda pega o erro de digitação típico (três zeros a mais, ou o
# ponto de milhar lido como decimal ao contrário). Também fica bem abaixo do
# limite da coluna, Numeric(12, 3), que antes estourava como erro 500.
CONSUMO_MAXIMO = Decimal("10000000")

# Teto da fatura de um lançamento, em R$. Mesmo raciocínio: nenhuma conta mensal
# de água ou luz de um campus chega perto de R$ 10 milhões, e a coluna é Numeric(12, 2).
VALOR_RS_MAXIMO = Decimal("10000000")
