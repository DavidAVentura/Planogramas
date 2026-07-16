import type { CSSProperties, ReactNode } from 'react';
import './Badge.css';

interface BadgeProps {
  children: ReactNode;
  bg: string;
  color: string;
}

export function Badge({ children, bg, color }: BadgeProps) {
  const estilo = { '--badge-bg': bg, '--badge-color': color } as CSSProperties;
  return (
    <span className="badge" style={estilo}>
      {children}
    </span>
  );
}
