import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sesionService } from '../services/sesion.service';
import { PantallaAcceso } from '../pages/Acceso/PantallaAcceso';
import { SesionRequerida } from '../pages/SesionRequerida/SesionRequerida';

/** Guard global: sin sesión CAO válida no se renderiza ninguna pantalla de la app. */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { estado } = useAuth();
  const { pathname, search } = useLocation();

  // Se recuerda a dónde quería entrar el usuario para retomarlo después de /auth.
  useEffect(() => {
    if (estado === 'no_autenticado') sesionService.recordarRutaDestino(`${pathname}${search}`);
  }, [estado, pathname, search]);

  if (estado === 'verificando') {
    return <PantallaAcceso cargando titulo="Validando acceso…" />;
  }
  if (estado === 'no_autenticado') return <SesionRequerida />;

  return children;
}
