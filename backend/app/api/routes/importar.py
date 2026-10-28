from __future__ import annotations

import csv
import io
import re
from collections import defaultdict
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, func, select, text, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload

from app.core.limites import CONSUMO_MAXIMO, MES_PATTERN, UPLOAD_MAXIMO_BYTES, VALOR_RS_MAXIMO
from app.core.security import autor, require_super
from app.db.models import Lancamento, LancamentoOrigem, LancamentoTipo, PontoMedicao
from app.db.session import get_db
from app.schemas.auth import UserClaims
from app.schemas.importar import (
    ConfirmarOut,
    ConfirmarPayload,
    LinhaIgnorada,
    PontoPreview,
    PreviewOut,
)

router = APIRouter()

# Colunas de cada planilha modelo (comparadas sem diferenciar maiúsculas).
COLUNAS = {
    "agua": {"ident": "pde/rgi", "local": "local", "consumo": "consumo_m3", "valor": "valor_fatura"},
    "luz": {"ident": "numero_uc", "local": "local", "consumo": "consumo_kwh", "valor": "valor_fatura_rs"},
}
NOME_TIPO = {"agua": "água", "luz": "energia"}

_SO_DIGITOS = re.compile(r"^\d+$")
_DECIMAL_VIRGULA = re.compile(r"^\d+,\d+$")
_MILHAR_E_VIRGULA = re.compile(r"^\d{1,3}(\.\d{3})+,\d+$")
_SO_PONTO_DE_MILHAR = re.compile(r"^\d{1,3}(\.\d{3})+$")
_DECIMAL_PONTO = re.compile(r"^\d+\.\d+$")


def parse_numero(valor: str | None) -> tuple[float | None, str | None]:
    """Lê um número de planilha brasileira. Retorna (valor, erro).

    Vazio é (None, None). Nunca "adivinha": um texto que pode significar dois
    números diferentes é recusado com explicação, porque errar por um fator de
    mil em silêncio é pior do que pedir para corrigir a célula.
    """
    bruto = (valor or "").strip()
    if not bruto:
        return None, None

    limpo = bruto.replace("R$", "").replace(" ", "").replace(" ", "")
    if limpo.startswith("-"):
        return None, f"valor negativo ({bruto})"
    if _SO_DIGITOS.match(limpo):
        return float(limpo), None
    if _DECIMAL_VIRGULA.match(limpo):
        return float(limpo.replace(",", ".")), None
    if _MILHAR_E_VIRGULA.match(limpo):
        return float(limpo.replace(".", "").replace(",", ".")), None
    if _SO_PONTO_DE_MILHAR.match(limpo):
        inteiro = limpo.replace(".", "")
        return None, (
            f"'{bruto}' é ambíguo: pode ser {inteiro} ou {limpo.replace('.', ',')}. "
            f"Escreva sem ponto de milhar ({inteiro}) ou com vírgula decimal"
        )
    if _DECIMAL_PONTO.match(limpo):
        return float(limpo), None
    return None, f"'{bruto}' não é um número"


def _milhar(valor) -> str:
    """10000000 → "10.000.000", para mensagens."""
    return f"{valor:,.0f}".replace(",", ".")


def _sniff_delimiter(raw: str) -> str:
    # As planilhas padrão da UNITAU usam ";" (separador brasileiro do Excel),
    # mas aceitamos "," para não quebrar exports em formato internacional.
    header = raw.splitlines()[0] if raw else ""
    return ";" if header.count(";") >= header.count(",") else ","


class _PontosDoTipo:
    """Todos os pontos do tipo numa consulta, já com o campus (SPEC 4.3).

    Antes eram uma ou duas consultas por linha da planilha, mais uma por campus.
    """

    def __init__(self, db: Session, tipo: str):
        pontos = db.scalars(
            select(PontoMedicao)
            .options(joinedload(PontoMedicao.campus))
            .where(PontoMedicao.tipo == tipo)
            .order_by(PontoMedicao.id)
        ).all()
        self.tipo = tipo
        self.por_identificador: dict[str, PontoMedicao] = {}
        self.por_instalacao: dict[int, PontoMedicao] = {}
        for ponto in pontos:
            if ponto.identificador:
                self.por_identificador.setdefault(ponto.identificador, ponto)
            if ponto.codigo_instalacao is not None:
                self.por_instalacao.setdefault(ponto.codigo_instalacao, ponto)

    def achar(self, ident: str | None, inst: int | None) -> PontoMedicao | None:
        if ident and ident in self.por_identificador:
            return self.por_identificador[ident]
        if self.tipo == "luz" and inst is not None:
            return self.por_instalacao.get(inst)
        return None


def _mes_da_linha(row: dict[str, str]) -> tuple[str | None, str | None]:
    """Mês informado nas colunas `ano`/`mes` da linha, como YYYY-MM. Retorna (mes, erro)."""
    ano, mes = row.get("ano", ""), row.get("mes", "")
    if not ano and not mes:
        return None, None
    try:
        ano_n, mes_n = int(ano), int(mes)
    except ValueError:
        return None, f"ano/mês da linha inválidos ({ano or '?'}/{mes or '?'})"
    if not 1 <= mes_n <= 12:
        return None, f"mês da linha inválido ({mes})"
    return f"{ano_n:04d}-{mes_n:02d}", None


# O importado vem da fatura e prevalece sobre estes no mesmo campus/tipo/mês.
_SUBSTITUIDOS = (LancamentoOrigem.manual.value, LancamentoOrigem.demonstracao.value)


def _no_caminho(mes: str, alvos: set[tuple[int, LancamentoTipo]]):
    """Filtro dos manuais e de demonstração nos campus/tipo/mês que a importação vai preencher."""
    return (
        Lancamento.origem.in_(_SUBSTITUIDOS),
        Lancamento.mes_referencia == mes,
        tuple_(Lancamento.campus_id, Lancamento.tipo).in_(list(alvos)),
    )


@router.post("/importar/preview", response_model=PreviewOut)
def preview_csv(
    file: UploadFile = File(...),
    tipo: Literal["agua", "luz"] = Form(...),
    mes_referencia: str = Form(..., pattern=MES_PATTERN),
    db: Session = Depends(get_db),
    _user=Depends(require_super),
):
    conteudo = file.file.read(UPLOAD_MAXIMO_BYTES + 1)
    if len(conteudo) > UPLOAD_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=(
                f"O arquivo passa de {UPLOAD_MAXIMO_BYTES // 1_000_000} MB. "
                "A planilha modelo tem poucos KB: confira se é o CSV certo."
            ),
        )
    raw = conteudo.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw), delimiter=_sniff_delimiter(raw))
    colunas = COLUNAS[tipo]

    cabecalho = {(nome or "").strip().lower() for nome in (reader.fieldnames or [])}
    faltando = [colunas[c] for c in ("ident", "consumo") if colunas[c] not in cabecalho]
    if faltando:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"O arquivo não parece ser a planilha de {NOME_TIPO[tipo]}: "
                f"falta(m) a(s) coluna(s) {', '.join(faltando)}."
            ),
        )

    pontos = _PontosDoTipo(db, tipo)
    candidatos: list[tuple[int, PontoMedicao, PontoPreview]] = []
    unmatched: list[LinhaIgnorada] = []

    # A linha 1 do arquivo é o cabeçalho.
    for numero, bruta in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in bruta.items() if k is not None}
        ident = row.get(colunas["ident"]) or None
        local = row.get(colunas["local"], "")
        consumo, erro_consumo = parse_numero(row.get(colunas["consumo"]))
        valor, erro_valor = parse_numero(row.get(colunas["valor"]))

        if consumo is None and valor is None and not erro_consumo and not erro_valor:
            continue  # linha sem conta neste mês

        def ignora(motivo: str) -> None:
            unmatched.append(
                LinhaIgnorada(
                    linha=numero,
                    local=local,
                    identificador=ident,
                    consumo_fisico=consumo,
                    valor_fatura=valor,
                    motivo=motivo,
                )
            )

        if erro_consumo:
            ignora(f"Consumo inválido: {erro_consumo}")
            continue
        if erro_valor:
            ignora(f"Valor da fatura inválido: {erro_valor}")
            continue
        if consumo is not None and consumo > CONSUMO_MAXIMO:
            ignora(f"Consumo acima do limite de {_milhar(CONSUMO_MAXIMO)} por conta; confira a célula")
            continue
        if valor is not None and valor > VALOR_RS_MAXIMO:
            ignora(f"Valor da fatura acima do limite de R$ {_milhar(VALOR_RS_MAXIMO)}; confira a célula")
            continue

        mes_linha, erro_mes = _mes_da_linha(row)
        if erro_mes:
            ignora(erro_mes.capitalize())
            continue
        if mes_linha and mes_linha != mes_referencia:
            ignora(f"A linha é de {mes_linha[5:]}/{mes_linha[:4]}, mas o mês escolhido é {mes_referencia[5:]}/{mes_referencia[:4]}")
            continue

        inst = None
        if tipo == "luz":
            inst_str = row.get("numero_instalacao", "")
            inst = int(inst_str) if inst_str.isdigit() else None

        ponto = pontos.achar(ident, inst)
        if ponto is None:
            ignora("Ponto de medição não encontrado")
            continue
        if consumo is None:
            ignora("Consumo ausente")
            continue

        candidatos.append(
            (
                numero,
                ponto,
                PontoPreview(
                    ponto_medicao_id=ponto.id,
                    nome=ponto.nome,
                    campus_id=ponto.campus_id,
                    campus_nome=ponto.campus.nome,
                    identificador=ident,
                    consumo_fisico=consumo,
                    valor_fatura=valor,
                ),
            )
        )

    # O mesmo ponto em mais de uma linha: não dá para saber qual vale, então nenhuma entra.
    linhas_por_ponto: dict[int, list[int]] = defaultdict(list)
    for numero, ponto, _ in candidatos:
        linhas_por_ponto[ponto.id].append(numero)

    matched: list[PontoPreview] = []
    for numero, ponto, previa in candidatos:
        linhas = linhas_por_ponto[ponto.id]
        if len(linhas) > 1:
            unmatched.append(
                LinhaIgnorada(
                    linha=numero,
                    local=ponto.nome,
                    identificador=previa.identificador,
                    consumo_fisico=previa.consumo_fisico,
                    valor_fatura=previa.valor_fatura,
                    motivo=f"Ponto repetido no arquivo (linhas {', '.join(map(str, linhas))})",
                )
            )
        else:
            matched.append(previa)
    unmatched.sort(key=lambda linha: linha.linha or 0)

    alvos = {(m.campus_id, LancamentoTipo(tipo)) for m in matched}
    substituidos: dict[str, int] = {}
    if alvos:
        substituidos = dict(
            db.execute(
                select(Lancamento.origem, func.count())
                .where(*_no_caminho(mes_referencia, alvos))
                .group_by(Lancamento.origem)
            ).all()
        )

    return PreviewOut(
        mes_referencia=mes_referencia,
        tipo=tipo,
        matched=matched,
        unmatched=unmatched,
        total_valor=sum(m.valor_fatura or 0 for m in matched),
        manuais_substituidos=substituidos.get(LancamentoOrigem.manual.value, 0),
        demonstracao_substituida=substituidos.get(LancamentoOrigem.demonstracao.value, 0),
    )


@router.post("/importar/confirmar", response_model=ConfirmarOut)
def confirmar_importacao(
    payload: ConfirmarPayload,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(require_super),
):
    # O mesmo ponto duas vezes no payload: vale o último, como valia gravando um por vez.
    itens = {item.ponto_medicao_id: item for item in payload.lancamentos}
    pontos = (
        {p.id: p for p in db.scalars(select(PontoMedicao).where(PontoMedicao.id.in_(list(itens))))}
        if itens
        else {}
    )
    ignored = sum(1 for item in payload.lancamentos if item.ponto_medicao_id not in pontos)
    alvos = {(p.campus_id, p.tipo) for p in pontos.values()}

    inserted = updated = 0
    linhas = [
        {
            "campus_id": ponto.campus_id,
            "tipo": ponto.tipo,
            "consumo": itens[ponto.id].consumo_fisico,
            "valor_rs": itens[ponto.id].valor_fatura,
            "origem": LancamentoOrigem.importado.value,
            "mes_referencia": payload.mes_referencia,
            "ponto_medicao_id": ponto.id,
            "criado_por": autor(user),
        }
        for ponto in pontos.values()
    ]
    if linhas:
        # Upsert de todos os pontos numa instrução (SPEC 4.3), protegido pelo índice
        # único uq_lancamentos_ponto_mes: importar o mesmo mês de novo atualiza.
        insercao = pg_insert(Lancamento).values(linhas)
        stmt = insercao.on_conflict_do_update(
            index_elements=[Lancamento.ponto_medicao_id, Lancamento.mes_referencia],
            index_where=Lancamento.ponto_medicao_id.isnot(None),
            set_={
                "consumo": insercao.excluded.consumo,
                "valor_rs": insercao.excluded.valor_rs,
                # `onupdate` do modelo não vale no ON CONFLICT; quem criou continua o mesmo.
                "atualizado_em": func.now(),
            },
        ).returning(text("xmax = 0"))  # xmax = 0: linha recém-inserida (PostgreSQL)
        novos = db.execute(stmt).scalars().all()
        inserted = sum(1 for novo in novos if novo)
        updated = len(novos) - inserted

    # O importado vem da fatura e prevalece: o lançamento manual (ou de demonstração)
    # do mesmo campus/tipo/mês sai na mesma transação, senão o consumo contaria em dobro.
    origens_removidas: list[str] = []
    if alvos:
        origens_removidas = list(
            db.execute(
                delete(Lancamento)
                .where(*_no_caminho(payload.mes_referencia, alvos))
                .returning(Lancamento.origem)
                .execution_options(synchronize_session=False)
            ).scalars()
        )
    removidos = origens_removidas.count(LancamentoOrigem.manual.value)
    demonstracao_removida = origens_removidas.count(LancamentoOrigem.demonstracao.value)

    db.commit()
    return ConfirmarOut(
        imported=inserted,
        updated=updated,
        ignored=ignored,
        manuais_removidos=removidos,
        demonstracao_removida=demonstracao_removida,
    )
