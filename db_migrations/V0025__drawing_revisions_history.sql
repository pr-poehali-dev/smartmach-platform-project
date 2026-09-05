-- История версий чертежей по ГОСТ 2.503 (извещения об изменении)
CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.drawing_revisions (
    id            SERIAL PRIMARY KEY,
    drawing_id    INTEGER NOT NULL REFERENCES t_p45794133_smartmach_platform_p.drawings(id),
    company_id    INTEGER,
    author_id     INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
    rev_no        INTEGER NOT NULL,
    rev_letter    TEXT,
    name          TEXT NOT NULL,
    paper_size    TEXT,
    theme         TEXT,
    file_url      TEXT,
    file_size     INTEGER,
    canvas_json   TEXT,
    layers_json   TEXT,
    gost_meta     JSONB,
    change_note   TEXT,
    change_reason TEXT,
    objects_count INTEGER DEFAULT 0,
    is_current    BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (drawing_id, rev_no)
);

CREATE INDEX IF NOT EXISTS idx_drev_drawing ON t_p45794133_smartmach_platform_p.drawing_revisions(drawing_id, rev_no DESC);
CREATE INDEX IF NOT EXISTS idx_drev_company ON t_p45794133_smartmach_platform_p.drawing_revisions(company_id);

ALTER TABLE t_p45794133_smartmach_platform_p.drawings
    ADD COLUMN IF NOT EXISTS current_rev  INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS rev_letter   TEXT,
    ADD COLUMN IF NOT EXISTS is_archived  BOOLEAN NOT NULL DEFAULT false;