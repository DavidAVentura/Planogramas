import { ApiError } from '../services/httpClient';

export function mensajeDeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    // Texto estándar para los 403: el back responde sin detalle de la regla (ver autorizacion.js).
    if (err.status === 403) return 'No tienes permiso para esta acción.';
    return err.message || fallback;
  }
  return fallback;
}
