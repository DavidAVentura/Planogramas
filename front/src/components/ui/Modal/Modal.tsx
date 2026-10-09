import type { ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  titulo: string;
  /** Tooltip del título (ej. la descripción completa del planograma). */
  tituloTooltip?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  ancho?: 'sm' | 'md' | 'lg' | 'xl';
  claseModal?: string;
}

export function Modal({ titulo, tituloTooltip, onClose, children, footer, ancho = 'md', claseModal }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal modal--${ancho}${claseModal ? ` ${claseModal}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <span className="modal__titulo" title={tituloTooltip}>
            {titulo}
          </span>
          <button type="button" className="modal__cerrar" onClick={onClose} aria-label="Cerrar">
            &times;
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
