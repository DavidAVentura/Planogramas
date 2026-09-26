/** Usuario de la sesión, tal como lo normaliza el backend a partir de la validación en CAO
 * (ver back/src/infrastructure/cao/caoAuthClient.js). `cao` es la respuesta cruda de CAO,
 * pendiente de mapear a permisos concretos de la app. */
export interface UsuarioSesion {
  id?: string | number;
  usuario?: string;
  nombre?: string;
  correo?: string;
  permisos: unknown;
  cao: unknown;
}
