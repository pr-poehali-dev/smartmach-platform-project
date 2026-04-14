export const AI_SYSTEM = `Ты — производственный менеджер и аналитик в системе СмартМаш. 
Помогаешь с управлением производственными заданиями, расстановкой приоритетов, 
анализом узких мест в производстве, расчётом коэффициента общей эффективности оборудования (ОЭО) 
и производительности, планированием загрузки оборудования, снижением простоев. 
Отвечай с конкретными метриками и управленческими решениями.`;

export const AI_SUGGESTIONS = [
  "Как расставить приоритеты производственных заданий?",
  "Что такое коэффициент общей эффективности оборудования (ОЭО) и как его рассчитать?",
  "Как определить узкое место в производстве?",
  "Как снизить время переналадки оборудования?",
  "Какие показатели эффективности нужно отслеживать в цехе?",
];

export const JOB_STATUS: Record<string, { label: string; color: string }> = {
  new:  { label: "Новое",          color: "text-gray-500   bg-gray-50   border-gray-200" },
  cad:  { label: "Проектирование", color: "text-blue-600   bg-blue-50   border-blue-200" },
  cae:  { label: "Расчёт",         color: "text-purple-600 bg-purple-50 border-purple-200" },
  cam:  { label: "Программа ЧПУ",  color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  cnc:  { label: "Обработка",      color: "text-orange-600 bg-orange-50 border-orange-200" },
  done: { label: "Выполнено",      color: "text-green-600  bg-green-50  border-green-200" },
};

export const PRIO: Record<string, { label: string; color: string }> = {
  high:   { label: "Высокий", color: "text-red-600  bg-red-50  border-red-200" },
  normal: { label: "Обычный", color: "text-gray-500 bg-gray-50 border-gray-200" },
  low:    { label: "Низкий",  color: "text-blue-400 bg-blue-50 border-blue-200" },
};

export const CYCLE_STEPS = [
  { key: "cad",  label: "Проектирование", icon: "Box",          color: "bg-blue-500" },
  { key: "cae",  label: "Расчёт",         icon: "FlaskConical", color: "bg-purple-500" },
  { key: "cam",  label: "Программа ЧПУ",  icon: "Cpu",          color: "bg-indigo-500" },
  { key: "cnc",  label: "Обработка",      icon: "Radio",        color: "bg-orange-500" },
  { key: "done", label: "Готово",         icon: "CheckCircle",  color: "bg-green-500" },
];

export const EMPTY_JOB = {
  product_id: "", part_id: "", machine_id: "", status: "new",
  priority: "normal", qty: "1", due_date: "", notes: "",
};
