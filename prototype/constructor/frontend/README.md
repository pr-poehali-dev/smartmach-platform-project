# Frontend — структура компонентов

Тонкий клиент: только ввод требований, сравнение вариантов и просмотр 3D.
Бизнес-логики на фронте нет — она защищена на бэкенде.

```
src/
├── App.tsx                     — роутинг
├── api/
│   └── client.ts               — HTTP-клиент FastAPI
├── pages/
│   ├── ProjectsPage.tsx        — список проектов
│   ├── WizardPage.tsx          — мастер требований (шаги)
│   ├── ComparePage.tsx         — сравнение 3 вариантов
│   └── ReportPage.tsx          — отчёт и экспорт файлов
├── components/
│   ├── wizard/
│   │   ├── SchemaForm.tsx      — генерация формы из JSON Schema
│   │   ├── StepGeometry.tsx    — габариты, толщина стенки
│   │   ├── StepMaterial.tsx    — материал и точность
│   │   ├── StepProduction.tsx  — партия, срок, парк станков
│   │   └── WizardNav.tsx       — навигация по шагам
│   ├── variants/
│   │   ├── VariantCard.tsx     — карточка варианта
│   │   ├── VariantCompare.tsx  — таблица сравнения
│   │   ├── CostChart.tsx       — структура себестоимости
│   │   └── RiskList.tsx        — риски варианта
│   ├── viewer/
│   │   └── ModelViewer.tsx     — Xeokit / IFC.js, только просмотр
│   └── report/
│       ├── SpecTable.tsx       — спецификация
│       ├── RouteCard.tsx       — маршрутная карта
│       └── ExportButtons.tsx   — STEP / STL / PDF / XLSX
└── types/
    └── api.ts                  — типы ответов API
```

## Пример: форма мастера из JSON Schema

Схема приходит с `GET /api/v1/schema/gearbox_housing` — форма строится автоматически,
добавление нового типа узла не требует правок фронта.

```tsx
import { useEffect, useState } from "react";

type Field = { name: string; type: string; title?: string; default?: unknown; enum?: string[] };

export default function SchemaForm({
  unitType, onSubmit,
}: { unitType: string; onSubmit: (v: Record<string, unknown>) => void }) {
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch(`/api/v1/schema/${unitType}`)
      .then((r) => r.json())
      .then((schema) => {
        const list: Field[] = Object.entries(schema.properties ?? {}).map(
          ([name, p]: [string, any]) => ({
            name,
            type: p.type ?? "string",
            title: p.description ?? name,
            default: p.default,
            enum: p.enum,
          })
        );
        setFields(list);
        setValues(Object.fromEntries(list.map((f) => [f.name, f.default])));
      });
  }, [unitType]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}>
      {fields.map((f) => (
        <label key={f.name}>
          <span>{f.title}</span>
          {f.enum ? (
            <select
              value={String(values[f.name] ?? "")}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            >
              {f.enum.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={f.type === "number" || f.type === "integer" ? "number" : "text"}
              value={String(values[f.name] ?? "")}
              onChange={(e) =>
                setValues({
                  ...values,
                  [f.name]: f.type === "string" ? e.target.value : Number(e.target.value),
                })
              }
            />
          )}
        </label>
      ))}
      <button type="submit">Рассчитать варианты</button>
    </form>
  );
}
```

## Просмотрщик

Xeokit подключается только на чтение: бэкенд отдаёт glTF/XKT по
`GET /api/v1/models/{id}/viewer`. Никаких вычислений на клиенте.
