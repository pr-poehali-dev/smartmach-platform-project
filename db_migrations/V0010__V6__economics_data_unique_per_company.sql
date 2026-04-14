ALTER TABLE "t_p45794133_smartmach_platform_p".economics_data DROP CONSTRAINT IF EXISTS economics_data_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS economics_data_key_company_unique ON "t_p45794133_smartmach_platform_p".economics_data (key, company_id);
