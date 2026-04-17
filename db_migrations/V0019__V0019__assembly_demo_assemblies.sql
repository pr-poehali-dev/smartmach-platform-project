
-- Реальные демо-сборки (stage: draft|design|review|approved|production|archive)
-- (asm_type: assembly|unit|mechanism|aggregate|product)
UPDATE t_p45794133_smartmach_platform_p.assemblies SET name='_del' WHERE code='TEST-1';

INSERT INTO t_p45794133_smartmach_platform_p.assemblies
  (company_id, code, name, description, asm_type, stage, revision, standard, notes, owner_id)
VALUES
(1,'РЦ-250-СБ','Редуктор цилиндрический РЦ-250',
  'Двухступенчатый цилиндрический редуктор. Мощность до 250 кВт, i=12.5, n₁=1500 об/мин',
  'assembly','design','B','ГОСТ Р 50891-96','Масло: И-Г-А-46 ГОСТ 17479.4. Ресурс 25000 ч.',1),
(1,'МР-4-СБ','Мотор-редуктор МР-4',
  'Компактный мотор-редуктор для конвейерных линий. Мощность 4 кВт, i=31.5',
  'assembly','draft','A',NULL,'В разработке',2),
(1,'ПГ-1-СБ','Планетарная передача ПГ-1',
  'Планетарный редуктор с передаточным числом 1:16. Три сателлита.',
  'assembly','review','A',NULL,'На согласовании',3);
