from __future__ import annotations

from sqlalchemy import select

from app.data.campus_mapping import CAMPI
from app.db.models import Campus
from app.db.session import SessionLocal


def main() -> None:
    """Idempotente. Cria os campi canônicos UNITAU caso não existam.

    A criação principal é feita pela migration `0003_seed_campi_unitau`
    (roda em qualquer ambiente via `alembic upgrade head`). Este script
    serve como rede de segurança e para bancos legados.
    """
    with SessionLocal() as db:
        existing = db.scalars(select(Campus)).all()
        existing_ids = {c.id for c in existing}
        existing_names = {c.nome for c in existing}
        created = 0
        for spec in CAMPI:
            if spec["id"] in existing_ids or spec["nome"] in existing_names:
                continue
            db.add(Campus(id=spec["id"], nome=spec["nome"]))
            created += 1
        db.commit()
    print(f"Seed concluído. Novos campi: {created}")


if __name__ == "__main__":
    main()
