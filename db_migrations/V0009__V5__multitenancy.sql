CREATE TABLE IF NOT EXISTS "t_p45794133_smartmach_platform_p".companies (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    slug       TEXT UNIQUE,
    plan       TEXT NOT NULL DEFAULT 'start',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "t_p45794133_smartmach_platform_p".companies (name, slug, plan)
SELECT 'Демо-предприятие', 'demo', 'pro'
WHERE NOT EXISTS (SELECT 1 FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo');

ALTER TABLE "t_p45794133_smartmach_platform_p".users            ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".sessions         ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".parts            ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".machines         ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".cnc_programs     ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".simulations      ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".jobs             ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".products         ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".product_versions ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".product_events   ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".product_documents ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".employees        ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".economics_data   ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".equipment        ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE "t_p45794133_smartmach_platform_p".event_log        ADD COLUMN IF NOT EXISTS company_id INTEGER;

UPDATE "t_p45794133_smartmach_platform_p".users             SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".sessions          SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".parts             SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".machines          SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".cnc_programs      SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".simulations       SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".jobs              SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".products          SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".product_versions  SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".product_events    SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".product_documents SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".employees         SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".economics_data    SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".equipment         SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;
UPDATE "t_p45794133_smartmach_platform_p".event_log         SET company_id = (SELECT id FROM "t_p45794133_smartmach_platform_p".companies WHERE slug = 'demo' LIMIT 1) WHERE company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_parts_company         ON "t_p45794133_smartmach_platform_p".parts(company_id);
CREATE INDEX IF NOT EXISTS idx_machines_company      ON "t_p45794133_smartmach_platform_p".machines(company_id);
CREATE INDEX IF NOT EXISTS idx_programs_company      ON "t_p45794133_smartmach_platform_p".cnc_programs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company          ON "t_p45794133_smartmach_platform_p".jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company      ON "t_p45794133_smartmach_platform_p".products(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company     ON "t_p45794133_smartmach_platform_p".employees(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company     ON "t_p45794133_smartmach_platform_p".equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_event_log_company     ON "t_p45794133_smartmach_platform_p".event_log(company_id);
