CREATE TABLE t_p45794133_smartmach_platform_p.assembly_standards (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,
  subcategory TEXT,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  standard    TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'шт',
  material    TEXT,
  weight_kg   NUMERIC(12,6),
  description TEXT,
  properties  JSONB
);
CREATE INDEX idx_asm_std_cat ON t_p45794133_smartmach_platform_p.assembly_standards(category);
CREATE INDEX idx_asm_nodes_asm    ON t_p45794133_smartmach_platform_p.assembly_nodes(assembly_id);
CREATE INDEX idx_asm_nodes_parent ON t_p45794133_smartmach_platform_p.assembly_nodes(parent_id);
CREATE INDEX idx_asm_nodes_path   ON t_p45794133_smartmach_platform_p.assembly_nodes(path);
CREATE INDEX idx_assemblies_co    ON t_p45794133_smartmach_platform_p.assemblies(company_id)