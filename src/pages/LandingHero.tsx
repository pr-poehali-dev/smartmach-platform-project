import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { FONT, MODULES } from "./landing.data";

/* ── NavBar ──────────────────────────────────────────────────── */

function NavBar({ onEnter }: { onEnter: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/97 shadow-sm border-b border-border" : "bg-transparent"}`}
      style={{ backdropFilter: scrolled ? "blur(8px)" : "none" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="Settings" size={16} className="text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground text-base tracking-tight" style={FONT}>СмартМаш</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2" style={FONT}>от ООО «МАТ-Лабс»</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" style={FONT}>
          <a href="#challenges" className="hover:text-foreground transition-colors">Задачи</a>
          <a href="#modules"    className="hover:text-foreground transition-colors">Модули</a>
          <a href="#niocr"      className="hover:text-foreground transition-colors">НИОКР</a>
          <a href="#about"      className="hover:text-foreground transition-colors">О компании</a>
          <a href="#contact"    className="hover:text-foreground transition-colors">Контакты</a>
        </nav>
        <button onClick={onEnter}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          style={FONT}>
          Открыть систему
          <Icon name="ArrowRight" size={14} />
        </button>
      </div>
    </header>
  );
}

/* ── SectionLabel ────────────────────────────────────────────── */

export function SectionLabel({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4 ${
        light
          ? "bg-white/10 text-white border border-white/20"
          : "bg-primary/8 text-primary border border-primary/20"
      }`}
      style={FONT}
    >
      <Icon name="Sparkles" size={11} />
      {text}
    </div>
  );
}

/* ── LandingHero ─────────────────────────────────────────────── */

interface LandingHeroProps {
  onEnter: () => void;
}

export default function LandingHero({ onEnter }: LandingHeroProps) {
  return (
    <>
      <NavBar onEnter={onEnter} />

      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 text-primary rounded-full px-3 py-1.5 text-xs font-semibold mb-6" style={FONT}>
              <Icon name="Building2" size={13} />
              Продукт ООО «МАТ-Лабс» · Российское программное обеспечение
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6" style={FONT}>
              Цифровая система<br />
              <span className="text-primary">управления производством</span><br />
              в станкостроении
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              «СмартМаш» решает фундаментальную проблему станкостроения — разрыв между контурами
              конструкторской документации, расчётов, управляющих программ и исполнения. Единая
              цифровая модель изделия обеспечивает автоматическую валидацию согласованности данных
              на каждом переходе и полную трассируемость изменений по стадиям жизненного цикла.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onEnter}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                style={FONT}>
                <Icon name="Play" size={16} />
                Открыть демонстрационную версию
              </button>
              <a href="#contact"
                className="flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-secondary/60 transition-colors"
                style={FONT}>
                Оставить заявку
                <Icon name="ArrowRight" size={16} />
              </a>
            </div>
          </div>

          {/* Фото производства */}
          <div className="mt-16 relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
              <img
                src="https://cdn.poehali.dev/projects/4a414f55-f964-427a-bda6-0016a78c34e4/files/fc1dca18-a962-423e-a0bc-56a25c8a2a69.jpg"
                alt="Современное машиностроительное производство с ЧПУ-станками"
                className="w-full h-[420px] object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-primary/10 blur-xl rounded-full" />
          </div>
        </div>
      </section>
    </>
  );
}