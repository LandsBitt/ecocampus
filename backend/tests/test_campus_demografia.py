"""Fonte da população/área: dado fictício não pode se passar por real."""
from __future__ import annotations

from app.db.models import Campus


def _marca_ficticio(db, campus_id: int) -> None:
    campus = db.get(Campus, campus_id)
    campus.populacao = 2200
    campus.area_construida_m2 = 12000
    campus.demografia_fonte = "FICTÍCIO"
    db.flush()


def test_campus_expoe_a_fonte(como, db):
    _marca_ficticio(db, 1)
    campi = {c["id"]: c for c in como("super").get("/campus").json()}
    assert campi[1]["demografiaFonte"] == "FICTÍCIO"
    assert campi[2]["demografiaFonte"] is None


def test_numero_alterado_sem_fonte_perde_a_marca_de_ficticio(como, db):
    _marca_ficticio(db, 1)
    corpo = como("super").patch("/campus/1", json={"populacao": 2150, "areaConstruidaM2": 12000}).json()
    assert corpo["populacao"] == 2150
    assert corpo["demografiaFonte"] is None


def test_salvar_sem_mudar_os_numeros_mantem_a_fonte(como, db):
    _marca_ficticio(db, 1)
    corpo = como("super").patch("/campus/1", json={"populacao": 2200, "areaConstruidaM2": 12000}).json()
    assert corpo["demografiaFonte"] == "FICTÍCIO"


def test_fonte_e_referencia_informadas_sao_gravadas(como, db):
    _marca_ficticio(db, 1)
    corpo = como("super").patch(
        "/campus/1",
        json={
            "populacao": 2150,
            "areaConstruidaM2": 12400,
            "demografiaFonte": "Pró-Reitoria de Administração",
            "demografiaReferencia": "03/2026",
        },
    ).json()
    assert corpo["demografiaFonte"] == "Pró-Reitoria de Administração"
    assert corpo["demografiaReferencia"] == "03/2026"
