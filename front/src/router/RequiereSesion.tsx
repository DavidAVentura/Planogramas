import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sesionService } from '../services/sesion.service';
import { PantallaAcceso } from '../pages/Acceso/PantallaAcceso';
import { SesionRequerida } from '../pages/SesionRequerida/SesionRequerida';
import { SinAcceso } from '../pages/SinAcceso/SinAcceso';

/** Guard global: sin sesión CAO válida no se renderiza ninguna pantalla de la app. */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { estado, modos } = useAuth();
  const { pathname, search } = useLocation();

  // Se recuerda a dónde quería entrar el usuario para retomarlo después de /auth.
  useEffect(() => {
    if (estado === 'no_autenticado') sesionService.recordarRutaDestino(`${pathname}${search}`);
  }, [estado, pathname, search]);

  if (estado === 'verificando') {
    return <PantallaAcceso cargando titulo="Validando acceso…" />;
  }
  if (estado === 'no_autenticado') return <SesionRequerida />;
  // Autenticado en CAO pero sin permisos del módulo: no hay navbar ni rutas que mostrar.
  if (modos.length === 0) return <SinAcceso />;

  return children;
}
