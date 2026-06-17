-- Добавляем поля для хранения canvas-данных и привязки к модулю станка
ALTER TABLE t_p45794133_smartmach_platform_p.drawings
  ADD COLUMN IF NOT EXISTS canvas_json  text    NULL,
  ADD COLUMN IF NOT EXISTS module       text    NOT NULL DEFAULT 'cad',
  ADD COLUMN IF NOT EXISTS description  text    NULL,
  ADD COLUMN IF NOT EXISTS layers_json  text    NULL;

-- Индекс для быстрой выборки чертежей по модулю
CREATE INDEX IF NOT EXISTS drawings_module_idx
  ON t_p45794133_smartmach_platform_p.drawings (module);
