import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OPCIONES_POR_MODO } from '../constants/navegacion';
import { cumpleRegla, rutaInicio, type Modo, type ReglaAcceso } from '../domain/permisos/permisos';

interface RequierePermisoProps {
  regla: ReglaAcceso;
  /** Modo al que pertenece la pantalla; si el usuario lo tiene, pasa a ser el modo activo. */
  modo: Modo;
  children: ReactNode;
}

/**
 * Guard de ruta cosmético (la autorización real es la del back): si el usuario no cumple la regla
 * lo manda al inicio de su modo con un aviso. Una pantalla de otro modo cambia el modo activo.
 */
export function RequierePermiso({ regla, modo, children }: RequierePermisoProps) {
  const { usuario, rol, modos, setRol } = useAuth();
  const { mostrarToast } = useToast();
  const avisado = useRef(false);
  const permitido = cumpleRegla(usuario, regla);

  useEffect(() => {
    if (!permitido && !avisado.current) {
      avisado.current = true;
      mostrarToast('No tienes acceso a esa pantalla.', 'info');
    }
  }, [permitido, mostrarToast]);

  useEffect(() => {
    if (permitido && modo !== rol && modos.includes(modo)) setRol(modo);
  }, [permitido, modo, rol, modos, setRol]);

  if (!permitido) {
    const destino = rol ? rutaInicio(OPCIONES_POR_MODO[rol], usuario) : null;
    return <Navigate replace to={destino ?? '/'} />;
  }
  return children;
}
