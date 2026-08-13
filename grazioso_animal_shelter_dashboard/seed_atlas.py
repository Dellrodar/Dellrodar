"""One-time import of aac_shelter_outcomes.csv into the Atlas aac.animals collection.

Cloud replacement for mongo-init/import.sh, which only seeds the local Docker
MongoDB. Reads the connection string from atlas-credentials.env or the
environment. Refuses to touch a non-empty collection unless --force is given.
"""
import os
import sys

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("atlas-credentials.env")

CSV_FILENAME = "aac_shelter_outcomes.csv"


def main() -> None:
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise SystemExit("MONGODB_URI is not set; add it to atlas-credentials.env or the environment.")

    password = os.environ.get("MONGODB_PASSWORD", "")
    for placeholder in ("<db_password>", "<password>"):
        uri = uri.replace(placeholder, password)

    client = MongoClient(uri)
    collection = client["aac"]["animals"]

    existing = collection.count_documents({})
    if existing and "--force" not in sys.argv:
        raise SystemExit(
            f"aac.animals already holds {existing} documents; rerun with --force to replace them."
        )
    if existing:
        collection.delete_many({})

    df = pd.read_csv(CSV_FILENAME)
    records = df.astype(object).where(pd.notna(df), None).to_dict("records")
    collection.insert_many(records)
    print(f"Imported {len(records)} documents into aac.animals.")


if __name__ == "__main__":
    main()
