import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sesionService } from '../../services/sesion.service';
import { ApiError } from '../../services/httpClient';
import { PantallaAcceso } from '../Acceso/PantallaAcceso';
import { SesionRequerida } from '../SesionRequerida/SesionRequerida';

const RUTA_INICIO = '/planogramas';

/**
 * /auth?token=<jwt> — punto de entrada desde CAO. El login ocurre allá; aquí se toma el JWT,
 * se valida contra el backend (que lo introspecciona en CAO) y se abre la sesión.
 */
export function Autenticacion() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const procesado = useRef(false);

  useEffect(() => {
    // StrictMode monta dos veces en desarrollo: el token solo se procesa una vez.
    if (procesado.current) return;
    procesado.current = true;

    const token = params.get('token');
    if (!token) {
      setError('No se recibió un token de acceso.');
      return;
    }

    // Se quita el token de la URL (historial/referrer) antes de validarlo.
    window.history.replaceState(null, '', '/auth');

    iniciarSesion(token)
      .then(() => navigate(sesionService.consumirRutaDestino() ?? RUTA_INICIO, { replace: true }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 503) {
          setError('No se pudo validar la sesión con CAO. Intenta de nuevo en unos minutos.');
        } else {
          setError('El acceso no es válido o expiró.');
        }
      });
  }, [params, navigate, iniciarSesion]);

  if (error) return <SesionRequerida motivo={error} />;

  return <PantallaAcceso cargando titulo="Validando acceso…" mensaje="Estamos verificando tu sesión." />;
}
