#!/bin/bash
# Import aac_shelter_outcomes.csv into the aac.animals collection.
# Runs before init.js (alphabetical order) using the root credentials
# that Docker injects as environment variables.

mongoimport \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db aac \
  --collection animals \
  --type csv \
  --headerline \
  --file /data/aac_shelter_outcomes.csv

echo "CSV import complete."
