import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OPCIONES_POR_MODO } from '../constants/navegacion';
import { rutaInicio } from '../domain/permisos/permisos';

/** Ruta `/`: manda a la primera pantalla visible del modo activo del usuario. */
export function RedirigirInicio() {
  const { usuario, rol } = useAuth();
  const destino = rol ? rutaInicio(OPCIONES_POR_MODO[rol], usuario) : null;
  // Sin destino no se redirige (evita un bucle a `/`); RequiereSesion ya cubre el caso sin modos.
  return destino ? <Navigate replace to={destino} /> : null;
}
