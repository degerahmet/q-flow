#!/bin/bash
set -e

echo "Ensure qflow_shadow exists..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
  SELECT 'CREATE DATABASE qflow_shadow'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qflow_shadow')\gexec
EOSQL

echo "Enable vector in qflow_shadow..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "qflow_shadow" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
