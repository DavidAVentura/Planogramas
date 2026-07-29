import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  titulo: string;
  hint?: string;
  accion?: ReactNode;
}

export function EmptyState({ titulo, hint, accion }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__titulo">{titulo}</div>
      {hint && <div className="empty-state__hint">{hint}</div>}
      {accion}
    </div>
  );
}
