"""Fonte canônica dos campi UNITAU e mapeamento de endereços.

Usado pelo seed (`app.seed`), pela migration `0003_seed_campi_unitau` e
pelo futuro importador de planilhas (CPFL: ConsumoAnual / ConsumoAnualCabines)
para resolver `endereço CPFL → campus`.
"""
from __future__ import annotations

import re
from typing import TypedDict


class CampusSeed(TypedDict):
    id: int
    nome: str


# Ordem dos ids define a numeração canônica usada por `Lancamento.campus_id`.
CAMPI: list[CampusSeed] = [
    {"id": 1, "nome": "Campus da Juta"},
    {"id": 2, "nome": "Campus do Itaim"},
    {"id": 3, "nome": "Campus do Bom Conselho"},
    {"id": 4, "nome": "Polo da Saúde"},
    {"id": 5, "nome": "Direito"},
    {"id": 6, "nome": "Reitoria"},
    {"id": 7, "nome": "Colégio UNITAU"},
]


# Mapa de endereços (como aparecem nas faturas CPFL) para o nome do campus.
# Chave: prefixo normalizado do endereço (uppercase, sem acentos, sem número).
# Match é feito por `startswith` após normalização — ver `campus_id_por_endereco`.
ENDERECO_CAMPUS: dict[str, str] = {
    # Campus da Juta (Exatas e Engenharias)
    "AV NOVE DE JULHO 246": "Campus da Juta",
    "AV MAL DEODORO": "Campus da Juta",

    # Campus do Itaim (Agrárias e Biociências)
    "EST MUN PROF DR JOSE LUIZ CEMBRANELLI 5000": "Campus do Itaim",
    "EST MUN PROF DR JOSE LUIZ CEMBRANELLI 5001": "Campus do Itaim",
    "EST MUN PROF DR JOSE LUIZ CEMBRANELLI 4720": "Campus do Itaim",
    "EST MUN IPIRANGA 5001": "Campus do Itaim",

    # Campus do Bom Conselho (Humanas)
    "RUA QUATRO DE MARCO 432": "Campus do Bom Conselho",
    "AV ARMANDO SALLES DE OLIVEIRA 457": "Campus do Bom Conselho",
    "RUA FRANCISCO EUGENIO DE TOLEDO 259": "Campus do Bom Conselho",

    # Polo da Saúde (Centro)
    "RUA PASQUA SCALZOTO PASTORELLI 30": "Polo da Saúde",
    "RUA PADRE DR RAMON ORTIZ 896": "Polo da Saúde",
    "RUA DR DINO BUENO 263": "Polo da Saúde",
    "AV TIRADENTES 23": "Polo da Saúde",

    # Direito
    "RUA CONS MOREIRA DE BARROS 177": "Direito",
    "RUA CONS MOREIRA DE BARROS 203": "Direito",
    "RUA BR PEDRA NEGRA DA 545": "Direito",

    # Reitoria e Administrativo
    "RUA VISC DO RIO BRANCO 22": "Reitoria",
    "RUA VISC DO RIO BRANCO 36": "Reitoria",
    "RUA VISC DO RIO BRANCO 210": "Reitoria",

    # Adições pós-pesquisa (planilha de cabines, alta tensão)
    "AV PROF WALTER THAUMATURGO 1320": "Campus do Bom Conselho",  # Dept. Comunicação Social
    "PRQ DR BARBOSA DE OLIVEIRA 285": "Direito",                  # Biblioteca Jurídica / EAJ
    "RUA MAL ARTHUR DA COSTA E SILVA 1047": "Polo da Saúde",      # Clínica de Fisioterapia
    "RUA EXP ERNESTO PEREIRA 92": "Polo da Saúde",                # Odontologia (2 UCs no mesmo endereço)
    "RUA JOSE OLEGARIO DE BARROS 111": "Campus da Juta",          # Eng. Mecânica
    "AV TIRADENTES 500": "Campus do Bom Conselho",                # IBB, Biociências, Medicina, etc.
    "RUA OPERARIOS DOS 153": "Colégio UNITAU",                    # Escola de Aplicação Dr. Alfredo Balbi
}


# Endereços que aparecem nas planilhas CPFL mas NÃO pertencem à UNITAU.
# São silenciados no importador (não aparecem como aviso de "sem campus").
ENDERECOS_FORA_UNITAU: set[str] = {
    "RUA MAL ARTHUR DA COSTA E SILVA 800",  # oficina de costura (IBGE)
}


_NOME_PARA_ID: dict[str, int] = {c["nome"]: c["id"] for c in CAMPI}


def _normaliza(endereco: str) -> str:
    # Remove acentos básicos das chaves CPFL e colapsa espaços.
    s = endereco.upper().strip()
    s = re.sub(r"\s+", " ", s)
    return s


def campus_id_por_endereco(endereco: str | None) -> int | None:
    """Retorna o `campus.id` para um endereço CPFL, ou None se não casar."""
    if not endereco:
        return None
    alvo = _normaliza(endereco)
    for prefixo, nome_campus in ENDERECO_CAMPUS.items():
        if alvo.startswith(prefixo):
            return _NOME_PARA_ID[nome_campus]
    return None
