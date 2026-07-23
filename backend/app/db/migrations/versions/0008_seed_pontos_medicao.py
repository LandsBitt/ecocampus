"""seed pontos_medicao - todos os medidores de agua e luz da UNITAU

Revision ID: 0008_seed_pontos_medicao
Revises: 0007_lancamentos_consumo_fisico
Create Date: 2026-06-01 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0008_seed_pontos_medicao"
down_revision = "0007_lancamentos_consumo_fisico"
branch_labels = None
depends_on = None

# campus_id: 1=Juta, 2=Itaim, 3=Bom Conselho, 4=Polo Saude,
#            5=Direito, 6=Reitoria, 7=Colegio UNITAU, 8=Arquitetura
PONTOS_AGUA = [
    (6, "COPESA",                           "RUA BARÃO DA PEDRA NEGRA, 156",             "397052340"),
    (6, "REITORIA",                         "RUA QUATRO DE MARÇO, 432",                  "397238606"),
    (8, "QUADRA D",                         "PRAÇA FELIX GUISARD, 117",                  "654882533"),
    (6, "PRÉ-REITORIA DE ADMINISTRAÇÃO",    "AV NOVE DE JULHO, 246",                     "397051450"),
    (6, "P R FINANÇAS / P R GRADUAÇÃO",     "AV. NOVE DE JULHO, 245",                    "397051964"),
    (6, "PRÉ-REITORIA DE EXTENSÃO",         "RUA QUINZE DE NOVEMBRO, 996",               "396985130"),
    (6, "PÓS-GRAD ODONTO/CeTI",             "RUA EXP ERNESTO PEREIRA, 120",              "397238010"),
    (6, "PRPPG",                            "RUA DR SOUZA ALVES, 481",                   "396858023"),
    (6, "PRPPG",                            "R VISCONDE DO RIO BRANCO, 210",             "396856403"),
    (6, "D.C.E.",                           "AV ARMANDO SALLES DE OLIVEIRA, 457",        "397237987"),
    (4, "DEPTO ED FÍSICA (PISCINA)",        "PRAÇA COMEND MARCELINO MONTEIRO, 4",        "397607407"),
    (4, "DEPTO ENFERMAGEM",                 "PRAÇA COMEND MARCELINO MONTEIRO, 63",       "397607580"),
    (1, "DEPTO ENG ELÉTRICA - CAMPUS JUTA", "RUA DANIEL DANELLI, 53",                   "394851293"),
    (4, "CLÍNICA DE FISIOTERAPIA",          "R MAL ARTHUR COSTA E SILVA, 1055",          "620118474"),
    (6, "CEN",                              "R EXP ERNESTO PEREIRA, 227",                "1054046163"),
    (3, "CAMPUS BOM CONSELHO",              "AV TIRADENTES, 500",                        "397608390"),
    (1, "DEPTO ENG CIVIL",                  "RUA EXP ERNESTO PEREIRA, 87",               "397238525"),
    (6, "DEPTO CEN",                        "RUA EXP ERNESTO PEREIRA, 225",              "397238444"),
    (8, "DEPTO ARQUITETURA",                "PRAÇA FELIX GUISARD, 120",                  "397208103"),
    (5, "DEPTO CIÊNCIAS JURÍDICAS",         "PARQUE DR BARBOSA DE OLIVEIRA, 285",        "396939376"),
    (6, "ESTÁDIO DA RÁDIO UNIVERSITÁRIA",   "AV PROF WALTER THAUMATURGO, 700",           "397443293"),
    (3, "CAMPUS BOM CONSELHO",              "AV TIRANDENTES, 480",                       "633754862"),
    (6, "CENTRAL DE ESTÁGIO",               "AV NOVE DE JULHO, 183",                     "397052189"),
    (6, "DEPTO CIÊNCIAS SOCIAIS E LETRAS",  "R VISCONDE DO RIO BRANCO, 22",              "768194695"),
    (6, "EAD (3ª IDADE)",                   "R CONS MOREIRA DE BARROS, 177",             "396959482"),
    (6, "EAD",                              "R CONS MOREIRA DE BARROS, 203",             "396959563"),
    (4, "DEPTO DE FISIOTERAPIA",            "R PASQUA S PASTORELLI, 30",                 "397594585"),
    (6, "CLÍNICA DE PSICOLOGIA",            "R BARÃO DA PEDRA NEGRA, 221",               "397049552"),
    (6, "CLÍNICA DE PSICOLOGIA",            "R BARÃO DA PEDRA NEGRA, 235",               "397049471"),
    (6, "DEPTO CIÊNCIAS SOCIAIS E LETRAS",  "R VISCONDE DO RIO BRANCO, 22",              "396865232"),
    (6, "DEPTO COM. SOCIAL",                "RUA DO COLÉGIO, 334",                       "397422709"),
    (6, "DEPTO COM. SOCIAL / CANTINA-ALOJAM","RUA DO COLÉGIO, 334",                      "397422881"),
    (1, "DEPTO INFORMÁTICA",                "AV MAL DEODORO, 605",                       "396223125"),
    (5, "DEPTO CIÊNCIAS JURÍDICAS",         "PARQUE DR BARBOSA DE OLIVEIRA, 285",        "396939457"),
    (6, "CEN",                              "R EXP ERNESTO PEREIRA, 229",                "397238282"),
    (6, "DEPTO DE ODONTOLOGIA",             "R EXP ERNESTO PEREIRA, 108",                "605957878"),
    (2, "DEPTO CIÊNCIAS AGRÁRIAS",          "AV DR JOSE LUIZ CEMBRANELLI, 5000",         "2000379504"),
    (7, "COLÉGIO ALFREDO JOSÉ BALBI",       "R EXP ERNESTO PEREIRA, 260",                "397238100"),
    (7, "COLÉGIO ALFREDO JOSÉ BALBI",       "RUA DOS OPERÁRIOS, 153",                    "397193912"),
]

# (campus_id, nome, endereco, numero_uc, codigo_instalacao, ativo)
PONTOS_LUZ = [
    (6, "REITORIA",                       "RUA QUATRO DE MARÇO, 432",                       "00.000.004.452.004-51", 2002082,   True),
    (6, "FUNCABES",                       "AV. NOVE DE JULHO, 245",                          "0.001.472.586.004-07",  150086138, True),
    (6, "RÁDIO UNIVERSITÁRIA",            "RUA PADRE DR. RAMOM ORTIZ, 896",                  "0.001.371.326.004-68",  94345074,  True),
    (6, "DOM - PRA",                      "AV. NOVE DE JULHO 246 C1",                        "0.000.570.763.004-00",  40188507,  True),
    (6, "PRA / SETOR TRANSPORTES",        "R DR DINO BUENO, 263",                            "0.001.384.196.004-39",  94473854,  True),
    (6, "PRÉ-REITORIA DE ADMINISTRAÇÃO",  "AV NOVE DE JULHO, 246",                           "0.000.570.792.004-02",  40188493,  True),
    (3, "QUADRA D",                       "AV TIRADENTES, 23",                               "0.000.008.913.004-39",  2468620,   True),
    (6, "PRÉ-REITORIA DE FINANÇAS",       "AV. NOVE DE JULHO, 245 - MED 02",                 "0.001.472.568.004-24",  150086120, True),
    (6, "CLÍNICA DE PSICOLOGIA",          "RUA BARÃO DA PEDRA NEGRA, 221",                   "0.000.570.623.004-05",  40186962,  True),
    (6, "PREX",                           "RUA BARÃO DA PEDRA NEGRA, 545",                   "0.000.013.265.004-50",  20230532,  True),
    (6, "CLÍNICA DE PSICOLOGIA",          "RUA BARÃO DA PEDRA NEGRA, 235",                   "0.000.570.624.004-98",  40186971,  True),
    (6, "EAD (3ª IDADE)",                 "R. CONS. MOREIRA DE BARROS, 177",                 "0.000.564.180.004-53",  39941701,  True),
    (6, "PRPPG",                          "R VISCONDE DO RIO BRANCO, 210",                   "0.000.013.131.004-74",  20223765,  True),
    (6, "D.C.E.",                         "AV ARMANDO SALLES DE OLIVEIRA, 457",              "0.000.681.941.004-62",  71178066,  True),
    (2, "AGRO - ADMINISTRAÇÃO",           "ESTR. MUN. IPIRANGA, 5160 MED. 6",               "0.0001.390.157.004-02", 150003709, True),
    (2, "AGRO - APICULTURA",              "ESTR. MUN. IPIRANGA, 5160 MED. 3",               "0.001.390.154.004-23",  150003706, True),
    (2, "AGRO - CASA CASEIRO",            "ESTR. MUN. DR. JOSÉ LUIZ CEMBRANELLI, 5001",     "0.000.014.037.004-03",  20273495,  True),
    (2, "AGRO - FAZENDA",                 "ESTR. MUN. IPIRANGA, 5001 CS1",                  "0.001.361.725.004-04",  94248869,  True),
    (2, "AGRO - LAB. SOLOS",              "ESTR. MUN. IPIRANGA, 5160 MED. 2",               "0.001.390.153.004-38",  150003705, True),
    (2, "AGRO - METEREOL/CASEIRO",        "ESTR. MUN. IPIRANGA, 5160 MED. 5",               "0.001.390.156.004-04",  150003708, True),
    (2, "AGRO - SUINOCULTURA",            "ESTR. MUN. IPIRANGA, 5155 CS2",                  "0.001.361.726.004-02",  94248877,  True),
    (6, "C. PESQUISA FILOSOFIA",          "R VISCONDE DO RIO BRANCO, 25",                    "0.000.013.130.004-89",  20223757,  True),
    (8, "DEPTO ARQUITETURA",              "R FRANCISCO EUGENIO DE TOLEDO, 259",              "0.000.769.389.004-26",  75681391,  True),
    (4, "DEPTO FISIOTERAPIA",             "R PASQUA S PASTORELLI, 30",                       "0.000.014.704.004-01",  20305958,  True),
    (6, "EAD",                            "R CONS MOREIRA DE BARROS, 203",                   "0.000.564.181.004-49",  39941710,  True),
    (6, "DEPTO LETRAS E FILOSOFIA 2",     "R VISCONDE DO RIO BRANCO, 22",                    "0.000.013.129.004-16",  20223749,  True),
    (6, "DEPTO SERVIÇO SOCIAL",           "R VISCONDE DO RIO BRANCO, 36",                    "0.001.499.115.004-00",  150112667, True),
    (2, "TECNOLOGIA DE ALIMENTOS",        "ESTR MUNIC JOSE LUIZ CEMBRANELLI, 5000",          "0.001.477.913.004-73",  150091465, True),
    (2, "AGRO - CANTINA / NUTRIÇÃO",      "ESTR. MUN. IPIRANGA, 5160 MED. 4",               "0.001.390.155.004-19",  150003707, True),
    (2, "AGRO - PRÉDIO PRINCIPAL",        "ESTR. MUN. IPIRANGA, 5160 MED. 1",               "0.001.390.152.004-42",  150003704, True),
    (1, "DEPTO INFORMÁTICA",              "R MARECHAL DEODORO, S/N",                         "0.000.012.599.004-81",  20248938,  True),
    (6, "CEN DORMITÓRIO",                 "R EXP ERNESTO PEREIRA, 229",                      "0.000.570.959.004-05",  40190650,  True),
    (7, "COLÉGIO ALFREDO JOSÉ BALBI",     "RUA DOS OPERÁRIOS, 153",                          None,                    74516221,  False),
]


def upgrade() -> None:
    pm = sa.table(
        "pontos_medicao",
        sa.column("campus_id", sa.Integer()),
        sa.column("nome", sa.String()),
        sa.column("endereco", sa.String()),
        # Precisa do tipo enum do dialeto para o INSERT castar corretamente
        # (com sa.String o Postgres rejeita: coluna é lancamento_tipo).
        sa.column("tipo", postgresql.ENUM("agua", "luz", name="lancamento_tipo", create_type=False)),
        sa.column("identificador", sa.String()),
        sa.column("codigo_instalacao", sa.BigInteger()),
        sa.column("ativo", sa.Boolean()),
    )

    rows_agua = [
        {"campus_id": c, "nome": n, "endereco": e, "tipo": "agua",
         "identificador": ident, "codigo_instalacao": None, "ativo": True}
        for c, n, e, ident in PONTOS_AGUA
    ]
    rows_luz = [
        {"campus_id": c, "nome": n, "endereco": e, "tipo": "luz",
         "identificador": uc, "codigo_instalacao": inst, "ativo": ativo}
        for c, n, e, uc, inst, ativo in PONTOS_LUZ
    ]

    op.bulk_insert(pm, rows_agua + rows_luz)


def downgrade() -> None:
    op.execute("DELETE FROM pontos_medicao")
