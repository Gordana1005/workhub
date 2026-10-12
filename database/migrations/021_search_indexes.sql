-- Migration 021: Global search indexes (OPTIONAL)
-- The search API (/api/search) works without this. These trigram indexes only make
-- ILIKE '%term%' lookups stay fast as tasks / projects / notes grow into the tens of thousands.
-- Idempotent: safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
  ON tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_name_trgm
  ON projects USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_notes_title_trgm
  ON notes USING gin (title gin_trgm_ops);
