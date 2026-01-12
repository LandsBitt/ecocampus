from __future__ import annotations

import os

from sqlalchemy import select

from app.db.models import Campus
from app.db.session import SessionLocal


def _load_names() -> list[str]:
    raw = os.getenv("CAMPUS_NAMES")
    if raw:
        return [name.strip() for name in raw.split(",") if name.strip()]
    return [f"Campus {index}" for index in range(1, 9)]


def main() -> None:
    names = _load_names()[:8]
    with SessionLocal() as db:
        existing_campi = db.scalars(select(Campus)).all()
        existing_ids = {campus.id for campus in existing_campi}
        existing_names = {campus.nome for campus in existing_campi}
        created = 0
        for idx, name in enumerate(names, start=1):
            if idx in existing_ids or name in existing_names:
                continue
            db.add(Campus(id=idx, nome=name))
            created += 1
        db.commit()
    print(f"Seed concluído. Novos campi: {created}")


if __name__ == "__main__":
    main()