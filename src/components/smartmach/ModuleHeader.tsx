import { ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface ModuleHeaderProps {
  /** Иконка lucide в коробке слева */
  icon: string;
  /** Заголовок экрана */
  title: string;
  /** Подзаголовок-описание */
  subtitle?: string;
  /** Надзаголовок (мелкий тег сверху, uppercase) */
  eyebrow?: string;
  /** Слот для кнопок/действий справа */
  actions?: ReactNode;
}

/**
 * ModuleHeader — единая шапка для всех модулей платформы.
 * Гарантирует одинаковую типографику, отступы и расположение действий.
 */
export default function ModuleHeader({ icon, title, subtitle, eyebrow, actions }: ModuleHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
          <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={19} className="text-primary" />
        </div>
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">
              {eyebrow}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
