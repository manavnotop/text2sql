'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';

interface IconProps {
  icon: IconSvgElement;
  size?: number;
  className?: string;
}

export function HugeIcon({ icon, size = 24, className }: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      className={className}
    />
  );
}