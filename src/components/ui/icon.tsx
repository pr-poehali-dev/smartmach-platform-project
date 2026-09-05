import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
  fallback?: string;
}

/**
 * Набор иконок как словарь по имени.
 * Модуль экспортирует не только компоненты, поэтому прямое приведение
 * к Record не проходит проверку — нужен промежуточный unknown.
 */
const ICONS = LucideIcons as unknown as Record<string, React.FC<LucideProps>>;

const Icon: React.FC<IconProps> = ({ name, fallback = 'CircleAlert', ...props }) => {
  const IconComponent = ICONS[name];

  if (!IconComponent) {
    // Если иконка не найдена, используем fallback иконку
    const FallbackIcon = ICONS[fallback];

    // Если даже fallback не найден, возвращаем пустой span
    if (!FallbackIcon) {
      return <span className="text-xs text-gray-400">[icon]</span>;
    }

    return <FallbackIcon {...props} />;
  }

  return <IconComponent {...props} />;
};

export default Icon;