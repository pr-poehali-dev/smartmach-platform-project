
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'engineer' CHECK (role IN ('admin','engineer','technologist','manager')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  stage       TEXT NOT NULL DEFAULT 'draft' CHECK (stage IN ('draft','development','review','approved','production','archive')),
  owner_id    INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_versions (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  revision   TEXT NOT NULL,
  notes      TEXT,
  author_id  INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_events (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  actor_id   INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,
  old_stage  TEXT,
  new_stage  TEXT,
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_documents (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  name        TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   INTEGER,
  doc_type    TEXT DEFAULT 'other',
  uploaded_by INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email, role) VALUES
  ('Алексей Иванов',  'ivanov@smartmach.ru',  'admin'),
  ('Мария Петрова',   'petrova@smartmach.ru', 'engineer'),
  ('Сергей Кузнецов', 'kuznecov@smartmach.ru','technologist'),
  ('Дмитрий Орлов',   'orlov@smartmach.ru',   'manager');

INSERT INTO products (code, name, description, stage, owner_id) VALUES
  ('РЦ-250', 'Редуктор цилиндрический РЦ-250', 'Двухступенчатый цилиндрический редуктор, мощность до 250 кВт', 'production', 1),
  ('МР-4',   'Мотор-редуктор МР-4',             'Компактный мотор-редуктор для конвейерных линий',             'development', 2),
  ('ПГ-1',   'Планетарная передача ПГ-1',       'Планетарный редуктор с передаточным числом 1:16',            'review', 3),
  ('ЦГ-2',   'Цилиндрическая передача ЦГ-2',   'Одноступенчатая цилиндрическая передача',                    'archive', 1),
  ('ВЧ-100', 'Вал червячный ВЧ-100',            'Червячный вал для передачи крутящего момента',               'draft', 2);

INSERT INTO product_versions (product_id, revision, notes, author_id) VALUES
  (1, 'Rev A', 'Первая версия',                     1),
  (1, 'Rev B', 'Исправлена посадка подшипников',    2),
  (1, 'Rev C', 'Оптимизация корпуса по МКЭ',        2),
  (1, 'Rev D', 'Финальная версия для производства', 1),
  (2, 'Rev A', 'Начальная разработка',              2),
  (2, 'Rev B', 'Изменена схема смазки',             3),
  (3, 'Rev A', 'Отправлено на согласование',        3),
  (4, 'Rev A', 'Устаревшая конструкция',            1),
  (5, 'Rev A', 'Черновой проект',                   2);

INSERT INTO product_events (product_id, actor_id, event_type, old_stage, new_stage, comment) VALUES
  (1, 1, 'stage_change', 'draft',       'development', 'Начата разработка'),
  (1, 2, 'stage_change', 'development', 'review',      'Готово к проверке'),
  (1, 1, 'stage_change', 'review',      'approved',    'Согласовано'),
  (1, 1, 'stage_change', 'approved',    'production',  'Запущено в производство'),
  (2, 2, 'stage_change', 'draft',       'development', 'Начата разработка'),
  (3, 3, 'stage_change', 'development', 'review',      'На согласование');
