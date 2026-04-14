CREATE TABLE IF NOT EXISTS "t_p45794133_smartmach_platform_p".invites (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL,
    token       VARCHAR(64) UNIQUE NOT NULL,
    email       VARCHAR(255),
    role        VARCHAR(50) NOT NULL DEFAULT 'engineer',
    created_by  INTEGER,
    used_by     INTEGER,
    used_at     TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token      ON "t_p45794133_smartmach_platform_p".invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_company    ON "t_p45794133_smartmach_platform_p".invites(company_id);
