-- История версий чертежей (ревизии) + извещения об изменении по ГОСТ 2.503

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.drawing_revisions (
    id            SERIAL PRIMARY KEY,
    drawing_id    INTEGER NOT NULL REFERENCES t_p45794133_smartmach_platform_p.drawings(id),
    company_id    INTEGER NOT NULL,
    author_id     INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
    rev_no        INTEGER NOT NULL,
    rev_letter    TEXT NOT NULL DEFAULT '',
    name          TEXT NOT NULL,
    description   TEXT,
    comment       TEXT NOT NULL DEFAULT '',
    change_reason TEXT NOT NULL DEFAULT '',
    paper_size    TEXT,
    theme         TEXT,
    file_url      TEXT,
    file_size     INTEGER,
    canvas_json   TEXT,
    layers_json   TEXT,
    gost_meta     JSONB,
    obj_count     INTEGER NOT NULL DEFAULT 0,
    is_current    BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS drawing_revisions_uniq
    ON t_p45794133_smartmach_platform_p.drawing_revisions (drawing_id, rev_no);

CREATE INDEX IF NOT EXISTS drawing_revisions_drawing_idx
    ON t_p45794133_smartmach_platform_p.drawing_revisions (drawing_id, rev_no DESC);

CREATE INDEX IF NOT EXISTS drawing_revisions_company_idx
    ON t_p45794133_smartmach_platform_p.drawing_revisions (company_id, created_at DESC);

-- Извещения об изменении (ГОСТ 2.503)
CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.drawing_change_notices (
    id             SERIAL PRIMARY KEY,
    drawing_id     INTEGER NOT NULL REFERENCES t_p45794133_smartmach_platform_p.drawings(id),
    revision_id    INTEGER REFERENCES t_p45794133_smartmach_platform_p.drawing_revisions(id),
    company_id     INTEGER NOT NULL,
    author_id      INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
    notice_code    TEXT NOT NULL,
    rev_letter     TEXT NOT NULL DEFAULT '',
    reason         TEXT NOT NULL DEFAULT '',
    content        TEXT NOT NULL DEFAULT '',
    applicability  TEXT NOT NULL DEFAULT '',
    backlog        TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'draft',
    approved_by    INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
    approved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drawing_change_notices_drawing_idx
    ON t_p45794133_smartmach_platform_p.drawing_change_notices (drawing_id, created_at DESC);

ALTER TABLE t_p45794133_smartmach_platform_p.drawings
    ADD COLUMN IF NOT EXISTS current_rev  INTEGER NOT NULL DEFAULT 0;

ALTER TABLE t_p45794133_smartmach_platform_p.drawings
    ADD COLUMN IF NOT EXISTS rev_letter   TEXT NOT NULL DEFAULT '';
