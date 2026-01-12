from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "backend" / ".env")
load_dotenv(ROOT / ".env")


def init_firebase() -> None:
    if firebase_admin._apps:
        return
    service_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if service_json:
        payload = json.loads(service_json)
        cred = credentials.Certificate(payload)
    else:
        path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not path:
            raise RuntimeError(
                "Defina FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS para autenticar."
            )
        cred = credentials.Certificate(path)
    firebase_admin.initialize_app(cred)


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("Uso: python scripts/set_claims.py <UID> <role> [campusId]")

    uid = sys.argv[1]
    role = sys.argv[2]
    claims: dict[str, object] = {"role": role}

    if role == "campus":
        if len(sys.argv) < 4:
            raise SystemExit("Informe campusId para role=campus")
        claims["campusId"] = int(sys.argv[3])

    init_firebase()
    auth.set_custom_user_claims(uid, claims)
    print(f"Claims atualizadas para {uid}: {claims}")


if __name__ == "__main__":
    main()