import type { ReactNode } from 'react';
import './Drawer.css';

interface DrawerProps {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  ancho?: 'md' | 'lg';
}

export function Drawer({ titulo, onClose, children, footer, ancho = 'md' }: DrawerProps) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className={`drawer drawer--${ancho}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer__header">
          <span className="drawer__titulo">{titulo}</span>
          <button type="button" className="drawer__cerrar" onClick={onClose} aria-label="Cerrar">
            &times;
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__footer">{footer}</div>}
      </div>
    </div>
  );
}
