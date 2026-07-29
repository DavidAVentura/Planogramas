import { ApiError } from '../services/httpClient';

export function mensajeDeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}
