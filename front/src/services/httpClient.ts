import { API_BASE_URL } from '../config/env';
import { authInterceptor } from './authInterceptor.service';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function enviar(method: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> =
    options.body !== undefined ? { 'Content-Type': 'application/json' } : {};

  return fetch(buildUrl(path, options.query), {
    method,
    headers: authInterceptor.alEnviar(headers),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
    .catch(() => {
      throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor');
    })
    .then(authInterceptor.alRecibir);
}

function errorDeRespuesta(response: Response, payload: { error?: Record<string, unknown> } | null): ApiError {
  const error = payload?.error ?? {};
  return new ApiError(
    response.status,
    (error.code as string) ?? 'ERROR',
    (error.message as string) ?? 'Error inesperado',
    error.details,
  );
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await enviar(method, path, options);

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) throw errorDeRespuesta(response, payload);

  return payload as T;
}

/** POST con body JSON y respuesta binaria (ej. audio del TTS). Los errores siguen llegando como
 * JSON `{ error }` y se convierten en ApiError igual que en `request`. */
async function requestBinario(method: string, path: string, body?: unknown): Promise<Blob> {
  const response = await enviar(method, path, { body });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw errorDeRespuesta(response, payload);
  }

  return response.blob();
}

export const httpClient = {
  get:    <T>(path: string, query?: RequestOptions['query']) => request<T>('GET', path, { query }),
  post:   <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  getBinario: (path: string) => requestBinario('GET', path),
  postBinario: (path: string, body?: unknown) => requestBinario('POST', path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put:    <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string, query?: RequestOptions['query']) => request<T>('DELETE', path, { query }),
};
