import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/httpClient';
import { mensajeDeError } from './errors';

describe('mensajeDeError', () => {
  it('403 usa el texto estándar', () => {
    expect(mensajeDeError(new ApiError(403, 'FORBIDDEN', 'x'), 'fallback')).toBe('No tienes permiso para esta acción.');
  });
  it('otros errores de API conservan su mensaje', () => {
    expect(mensajeDeError(new ApiError(404, 'NOT_FOUND', 'No existe'), 'fallback')).toBe('No existe');
  });
  it('un error que no es de API usa el fallback', () => {
    expect(mensajeDeError(new Error('x'), 'fallback')).toBe('fallback');
  });
});
