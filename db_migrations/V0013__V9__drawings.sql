CREATE TABLE IF NOT EXISTS "t_p45794133_smartmach_platform_p".drawings (
    id          SERIAL PRIMARY KEY,
    part_id     INTEGER REFERENCES "t_p45794133_smartmach_platform_p".parts(id),
    company_id  INTEGER,
    author_id   INTEGER REFERENCES "t_p45794133_smartmach_platform_p".users(id),
    name        TEXT NOT NULL,
    paper_size  TEXT NOT NULL DEFAULT 'A4 горизонт.',
    theme       TEXT NOT NULL DEFAULT 'light',
    file_url    TEXT NOT NULL,
    file_size   INTEGER,
    gost_meta   JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drawings_part    ON "t_p45794133_smartmach_platform_p".drawings(part_id);
CREATE INDEX IF NOT EXISTS idx_drawings_company ON "t_p45794133_smartmach_platform_p".drawings(company_id);
