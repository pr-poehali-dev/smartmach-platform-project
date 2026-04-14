import Icon from "@/components/ui/icon";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Хлебные крошки" className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <Icon name="ChevronRight" size={14} className="text-muted-foreground/50 shrink-0" />}
            {isLast ? (
              <span className="text-foreground font-medium">{item.label}</span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-foreground transition-colors hover:underline underline-offset-2"
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
