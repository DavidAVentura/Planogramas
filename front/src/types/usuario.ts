/** Perfil del usuario en el módulo, tal como lo devuelve CAO (`perfiles[]` de validar_token). */
export interface PerfilUsuario {
  codigo: string;
  nombre: string;
  permisos: string[];
}

/** Usuario de la sesión, tal como lo normaliza el backend a partir de la validación en CAO
 * (ver back/src/infrastructure/cao/caoAuthClient.js). `numeroEmpleado` es el `user` de CAO y
 * `nombre` su `username` (nombre completo). `cao` es la respuesta cruda de CAO, sin el token. */
export interface UsuarioSesion {
  id?: string | number;
  numeroEmpleado?: string;
  usuario?: string;
  nombre?: string;
  correo?: string;
  perfiles?: PerfilUsuario[];
  /** Unión de los permisos de todos los perfiles (ej. "SCP002"). */
  permisos: string[];
  /** Tiendas del usuario en CAO; hoy llega vacío. */
  tiendas?: unknown[];
  cao: unknown;
}
