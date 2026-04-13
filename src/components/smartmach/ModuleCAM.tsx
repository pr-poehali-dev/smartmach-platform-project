import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Program, Part, Machine, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";

interface CamSystem {
  name: string;
  vendor: string;
  category: "professional" | "universal" | "free";
  origin: string;
  axes: string;
  integrations: string[];
  price: string;
  bestFor: string;
  features: string[];
  link: string;
}

const CAM_SYSTEMS: CamSystem[] = [
  {
    name: "Mastercam",
    vendor: "CNC Software",
    category: "professional",
    origin: "США",
    axes: "2D — 5-осевая",
    integrations: ["SOLIDWORKS", "NX", "CATIA"],
    price: "от $7 000/год",
    bestFor: "Крупные предприятия, сложная 5-осевая обработка",
    features: ["Многоосевая обработка (2D–5D)", "Динамическое движение инструмента", "Высокоскоростная обработка", "Лазерная и плазменная резка", "Электроэрозионная обработка"],
    link: "https://www.mastercam.com",
  },
  {
    name: "SolidCAM",
    vendor: "SolidCAM Ltd",
    category: "professional",
    origin: "Израиль",
    axes: "2D — 5-осевая",
    integrations: ["SOLIDWORKS (встроен)", "Inventor"],
    price: "от $5 000/год",
    bestFor: "Предприятия на базе SOLIDWORKS",
    features: ["Встроен в SOLIDWORKS", "Ассоциативная связь модель → УП", "Токарно-фрезерные центры", "iMachining — оптимизация режимов резания", "5-осевое фрезерование"],
    link: "https://www.solidcam.com",
  },
  {
    name: "SprutCAM",
    vendor: "SPRUT Technology",
    category: "professional",
    origin: "Россия",
    axes: "3D — 6-осевая",
    integrations: ["SOLIDWORKS", "Компас-3D", "NX"],
    price: "от 150 000 ₽/год",
    bestFor: "Российские предприятия, роботизированные ячейки",
    features: ["Российская разработка (импортозамещение)", "3–5-осевое фрезерование", "Программирование роботов (6 осей)", "EDM, лазер, плазма", "Swiss-станки"],
    link: "https://www.sprutcam.com",
  },
  {
    name: "PowerMILL",
    vendor: "Autodesk",
    category: "professional",
    origin: "Великобритания",
    axes: "3D — 5-осевая",
    integrations: ["Fusion 360", "Inventor", "SolidWorks"],
    price: "от $10 000/год",
    bestFor: "Высокоскоростная обработка сложных поверхностей",
    features: ["Плавные траектории без заострённых углов", "3- и 5-осевое фрезерование", "Поддержка поворотной оси", "Минимизация нагрузки на шпиндель", "Интеграция с PowerShape"],
    link: "https://www.autodesk.com/products/powermill",
  },
  {
    name: "Siemens NX CAM",
    vendor: "Siemens",
    category: "professional",
    origin: "Германия / США",
    axes: "2D — 5-осевая",
    integrations: ["NX CAD", "NX CAE", "Teamcenter"],
    price: "по запросу (от $15 000)",
    bestFor: "Крупные предприятия, единая PLM-среда",
    features: ["Полная интеграция CAD/CAM/CAE", "Многоосевая обработка", "Постпроцессоры для любых контроллеров", "Синхронное моделирование", "Управление данными через Teamcenter"],
    link: "https://www.plm.automation.siemens.com/nx",
  },
  {
    name: "Fusion 360",
    vendor: "Autodesk",
    category: "universal",
    origin: "США",
    axes: "2D — 5-осевая",
    integrations: ["Облако Autodesk", "Inventor", "AutoCAD"],
    price: "от $545/год (есть бесплатный план)",
    bestFor: "Малый бизнес, стартапы, образование",
    features: ["Облачный CAD/CAM/CAE в одном окне", "Поддержка 2D–5-осевой обработки", "Симуляция столкновений", "Совместная работа в облаке", "Бесплатный план для хобби и стартапов"],
    link: "https://www.autodesk.com/fusion",
  },
  {
    name: "FreeCAD + Path",
    vendor: "Сообщество (open source)",
    category: "free",
    origin: "Открытый исходный код",
    axes: "2D — 2.5D",
    integrations: ["Независимый", "Экспорт DXF/STEP/STL"],
    price: "Бесплатно",
    bestFor: "Обучение, DIY-проекты, некоммерческое использование",
    features: ["Полностью бесплатный", "Параметрическое 3D-моделирование", "Path Workbench — генерация G-кода", "Расширяется через Python-макросы", "Экспорт в форматы DXF, STEP, STL"],
    link: "https://www.freecad.org",
  },
  {
    name: "CAMotics",
    vendor: "Camotics.org (open source)",
    category: "free",
    origin: "США",
    axes: "2D — 4-осевая",
    integrations: ["Любые CAM-системы (читает G-код)"],
    price: "Бесплатно",
    bestFor: "Симуляция и проверка G-кода",
    features: ["Симуляция траекторий инструмента", "Расчёт времени выполнения", "Редактирование G-кода (ASCII)", "2D/3D-визуализация обработки", "Открытый исходный код"],
    link: "https://camotics.org",
  },
];

const CAT_CONFIG = {
  professional: { label: "Профессиональные", color: "bg-purple-100 text-purple-800" },
  universal:    { label: "Универсальные",    color: "bg-blue-100 text-blue-800" },
  free:         { label: "Бесплатные / Open Source", color: "bg-green-100 text-green-800" },
};

const AI_SYSTEM = `Ты — технолог-программист ЧПУ в системе СмартМаш. 
Помогаешь с написанием управляющих программ (G-код), выбором режимов резания (подача, скорость, глубина), 
стратегиями обработки (черновая, чистовая, многоосевая), выбором инструмента, оптимизацией программ ЧПУ. 
Отвечай с конкретными режимами и рекомендациями по материалам.`;

const AI_SUGGESTIONS = [
  "Какие режимы резания для фрезеровки Стали 45?",
  "Как написать цикл сверления в управляющей программе?",
  "Как работает коррекция на радиус инструмента?",
  "Как рассчитать скорость подачи для токарной операции?",
  "Какую стратегию обработки выбрать для кармана?",
];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  queue:   { label: "Очередь",  color: "text-gray-500   bg-gray-50   border-gray-200" },
  running: { label: "В работе", color: "text-blue-600   bg-blue-50   border-blue-200" },
  done:    { label: "Готово",   color: "text-green-600  bg-green-50  border-green-200" },
  error:   { label: "Ошибка",   color: "text-red-600    bg-red-50    border-red-200" },
};

const NEXT: Record<string, string> = { queue: "running", running: "done" };
const NEXT_LABEL: Record<string, string> = { queue: "Запустить", running: "Завершить" };

const EMPTY = { name: "", code: "", est_time: "", status: "queue", part_id: "", machine_id: "", author_id: "" };

export default function ModuleCAM() {
  const [tab, setTab] = useState<"programs" | "systems">("programs");
  const [camFilter, setCamFilter] = useState<"all" | "professional" | "universal" | "free">("all");
  const [selectedCam, setSelectedCam] = useState<CamSystem | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [pr, pa, m, u] = await Promise.all([
        mGet<Program[]>("programs"), mGet<Part[]>("parts"),
        mGet<Machine[]>("machines"), mGet<User[]>("users"),
      ]);
      setPrograms(pr); setParts(pa); setMachines(m); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await mPost("programs", {
        name: form.name, code: form.code || null, est_time: form.est_time || null,
        status: form.status,
        part_id: form.part_id ? Number(form.part_id) : null,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        author_id: form.author_id ? Number(form.author_id) : null,
      });
      setForm(EMPTY); setShowForm(false); await load();
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  async function advance(prog: Program) {
    const next = NEXT[prog.status];
    if (!next) return;
    try { await mPut("programs", prog.id, { status: next }); await load(); }
    catch { alert("Ошибка обновления"); }
  }

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const filteredCam = camFilter === "all" ? CAM_SYSTEMS : CAM_SYSTEMS.filter((s) => s.category === camFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Программы ЧПУ — Управление обработкой</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Управляющие программы для станков и очередь на обработку</p>
        </div>
        {tab === "programs" && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Icon name="Plus" size={16} />Новая программа
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([["programs", "FileCode", "Программы"], ["systems", "BookOpen", "Справочник CAD/CAM"]] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon name={icon} size={15} />{label}
          </button>
        ))}
      </div>

      {tab === "systems" && (
        <div className="space-y-5">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {([["all", "Все системы"], ["professional", "Профессиональные"], ["universal", "Универсальные"], ["free", "Бесплатные"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setCamFilter(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  camFilter === id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCam.map((s) => (
              <div key={s.name} onClick={() => setSelectedCam(s)}
                className="bg-white border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.vendor} · {s.origin}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${CAT_CONFIG[s.category].color}`}>
                    {CAT_CONFIG[s.category].label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Icon name="Settings2" size={12} />{s.axes}</span>
                  <span className="flex items-center gap-1"><Icon name="Tag" size={12} />{s.price}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{s.bestFor}</p>
                <div className="flex flex-wrap gap-1">
                  {s.features.slice(0, 3).map((f) => (
                    <span key={f} className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                  {s.features.length > 3 && (
                    <span className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">+{s.features.length - 3}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail dialog */}
          {selectedCam && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCam(null)}>
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{selectedCam.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedCam.vendor} · {selectedCam.origin}</p>
                  </div>
                  <button onClick={() => setSelectedCam(null)}>
                    <Icon name="X" size={18} className="text-muted-foreground" />
                  </button>
                </div>

                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${CAT_CONFIG[selectedCam.category].color}`}>
                  {CAT_CONFIG[selectedCam.category].label}
                </span>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Обработка</p>
                    <p>{selectedCam.axes}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Стоимость</p>
                    <p>{selectedCam.price}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Интеграции</p>
                    <p>{selectedCam.integrations.join(", ")}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Лучше всего подходит</p>
                    <p>{selectedCam.bestFor}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Возможности</p>
                  <ul className="space-y-1">
                    {selectedCam.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Icon name="Check" size={14} className="text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <a href={selectedCam.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Icon name="ExternalLink" size={14} />
                  Официальный сайт
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "programs" && showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новая управляющая программа</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Фрезеровка корпуса"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Код программы</label>
              <input value={form.code} onChange={(e) => f("code", e.target.value)} placeholder="Текст управляющей программы..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Оценка времени</label>
              <input value={form.est_time} onChange={(e) => f("est_time", e.target.value)} placeholder="2ч 30м"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Деталь</label>
              <select value={form.part_id} onChange={(e) => f("part_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбрана —</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Станок</label>
              <select value={form.machine_id} onChange={(e) => f("machine_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбран —</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
              <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбран —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Сохранение…" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "programs" && <><div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold">Очередь программ</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 text-sm">
            <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
            <button onClick={load} className="mt-2 block mx-auto text-xs underline">Повторить</button>
          </div>
        ) : programs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="FileCode" size={36} className="mx-auto mb-2 opacity-20" />Программ пока нет. Добавьте первую.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {programs.map((p) => {
              const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.queue;
              const nextAction = NEXT_LABEL[p.status];
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="FileCode" size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.part_name, p.machine_name, p.est_time].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {nextAction && (
                    <button onClick={() => advance(p)}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 flex-shrink-0">
                      {nextAction}
                    </button>
                  )}
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div></>}

      <AiAssistant
        title="Помощник технолога"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}