import { Link } from 'react-router-dom';
import './Toast.css';

export type ToastTipo = 'success' | 'error' | 'info';

/** Enlace opcional dentro del aviso (ej. "Ver en Estructura"). */
export interface ToastAccion {
  etiqueta: string;
  to: string;
}

interface ToastProps {
  mensaje: string;
  tipo: ToastTipo;
  accion?: ToastAccion;
  onClose: () => void;
}

export function Toast({ mensaje, tipo, accion, onClose }: ToastProps) {
  return (
    <div className={`toast toast--${tipo}`} role="status">
      <span>{mensaje}</span>
      {accion && (
        <Link className="toast__accion" to={accion.to} onClick={onClose}>
          {accion.etiqueta}
        </Link>
      )}
      <button type="button" className="toast__cerrar" onClick={onClose} aria-label="Cerrar">
        &times;
      </button>
    </div>
  );
}
