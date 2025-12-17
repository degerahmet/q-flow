\connect template1
CREATE EXTENSION IF NOT EXISTS vector;

\connect qflow
CREATE EXTENSION IF NOT EXISTS vector;

SELECT 'CREATE DATABASE qflow_shadow'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qflow_shadow')\gexec

\connect qflow_shadow
CREATE EXTENSION IF NOT EXISTS vector;
