"""Regra do alerta de pico (SPEC R.4, pendência P5).

Pico = consumo do mês > LIMIAR_PICO × média dos JANELA_MESES meses anteriores,
por campus e por medida. A média usa só os meses da janela que têm lançamento
(mês sem dado não conta como zero, senão qualquer campus com buraco no
histórico viraria pico); com menos de HISTORICO_MINIMO meses assim, não há
comparação justa e o alerta não é avaliado.

Mudou aqui, muda em todo lugar: a API, a tela e o teste leem estas constantes.
"""
from __future__ import annotations

LIMIAR_PICO = 1.3
JANELA_MESES = 12
HISTORICO_MINIMO = 6
