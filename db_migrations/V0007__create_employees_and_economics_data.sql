-- Сотрудники предприятия
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO employees (full_name, position, department, email, phone, salary, hire_date, status) VALUES
('Алексей Иванов',    'Начальник цеха',    'Производство',  'ivanov@smartmach.ru',    '+7 900 111-11-11', 110000, '2020-03-01', 'active'),
('Мария Петрова',     'Технолог ЧПУ',      'Технология',    'petrova@smartmach.ru',   '+7 900 222-22-22', 95000,  '2021-06-15', 'active'),
('Сергей Кузнецов',   'Токарь 5р.',        'Производство',  'kuznecov@smartmach.ru',  '+7 900 333-33-33', 72000,  '2019-09-01', 'active'),
('Дмитрий Орлов',     'Фрезеровщик 4р.',   'Производство',  'orlov@smartmach.ru',     '+7 900 444-44-44', 68000,  '2022-01-10', 'active'),
('Наталья Соколова',  'Инженер-конструктор','Конструкторский','sokolova@smartmach.ru', '+7 900 555-55-55', 90000,  '2020-11-20', 'active'),
('Виктор Смирнов',    'Наладчик ЧПУ',      'Производство',  'smirnov@smartmach.ru',   '+7 900 666-66-66', 85000,  '2021-03-05', 'active');

-- Данные модуля Экономика (JSON по ключам)
CREATE TABLE economics_data (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
