import { httpClient } from './httpClient';
import type { UsuarioSesion } from '../types/usuario';

export const authService = {
  /** Valida el token guardado (vía backend → CAO) y devuelve el usuario de la sesión. */
  obtenerSesion: () => httpClient.get<UsuarioSesion>('/auth/sesion'),
};
