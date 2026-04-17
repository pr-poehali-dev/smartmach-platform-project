CREATE TABLE t_p45794133_smartmach_platform_p.assemblies (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER REFERENCES t_p45794133_smartmach_platform_p.companies(id),
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  asm_type      TEXT NOT NULL DEFAULT 'assembly' CHECK (asm_type IN ('assembly','unit','mechanism','aggregate','product')),
  stage         TEXT NOT NULL DEFAULT 'draft' CHECK (stage IN ('draft','design','review','approved','production','archive')),
  revision      TEXT NOT NULL DEFAULT 'A',
  standard      TEXT,
  weight_kg     NUMERIC(12,4),
  notes         TEXT,
  owner_id      INTEGER REFERENCES t_p45794133_smartmach_platform_p.users(id),
  product_id    INTEGER REFERENCES t_p45794133_smartmach_platform_p.products(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)