export interface Product {
  id: number;
  code: string;
  name: string;
  description: string | null;
  stage: string;
  stage_label: string;
  owner_name: string | null;
  latest_revision: string | null;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  role: string;
}

export const STAGES = [
  { value: "draft",       label: "Черновик",    color: "text-gray-500   bg-gray-50   border-gray-200" },
  { value: "development", label: "Разработка",  color: "text-blue-600   bg-blue-50   border-blue-200" },
  { value: "review",      label: "Согласование",color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "approved",    label: "Утверждено",  color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { value: "production",  label: "Производство",color: "text-green-600  bg-green-50  border-green-200" },
  { value: "archive",     label: "Архив",       color: "text-gray-400   bg-gray-50   border-gray-200" },
];

export function stageColor(stage: string) {
  return STAGES.find((s) => s.value === stage)?.color ?? "text-gray-500 bg-gray-50 border-gray-200";
}

export function stageLabel(stage: string) {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export const AI_SYSTEM = `Ты — менеджер по управлению жизненным циклом изделий в системе СмартМаш. 
Помогаешь с процессами согласования конструкторской документации, управлением версиями изделий, 
переходами между стадиями (черновик → разработка → согласование → производство), 
управлением изменениями и извещениями об изменениях. Отвечай чётко, с указанием ответственных ролей.`;

export const AI_SUGGESTIONS = [
  "Каковы критерии перевода изделия в стадию «Согласование»?",
  "Как правильно оформить извещение об изменении?",
  "Что входит в состав конструкторской документации?",
  "Как управлять версиями сборочного чертежа?",
  "В чём разница между системой управления жизненным циклом и системой планирования ресурсов?",
];
