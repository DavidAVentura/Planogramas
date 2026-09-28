import { sesionService } from './sesion.service';

// Interceptor de autenticación del httpClient: agrega el JWT CAO a cada request hacia el
// backend y, si el backend responde 401, invalida la sesión — AuthContext escucha esa
// invalidación y el guard bloquea toda la app.

export const authInterceptor = {
  alEnviar(headers: Record<string, string>): Record<string, string> {
    const token = sesionService.obtenerToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  },

  alRecibir(response: Response): Response {
    if (response.status === 401) sesionService.invalidar();
    return response;
  },
};
