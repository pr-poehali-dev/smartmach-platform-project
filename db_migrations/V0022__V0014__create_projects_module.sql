-- V0014: Projects module (Advanta-style)

CREATE TABLE t_p45794133_smartmach_platform_p.projects (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL DEFAULT '',
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'planning',
  priority      TEXT NOT NULL DEFAULT 'medium',
  stage         TEXT NOT NULL DEFAULT 'initiation',
  category      TEXT,
  start_date    DATE,
  end_date      DATE,
  actual_end    DATE,
  budget_plan   NUMERIC(15,2) DEFAULT 0,
  budget_fact   NUMERIC(15,2) DEFAULT 0,
  progress_pct  NUMERIC(5,2)  DEFAULT 0,
  manager_id    INTEGER,
  customer      TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE t_p45794133_smartmach_platform_p.project_tasks (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL,
  parent_id     INTEGER,
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'todo',
  priority      TEXT NOT NULL DEFAULT 'medium',
  assignee_id   INTEGER,
  start_date    DATE,
  due_date      DATE,
  done_date     DATE,
  estimated_h   NUMERIC(8,2) DEFAULT 0,
  spent_h       NUMERIC(8,2) DEFAULT 0,
  progress_pct  NUMERIC(5,2) DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE t_p45794133_smartmach_platform_p.project_budgets (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL,
  category      TEXT NOT NULL,
  name          TEXT NOT NULL,
  plan          NUMERIC(15,2) NOT NULL DEFAULT 0,
  fact          NUMERIC(15,2) NOT NULL DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE t_p45794133_smartmach_platform_p.project_members (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL,
  employee_id   INTEGER NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member'
);

CREATE UNIQUE INDEX ON t_p45794133_smartmach_platform_p.project_members (project_id, employee_id);
CREATE INDEX ON t_p45794133_smartmach_platform_p.projects (company_id);
CREATE INDEX ON t_p45794133_smartmach_platform_p.project_tasks (project_id);
CREATE INDEX ON t_p45794133_smartmach_platform_p.project_budgets (project_id);
CREATE INDEX ON t_p45794133_smartmach_platform_p.project_members (project_id);
