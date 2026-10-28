"""Indicadores e Eco Score por campus.

Metodologia (SPEC 1.4 a 1.6):

1. Só recebe nota o campus com população E área cadastradas, com pelo menos um
   lançamento no período e que não esteja marcado como fora do ranking.
2. A referência da universidade é ponderada: consumo total ÷ população total
   (água) e kWh total ÷ área total (energia), somando apenas os campi do item 1
   que têm lançamento daquela medida.
3. Cada medida vira uma nota de 0 a 100 pela razão com a referência
   (`compute_eco_score`). O Eco Score é a média das notas das medidas que o
   campus tem no período.
4. Campus sem nota não entra na referência e não recebe posição. O consumo dele
   continua nos totais da universidade.
"""
from __future__ import annotations

from typing import Iterable

from app.core.eco_score import arredondar_nota, classify_score, compute_eco_score
from app.schemas.carbono import FatorAplicado
from app.schemas.indicadores import IndicadorCampus, IndicadorUniversidade
from app.services.carbono import emissao_kg


def _razao(numerador: float, denominador: float) -> float | None:
    return numerador / denominador if denominador > 0 else None


def calcular_indicadores(rows: Iterable, fator: FatorAplicado | None = None) -> list[IndicadorCampus]:
    """Indicadores de cada campus, na ordem recebida.

    `rows` são os totais por campus (`_campus_totals`). Devem vir TODOS os
    campi, mesmo quando só um será exibido: a referência é calculada sobre o
    conjunto. `fator` é o de emissão do ano do período (R.2); sem ele, não há pegada.
    """
    linhas = []
    for row in rows:
        populacao = row.populacao or 0
        area = row.area_construida_m2 or 0
        tem_agua = (row.n_agua or 0) > 0
        tem_luz = (row.n_luz or 0) > 0

        if row.fora_do_ranking_motivo:
            situacao = "em_revisao"
        elif populacao <= 0 or area <= 0:
            situacao = "sem_cadastro"
        elif not (tem_agua or tem_luz):
            situacao = "sem_dados"
        else:
            situacao = "ok"

        linhas.append(
            {
                "row": row,
                "populacao": populacao,
                "area": area,
                "agua": float(row.agua or 0),
                "luz": float(row.luz or 0),
                "tem_agua": tem_agua,
                "tem_luz": tem_luz,
                "situacao": situacao,
            }
        )

    com_nota = [l for l in linhas if l["situacao"] == "ok"]
    com_agua = [l for l in com_nota if l["tem_agua"]]
    com_luz = [l for l in com_nota if l["tem_luz"]]
    ref_agua = _razao(sum(l["agua"] for l in com_agua), sum(l["populacao"] for l in com_agua))
    ref_luz = _razao(sum(l["luz"] for l in com_luz), sum(l["area"] for l in com_luz))

    output: list[IndicadorCampus] = []
    for l in linhas:
        row = l["row"]
        agua_per_capita = _razao(l["agua"], l["populacao"]) if l["tem_agua"] else None
        luz_por_m2 = _razao(l["luz"], l["area"]) if l["tem_luz"] else None
        luz_per_capita = _razao(l["luz"], l["populacao"]) if l["tem_luz"] else None

        score_agua = score_luz = eco_score = None
        if l["situacao"] == "ok":
            if agua_per_capita is not None and ref_agua is not None:
                score_agua = compute_eco_score(agua_per_capita, ref_agua)
            if luz_por_m2 is not None and ref_luz is not None:
                score_luz = compute_eco_score(luz_por_m2, ref_luz)
            parciais = [s for s in (score_agua, score_luz) if s is not None]
            if parciais:
                # Média das parciais sem arredondar; só o resultado é arredondado (3.6).
                eco_score = arredondar_nota(sum(parciais) / len(parciais))
            score_agua, score_luz = arredondar_nota(score_agua), arredondar_nota(score_luz)

        output.append(
            IndicadorCampus(
                campusId=row.id,
                nome=row.nome,
                populacao=l["populacao"],
                areaConstruidaM2=l["area"],
                situacao=l["situacao"],
                motivoForaDoRanking=row.fora_do_ranking_motivo,
                temDados=l["tem_agua"] or l["tem_luz"],
                demonstracao=(getattr(row, "n_demonstracao", 0) or 0) > 0,
                totalAgua=l["agua"],
                totalLuz=l["luz"],
                consumoAguaPerCapita=agua_per_capita,
                consumoLuzPorM2=luz_por_m2,
                consumoLuzPerCapita=luz_per_capita,
                emissaoKgCo2=emissao_kg(l["luz"], fator) if l["tem_luz"] else None,
                referenciaAguaPerCapita=ref_agua,
                referenciaLuzPorM2=ref_luz,
                ecoScore=eco_score,
                ecoScoreAgua=score_agua,
                ecoScoreLuz=score_luz,
                classificacao=classify_score(eco_score) if eco_score is not None else None,
            )
        )
    return output


def indicador_universidade(
    itens: Iterable[IndicadorCampus], fator: FatorAplicado | None = None
) -> IndicadorUniversidade:
    """kWh por pessoa da universidade (R.1), a partir dos indicadores por campus.

    Entram só os campi com energia e população no período. Campus sem cadastro
    ou fora do ranking também entra se tiver os dois números: aqui não há nota,
    é a universidade inteira.
    """
    itens = list(itens)
    considerados = [i for i in itens if i.consumo_luz_per_capita is not None]
    kwh_todos = sum(i.total_luz for i in itens)
    sem_populacao = [i for i in itens if i.total_luz > 0 and i.consumo_luz_per_capita is None]
    kwh = sum(i.total_luz for i in considerados)
    populacao = sum(i.populacao for i in considerados)
    return IndicadorUniversidade(
        kwhPorPessoa=_razao(kwh, populacao),
        kwh=kwh,
        populacao=populacao,
        campiConsiderados=[i.nome for i in considerados],
        campiSemPopulacao=[i.nome for i in sem_populacao],
        demonstracao=any(i.demonstracao for i in itens if i.total_luz > 0),
        emissaoKgCo2=emissao_kg(kwh_todos, fator) if kwh_todos > 0 else None,
        fatorEmissao=fator,
    )


def ordenar_ranking(itens: list[IndicadorCampus]) -> list[IndicadorCampus]:
    """Do melhor para o pior; quem não tem nota vai para o fim, na ordem original."""
    com_nota = sorted((i for i in itens if i.eco_score is not None), key=lambda i: i.eco_score, reverse=True)
    return com_nota + [i for i in itens if i.eco_score is None]
