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
    <nav
      aria-label="Хлебные крошки"
      className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap"
      itemScope
      itemType="https://schema.org/BreadcrumbList"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span
            key={i}
            className="flex items-center gap-1"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            {i > 0 && (
              <Icon name="ChevronRight" size={14} className="text-muted-foreground/50 shrink-0" aria-hidden="true" />
            )}

            {isLast ? (
              <span
                className="text-foreground font-medium"
                itemProp="name"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                itemProp="name"
              >
                {item.label}
              </button>
            )}

            <meta itemProp="position" content={String(i + 1)} />
          </span>
        );
      })}
    </nav>
  );
}
