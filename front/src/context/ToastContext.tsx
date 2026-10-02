import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Toast, type ToastAccion, type ToastTipo } from '../components/ui/Toast/Toast';
import './ToastContext.css';

interface ToastItem {
  id: number;
  mensaje: string;
  tipo: ToastTipo;
  accion?: ToastAccion;
}

interface ToastContextValue {
  mostrarToast: (mensaje: string, tipo?: ToastTipo, accion?: ToastAccion) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 4000;
// Con un enlace se deja más tiempo para alcanzar a usarlo.
const DURACION_CON_ACCION_MS = 8000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const proximoId = useRef(1);

  const cerrarToast = useCallback((id: number) => {
    setToasts((actual) => actual.filter((t) => t.id !== id));
  }, []);

  const mostrarToast = useCallback((mensaje: string, tipo: ToastTipo = 'info', accion?: ToastAccion) => {
    const id = proximoId.current++;
    setToasts((actual) => [...actual, { id, mensaje, tipo, accion }]);
    setTimeout(() => cerrarToast(id), accion ? DURACION_CON_ACCION_MS : DURACION_MS);
  }, [cerrarToast]);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <Toast key={t.id} mensaje={t.mensaje} tipo={t.tipo} accion={t.accion} onClose={() => cerrarToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return context;
}
