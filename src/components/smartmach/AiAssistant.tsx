import { useState, useRef, useEffect, FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { useChatGPT } from "@/components/extensions/chatgpt-polza/useChatGPT";

const API_URL = "https://functions.poehali.dev/20be73af-7ca5-49c5-b5a2-7ab1a35cc5b5";
const MODEL = "openai/gpt-4o-mini";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantProps {
  systemPrompt: string;
  suggestions?: string[];
  title?: string;
}

export default function AiAssistant({
  systemPrompt,
  suggestions = [],
  title = "ИИ-помощник",
}: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { generate, isLoading } = useChatGPT({ apiUrl: API_URL });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);

    const apiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    const result = await generate({ messages: apiMessages, model: MODEL, temperature: 0.7 });

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success && result.content
          ? result.content
          : `Ошибка: ${result.error ?? "нет ответа"}`,
      },
    ]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Кнопка-триггер */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={title}
        className={`fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all
          ${open ? "bg-foreground text-background scale-95" : "bg-primary text-primary-foreground hover:scale-105"}`}
        style={{ width: 52, height: 52 }}
      >
        <Icon name={open ? "X" : "Sparkles"} size={22} />
      </button>

      {/* Панель */}
      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
          style={{ height: 520 }}>

          {/* Шапка */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Icon name="Sparkles" size={14} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <div className="text-xs text-muted-foreground">Нейросетевой помощник · СмартМаш</div>
            </div>
            {hasMessages && (
              <button onClick={() => setMessages([])}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary/60 transition-colors">
                Сбросить
              </button>
            )}
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!hasMessages ? (
              <div className="pt-2 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Icon name="Sparkles" size={22} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Чем могу помочь?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Задайте вопрос или выберите подсказку</p>
                </div>
                {suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => send(s)}
                        className="w-full text-left text-xs bg-secondary/50 hover:bg-secondary border border-border rounded-lg px-3 py-2 text-foreground transition-colors leading-relaxed">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 mr-1.5">
                        <Icon name="Sparkles" size={11} className="text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 mr-1.5">
                      <Icon name="Sparkles" size={11} className="text-primary" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Ввод */}
          <div className="border-t border-border p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Напишите вопрос…"
                disabled={isLoading}
                className="flex-1 text-sm px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-60 min-w-0" />
              <button type="submit" disabled={isLoading || !input.trim()}
                className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 flex-shrink-0 transition-opacity">
                <Icon name="Send" size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}