"""Totais mês a mês (SPEC R.5) e comparações com o mês e o ano anteriores (SPEC R.3).

Tudo sai de uma consulta só, agrupada por campus e mês, com a mesma regra de
`_campus_totals`: só consumo físico, sem a carga CPFL, água e energia separadas.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.api.routes.resumo import _CONTA_NOS_INDICADORES
from app.db.models import Campus, Lancamento, LancamentoOrigem, LancamentoTipo
from app.core.alertas import HISTORICO_MINIMO, JANELA_MESES, LIMIAR_PICO
from app.schemas.serie import AlertaPico, ComparacaoBloco, ComparacaoMedida, PontoSerie

MEDIDAS = ("agua", "luz")


def deslocar_mes(mes: str, n: int) -> str:
    """`deslocar_mes("2026-01", -1)` → "2025-12"."""
    ano, m = int(mes[:4]), int(mes[5:])
    total = ano * 12 + (m - 1) + n
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def meses_ate(ate: str, n: int) -> list[str]:
    """Os `n` meses que terminam em `ate`, do mais antigo para o mais recente."""
    return [deslocar_mes(ate, -i) for i in range(n - 1, -1, -1)]


@dataclass
class Totais:
    agua: float = 0.0
    luz: float = 0.0
    n_agua: int = 0
    n_luz: int = 0
    # Lançamentos de demonstração por medida (R.0): água simulada não marca a energia.
    n_demo_agua: int = 0
    n_demo_luz: int = 0

    def __add__(self, outro: Totais) -> Totais:
        return Totais(
            self.agua + outro.agua,
            self.luz + outro.luz,
            self.n_agua + outro.n_agua,
            self.n_luz + outro.n_luz,
            self.n_demo_agua + outro.n_demo_agua,
            self.n_demo_luz + outro.n_demo_luz,
        )

    def demonstracao(self, medida: str | None = None) -> bool:
        if medida == "agua":
            return self.n_demo_agua > 0
        if medida == "luz":
            return self.n_demo_luz > 0
        return self.n_demo_agua + self.n_demo_luz > 0

    def valor(self, medida: str) -> float | None:
        """Consumo da medida, ou None quando o mês não tem lançamento dela (≠ consumiu zero)."""
        tem = self.n_agua if medida == "agua" else self.n_luz
        return (self.agua if medida == "agua" else self.luz) if tem > 0 else None


def totais_por_campus_e_mes(
    db: Session, meses: list[str], campus_id: int | None = None
) -> dict[tuple[int, str], Totais]:
    agua = Lancamento.tipo == LancamentoTipo.agua
    luz = Lancamento.tipo == LancamentoTipo.luz
    demo = Lancamento.origem == LancamentoOrigem.demonstracao.value
    stmt = (
        select(
            Lancamento.campus_id,
            Lancamento.mes_referencia,
            func.coalesce(func.sum(case((agua, Lancamento.consumo), else_=0)), 0).label("agua"),
            func.coalesce(func.sum(case((luz, Lancamento.consumo), else_=0)), 0).label("luz"),
            func.count(case((agua, Lancamento.consumo))).label("n_agua"),
            func.count(case((luz, Lancamento.consumo))).label("n_luz"),
            func.count(case((and_(agua, demo), Lancamento.id))).label("n_demo_agua"),
            func.count(case((and_(luz, demo), Lancamento.id))).label("n_demo_luz"),
        )
        .where(_CONTA_NOS_INDICADORES, Lancamento.mes_referencia.in_(meses))
        .group_by(Lancamento.campus_id, Lancamento.mes_referencia)
    )
    if campus_id is not None:
        stmt = stmt.where(Lancamento.campus_id == campus_id)
    return {
        (r.campus_id, r.mes_referencia): Totais(
            float(r.agua), float(r.luz), r.n_agua, r.n_luz, r.n_demo_agua, r.n_demo_luz
        )
        for r in db.execute(stmt)
    }


def _por_mes(totais: dict[tuple[int, str], Totais]) -> dict[str, Totais]:
    soma: dict[str, Totais] = defaultdict(Totais)
    for (_, mes), t in totais.items():
        soma[mes] = soma[mes] + t
    return soma


def serie(db: Session, ate: str, n: int, campus_id: int | None = None) -> list[PontoSerie]:
    meses = meses_ate(ate, n)
    por_mes = _por_mes(totais_por_campus_e_mes(db, meses, campus_id))
    pontos = []
    for mes in meses:
        t = por_mes.get(mes, Totais())
        pontos.append(
            PontoSerie(
                mes=mes,
                agua=t.agua,
                luz=t.luz,
                temAgua=t.n_agua > 0,
                temLuz=t.n_luz > 0,
                demonstracao=t.demonstracao(),
            )
        )
    return pontos


def variacao_percentual(atual: float | None, base: float | None) -> float | None:
    """Sem base (mês sem lançamento) ou base zero, não há variação: nunca inventa 0% ou ∞."""
    if atual is None or base is None or base == 0:
        return None
    return (atual - base) / base * 100


def _comparar(atual: Totais, mes_anterior: Totais, ano_anterior: Totais, medida: str) -> ComparacaoMedida:
    a, m, y = atual.valor(medida), mes_anterior.valor(medida), ano_anterior.valor(medida)
    return ComparacaoMedida(
        atual=a,
        mesAnterior=m,
        anoAnterior=y,
        variacaoMensal=variacao_percentual(a, m),
        variacaoAnual=variacao_percentual(a, y),
        demonstracao=any(t.demonstracao(medida) for t in (atual, mes_anterior, ano_anterior)),
    )


def _bloco(campus_id: int | None, nome: str, meses: tuple[str, str, str], por_mes: dict[str, Totais]) -> ComparacaoBloco:
    atual, anterior, ano_passado = (por_mes.get(m, Totais()) for m in meses)
    return ComparacaoBloco(
        campusId=campus_id,
        nome=nome,
        agua=_comparar(atual, anterior, ano_passado, "agua"),
        luz=_comparar(atual, anterior, ano_passado, "luz"),
    )


def comparacao(db: Session, mes: str, campus_id: int | None = None) -> tuple[ComparacaoBloco, list[ComparacaoBloco]]:
    """Bloco do escopo pedido (universidade, ou o campus) e um bloco por campus.

    A lista por campus só é preenchida para a universidade; com `campus_id` ela vem vazia.
    """
    meses = (mes, deslocar_mes(mes, -1), deslocar_mes(mes, -12))
    totais = totais_por_campus_e_mes(db, list(meses), campus_id)

    if campus_id is not None:
        campus = db.get(Campus, campus_id)
        nome = campus.nome if campus else f"Campus {campus_id}"
        return _bloco(campus_id, nome, meses, _por_mes(totais)), []

    campi = db.execute(select(Campus.id, Campus.nome).order_by(Campus.id)).all()
    por_campus = [
        _bloco(c.id, c.nome, meses, {m: t for (cid, m), t in totais.items() if cid == c.id}) for c in campi
    ]
    return _bloco(None, "Universidade", meses, _por_mes(totais)), por_campus


def picos(db: Session, mes: str, campus_id: int | None = None) -> list[AlertaPico]:
    """Alerta de pico (R.4) de cada campus e medida com consumo no mês. Regra em app/core/alertas.py."""
    janela = meses_ate(deslocar_mes(mes, -1), JANELA_MESES)
    totais = totais_por_campus_e_mes(db, [*janela, mes], campus_id)
    nomes = dict(db.execute(select(Campus.id, Campus.nome)).all())

    avaliados: list[AlertaPico] = []
    for cid in sorted({c for c, _ in totais}):
        for medida in MEDIDAS:
            atual_t = totais.get((cid, mes), Totais())
            atual = atual_t.valor(medida)
            if atual is None:
                continue  # sem consumo no mês: nada a avaliar
            historico = [(m, totais[(cid, m)]) for m in janela if (cid, m) in totais]
            valores = [t.valor(medida) for _, t in historico if t.valor(medida) is not None]
            demonstracao = atual_t.demonstracao(medida) or any(t.demonstracao(medida) for _, t in historico)

            if len(valores) < HISTORICO_MINIMO:
                situacao, media, razao = "historico_insuficiente", None, None
            else:
                media = sum(valores) / len(valores)
                razao = atual / media if media > 0 else None
                situacao = "pico" if atual > LIMIAR_PICO * media else "normal"

            avaliados.append(
                AlertaPico(
                    campusId=cid,
                    nome=nomes.get(cid, f"Campus {cid}"),
                    medida=medida,
                    situacao=situacao,
                    atual=atual,
                    media=media,
                    mesesNaMedia=len(valores),
                    razao=razao,
                    demonstracao=demonstracao,
                )
            )
    # Picos primeiro, do maior salto para o menor; depois a ordem de campus e medida.
    return sorted(avaliados, key=lambda a: (a.situacao != "pico", -(a.razao or 0) if a.situacao == "pico" else 0))
