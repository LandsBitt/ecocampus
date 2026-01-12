import argparse
import json
from pathlib import Path


def build_value(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    return json.dumps(data, separators=(",", ":"), ensure_ascii=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Converte o JSON do Firebase Admin SDK em uma unica linha e salva em .txt."
    )
    parser.add_argument("json_path", help="Caminho para o arquivo JSON do Firebase Admin SDK")
    parser.add_argument(
        "--key",
        default="FIREBASE_SERVICE_ACCOUNT_JSON",
        help="Nome da variavel de ambiente",
    )
    parser.add_argument(
        "--value-only",
        action="store_true",
        help="Salva apenas o JSON em uma linha (sem KEY=)",
    )
    parser.add_argument(
        "--output",
        help="Caminho do arquivo .txt de saida (padrao: scripts/firebase_admin_to_env.txt)",
    )

    args = parser.parse_args()
    json_path = Path(args.json_path)
    if not json_path.exists():
        raise SystemExit(f"Arquivo nao encontrado: {json_path}")

    value = build_value(json_path)
    output_path = Path(args.output) if args.output else Path(__file__).resolve().parent / "firebase_admin_to_env.txt"

    if args.value_only:
        output_text = value + "\n"
    else:
        output_text = f"{args.key}={value}\n"

    output_path.write_text(output_text, encoding="utf-8")
    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()