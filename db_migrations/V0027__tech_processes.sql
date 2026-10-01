-- Технологические процессы (техкарты) по ГОСТ 3.1118 / 3.1404
CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.tech_processes (
    id            SERIAL PRIMARY KEY,
    company_id    INTEGER NOT NULL,
    part_id       INTEGER REFERENCES t_p45794133_smartmach_platform_p.parts(id),
    code          TEXT NOT NULL DEFAULT '',
    name          TEXT NOT NULL,
    material      TEXT,
    blank_type    TEXT,
    blank_size    TEXT,
    blank_mass    NUMERIC(10,3),
    part_mass     NUMERIC(10,3),
    batch_size    INTEGER NOT NULL DEFAULT 1,
    status        TEXT NOT NULL DEFAULT 'draft',
    developer     TEXT,
    checker       TEXT,
    approver      TEXT,
    author_id     INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
    notes         TEXT,
    is_demo       BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tp_company ON t_p45794133_smartmach_platform_p.tech_processes(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tp_part ON t_p45794133_smartmach_platform_p.tech_processes(part_id);

-- Операции маршрута
CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.tech_operations (
    id              SERIAL PRIMARY KEY,
    process_id      INTEGER NOT NULL REFERENCES t_p45794133_smartmach_platform_p.tech_processes(id),
    company_id      INTEGER NOT NULL,
    op_no           TEXT NOT NULL,
    name            TEXT NOT NULL,
    workshop        TEXT,
    area            TEXT,
    equipment_id    INTEGER REFERENCES t_p45794133_smartmach_platform_p.equipment(id),
    equipment_name  TEXT,
    cam_program_id  INTEGER REFERENCES t_p45794133_smartmach_platform_p.cnc_programs(id),
    fixture         TEXT,
    profession      TEXT,
    worker_rank     INTEGER,
    workers         INTEGER NOT NULL DEFAULT 1,
    t_aux           NUMERIC(10,3) NOT NULL DEFAULT 0,
    k_service_pct   NUMERIC(6,2) NOT NULL DEFAULT 8,
    t_pz            NUMERIC(10,3) NOT NULL DEFAULT 0,
    t_main          NUMERIC(10,3) NOT NULL DEFAULT 0,
    t_sht           NUMERIC(10,3) NOT NULL DEFAULT 0,
    t_sht_k         NUMERIC(10,3) NOT NULL DEFAULT 0,
    notes           TEXT,
    sort            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_top_process ON t_p45794133_smartmach_platform_p.tech_operations(process_id, sort);

-- Переходы операции с режимами резания
CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.tech_steps (
    id             SERIAL PRIMARY KEY,
    operation_id   INTEGER NOT NULL REFERENCES t_p45794133_smartmach_platform_p.tech_operations(id),
    company_id     INTEGER NOT NULL,
    step_no        INTEGER NOT NULL DEFAULT 1,
    description    TEXT NOT NULL,
    tool           TEXT,
    measuring_tool TEXT,
    diameter       NUMERIC(10,3),
    length         NUMERIC(10,3),
    overrun        NUMERIC(10,3) NOT NULL DEFAULT 0,
    depth          NUMERIC(10,3),
    passes         INTEGER NOT NULL DEFAULT 1,
    feed           NUMERIC(10,4),
    speed          NUMERIC(10,2),
    spindle        NUMERIC(10,1),
    t_main         NUMERIC(10,3) NOT NULL DEFAULT 0,
    manual_time    BOOLEAN NOT NULL DEFAULT false,
    sort           INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tst_op ON t_p45794133_smartmach_platform_p.tech_steps(operation_id, sort);

-- Пометка демо-данных во всех основных таблицах, чтобы пример можно было отличить
ALTER TABLE t_p45794133_smartmach_platform_p.products     ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p45794133_smartmach_platform_p.parts        ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p45794133_smartmach_platform_p.equipment    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p45794133_smartmach_platform_p.machines     ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p45794133_smartmach_platform_p.cnc_programs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p45794133_smartmach_platform_p.jobs         ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p45794133_smartmach_platform_p.simulations  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;