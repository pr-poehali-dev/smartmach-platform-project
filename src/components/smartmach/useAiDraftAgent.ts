/**
 * useAiDraftAgent — хук ИИ-агента-инженера.
 * Принимает текстовое описание детали, обращается к языковой модели
 * (Polza.ai через расширение chatgpt-polza) и возвращает структурированный
 * чертёж AiDraft для рендеринга на холсте.
 */
import { useState, useCallback } from "react";
import { useChatGPT } from "@/components/extensions/chatgpt-polza/useChatGPT";
import { URLS } from "@/lib/api";
import type { AiDraft } from "@/components/smartmach/aiDraftSchema";

const API_URL = URLS["chatgpt-polza-chatgpt"];
const MODEL = "openai/gpt-4o";

const SYSTEM_PROMPT = `Ты — ИИ-инженер-конструктор высшей квалификации в системе СмартМаш.
Ты проектируешь рабочие чертежи деталей машиностроения по ГОСТ ЕСКД (2.305 виды/разрезы, 2.307 размеры, 2.303 линии).

ЗАДАЧА: по текстовому описанию детали сгенерировать ПЛОСКИЙ чертёж (главный вид + при необходимости вид сбоку/сечение) в виде СТРОГО ВАЛИДНОГО JSON.

ВЕРНИ ТОЛЬКО JSON без markdown, без пояснений вне JSON. Схема:
{
  "title": "Наименование детали",
  "designation": "МАТ-1.000.0XX",
  "material": "Сталь 45 ГОСТ 1050",
  "paperSize": "A4 горизонт.",
  "primitives": [ ... ],
  "notes": ["1. ...", "2. ..."]
}

Каждый примитив — один из типов (координаты в мм, начало 0,0 — левый верх рабочего поля):
- {"type":"line","x1":,"y1":,"x2":,"y2":,"style":"main|thin|dashed|hidden"}
- {"type":"rect","x":,"y":,"w":,"h":,"style":"main"}
- {"type":"circle","cx":,"cy":,"r":,"style":"main"}
- {"type":"arc","cx":,"cy":,"r":,"start":,"end":}  (углы в градусах)
- {"type":"axis","x1":,"y1":,"x2":,"y2":}  (осевая, штрих-пунктир)
- {"type":"dim","x1":,"y1":,"x2":,"y2":,"text":"200","offset":-15}  (линейный размер, offset — вынос размерной линии)
- {"type":"diameter","cx":,"cy":,"r":,"text":"∅40"}
- {"type":"text","x":,"y":,"text":"","size":12}

ПРАВИЛА ИНЖЕНЕРА:
1. Деталь располагай в зоне 30..250 мм по X и 30..150 мм по Y (помести компактно по центру рабочего поля).
2. Тела вращения (валы, втулки, оси) черти как прямоугольный контур + горизонтальная осевая через центр. Диаметры обозначай ∅, длины — линейными размерами.
3. Симметричные детали — осевая обязательна.
4. Простановка размеров по ГОСТ 2.307: габариты снаружи, выносные линии не пересекают контур, размерные линии с offset 12..20 мм от контура. Все ключевые размеры проставь.
5. Используй реальные стандартные значения (диаметры, фаски 1×45°, проточки, отверстия).
6. notes — технические требования: неуказанные предельные отклонения, шероховатость, термообработка.
7. Минимум 6 примитивов. Чем детальнее описание — тем подробнее чертёж.

Отвечай ВСЕГДА только JSON-объектом.`;

interface AgentResult {
  success: boolean;
  draft?: AiDraft;
  error?: string;
}

// Извлекает JSON из ответа модели (на случай обёртки в markdown)
function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text.trim();
}

export function useAiDraftAgent() {
  const { generate, isLoading } = useChatGPT({ apiUrl: API_URL });
  const [lastError, setLastError] = useState<string | null>(null);

  const draft = useCallback(async (description: string): Promise<AgentResult> => {
    setLastError(null);
    const result = await generate({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Спроектируй чертёж: ${description}` },
      ],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 2500,
    });

    if (!result.success || !result.content) {
      const err = result.error ?? "Модель не ответила";
      setLastError(err);
      return { success: false, error: err };
    }

    try {
      const jsonStr = extractJson(result.content);
      const parsed = JSON.parse(jsonStr) as AiDraft;
      if (!parsed.primitives || !Array.isArray(parsed.primitives) || parsed.primitives.length === 0) {
        throw new Error("Пустой чертёж");
      }
      return { success: true, draft: parsed };
    } catch {
      const err = "Не удалось разобрать ответ модели. Попробуйте уточнить описание.";
      setLastError(err);
      return { success: false, error: err };
    }
  }, [generate]);

  return { draft, isLoading, lastError };
}
