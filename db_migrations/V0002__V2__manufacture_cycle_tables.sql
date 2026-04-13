
CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.parts (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER REFERENCES t_p45794133_smartmach_platform_p.products(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  material    TEXT,
  version     TEXT NOT NULL DEFAULT 'v1.0',
  status      TEXT NOT NULL DEFAULT 'ok',
  collisions  INTEGER NOT NULL DEFAULT 0,
  author_id   INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.machines (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'idle',
  load_pct    INTEGER NOT NULL DEFAULT 0,
  program     TEXT,
  operator_id INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.cnc_programs (
  id          SERIAL PRIMARY KEY,
  part_id     INTEGER REFERENCES t_p45794133_smartmach_platform_p.parts(id),
  machine_id  INTEGER REFERENCES t_p45794133_smartmach_platform_p.machines(id),
  name        TEXT NOT NULL,
  code        TEXT,
  status      TEXT NOT NULL DEFAULT 'queue',
  est_time    TEXT,
  author_id   INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.simulations (
  id          SERIAL PRIMARY KEY,
  part_id     INTEGER REFERENCES t_p45794133_smartmach_platform_p.parts(id),
  name        TEXT NOT NULL,
  sim_type    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queue',
  result      TEXT,
  stress_pct  INTEGER,
  author_id   INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.jobs (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER REFERENCES t_p45794133_smartmach_platform_p.products(id),
  part_id     INTEGER REFERENCES t_p45794133_smartmach_platform_p.parts(id),
  program_id  INTEGER REFERENCES t_p45794133_smartmach_platform_p.cnc_programs(id),
  machine_id  INTEGER REFERENCES t_p45794133_smartmach_platform_p.machines(id),
  status      TEXT NOT NULL DEFAULT 'new',
  priority    TEXT NOT NULL DEFAULT 'normal',
  qty         INTEGER NOT NULL DEFAULT 1,
  assignee_id INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
  due_date    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
