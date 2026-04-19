#!/usr/bin/env bash
# Connect to the local development PostgreSQL database
exec docker exec -it postgres psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-presence}"
