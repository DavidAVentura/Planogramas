import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Toast, type ToastTipo } from '../components/ui/Toast/Toast';
import './ToastContext.css';

interface ToastItem {
  id: number;
  mensaje: string;
  tipo: ToastTipo;
}

interface ToastContextValue {
  mostrarToast: (mensaje: string, tipo?: ToastTipo) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURACION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const proximoId = useRef(1);

  const cerrarToast = useCallback((id: number) => {
    setToasts((actual) => actual.filter((t) => t.id !== id));
  }, []);

  const mostrarToast = useCallback((mensaje: string, tipo: ToastTipo = 'info') => {
    const id = proximoId.current++;
    setToasts((actual) => [...actual, { id, mensaje, tipo }]);
    setTimeout(() => cerrarToast(id), DURACION_MS);
  }, [cerrarToast]);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <Toast key={t.id} mensaje={t.mensaje} tipo={t.tipo} onClose={() => cerrarToast(t.id)} />
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
