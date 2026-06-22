import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import AiAssistant from "@/components/smartmach/AiAssistant";
import MachineSpecs from "@/components/smartmach/MachineSpecs";
import MachineParts from "@/components/smartmach/MachineParts";
import MachineModulesList from "@/components/smartmach/MachineModulesList";
import MachinePlan from "@/components/smartmach/MachinePlan";
import MachineConfigurator from "@/components/smartmach/MachineConfigurator";
import MachineDrawingsList, { type MachineDrawing } from "@/components/smartmach/MachineDrawingsList";
import MachineDrawingEditor from "@/components/smartmach/MachineDrawingEditor";
import MachineSpecification from "@/components/smartmach/MachineSpecification";
import MachineTestLog from "@/components/smartmach/MachineTestLog";
import { MACHINE_TEMPLATES, type MachineTemplate } from "@/components/smartmach/machineDrawingTemplates";

const AI_SYSTEM = `Ты — инженер-конструктор и эксперт по станкостроению в системе СмартМаш.
Помогаешь с вопросами по проектированию и изготовлению гибридного компактного станка:
токарная и фрезерная обработка, лазерная наплавка/гравировка, системы ЧПУ, выбор компонентов
(ШВП, направляющие, двигатели, частотные преобразователи), расчёт жёсткости станины,
настройка GRBL и LinuxCNC. Отвечай конкретно и технически грамотно.`;

const AI_SUGGESTIONS = [
  "Какие направляющие лучше для гибридного станка — роликовые или скользящие?",
  "Как рассчитать жёсткость сварной стальной станины?",
  "Что лучше: GRBL или LinuxCNC для учебного станка?",
  "Как подобрать частотный преобразователь под шпиндель 1,5 кВт?",
  "Как рассчитать мощность ШВП для оси X 500 мм?",
];

type Tab = "overview" | "parts" | "modules" | "plan" | "config" | "drawings" | "spec" | "tests";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",  label: "Характеристики", icon: "BarChart2"         },
  { id: "parts",     label: "Номенклатура",    icon: "PackageSearch"     },
  { id: "modules",   label: "Модули",          icon: "Layers"            },
  { id: "plan",      label: "План",             icon: "ClipboardList"    },
  { id: "config",    label: "Конфигурации",    icon: "SlidersHorizontal" },
  { id: "drawings",  label: "Чертежи",          icon: "PenLine"          },
  { id: "spec",      label: "Спецификация",    icon: "FileSpreadsheet"   },
  { id: "tests",     label: "Испытания",        icon: "FlaskConical"     },
];

export default function ModuleMachine() {
  const [tab, setTab]               = useState<Tab>("overview");
  // Чертежи: null = список, undefined = новый, object = редактировать
  const [openDrawing, setOpenDrawing] = useState<MachineDrawing | null | undefined>(null);
  const [activeTemplate, setActiveTemplate] = useState<MachineTemplate | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Режим редактора: показываем только когда открыт чертёж
  const editorOpen = openDrawing !== null;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Заголовок */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Icon name="Hammer" size={16} className="text-amber-600" />
            </div>
            <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Собственная разработка</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            Гибридный станок МАТ-1
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Компактный многофункциональный станок: токарная + фрезерная + лазерная обработка
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            TRL 3 · В разработке
          </span>
        </div>
      </div>

      {/* Плашка концепции */}
      <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Icon name="Zap" size={22} className="text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-base mb-1">Цель проекта</div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Создать компактный гибридный станок, сочетающий токарную и фрезерную обработку
            с возможностью лазерной наплавки и гравировки. Целевые сегменты: малые мастерские,
            учебные заведения, домашние мастерские. Базовая версия — до 300 000 ₽,
            расширенная — до 450 000 ₽. Снижение стоимости до 35% относительно аналогов.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          {[
            { value: "4-в-1", sub: "операции" },
            { value: "300K",  sub: "базовая цена" },
          ].map((k) => (
            <div key={k.value} className="bg-white/8 rounded-xl px-4 py-3 text-center">
              <div className="text-xl font-bold text-white">{k.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setOpenDrawing(null); setActiveTemplate(null); }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-1 justify-center",
              tab === t.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Контент табов */}
      {tab === "overview"  && <MachineSpecs />}
      {tab === "parts"     && <MachineParts />}
      {tab === "modules"   && <MachineModulesList />}
      {tab === "plan"      && <MachinePlan />}
      {tab === "config"    && <MachineConfigurator />}
      {tab === "spec"      && <MachineSpecification />}
      {tab === "tests"     && <MachineTestLog />}

      {/* Вкладка чертежей */}
      {tab === "drawings" && (
        editorOpen ? (
          <MachineDrawingEditor
            drawing={openDrawing ?? undefined}
            template={activeTemplate}
            onBack={() => { setOpenDrawing(null); setActiveTemplate(null); }}
            onSaved={(saved) => {
              setOpenDrawing(null);
              setActiveTemplate(null);
              setRefreshTick((n) => n + 1);
              // Если это был новый — открываем его же для продолжения работы
              if (!openDrawing) setOpenDrawing(saved);
            }}
          />
        ) : (
          <MachineDrawingsList
            onOpen={(d) => { setActiveTemplate(null); setOpenDrawing(d); }}
            onNew={(templateId) => {
              setActiveTemplate(templateId ? MACHINE_TEMPLATES.find((t) => t.id === templateId) ?? null : null);
              setOpenDrawing(undefined);
            }}
            refreshTick={refreshTick}
          />
        )
      )}

      {/* ИИ-ассистент — не показываем в редакторе */}
      {!(tab === "drawings" && editorOpen) && (
        <AiAssistant systemPrompt={AI_SYSTEM} suggestions={AI_SUGGESTIONS} />
      )}
    </div>
  );
}