import './Toast.css';

export type ToastTipo = 'success' | 'error' | 'info';

interface ToastProps {
  mensaje: string;
  tipo: ToastTipo;
  onClose: () => void;
}

export function Toast({ mensaje, tipo, onClose }: ToastProps) {
  return (
    <div className={`toast toast--${tipo}`} role="status">
      <span>{mensaje}</span>
      <button type="button" className="toast__cerrar" onClick={onClose} aria-label="Cerrar">
        &times;
      </button>
    </div>
  );
}
