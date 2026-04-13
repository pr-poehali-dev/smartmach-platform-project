CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.leads (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  org        TEXT,
  contact    TEXT NOT NULL,
  question   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
