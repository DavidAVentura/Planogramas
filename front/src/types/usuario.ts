/** Perfil del usuario en el módulo, tal como lo devuelve CAO (`perfiles[]` de validar_token). */
export interface PerfilUsuario {
  codigo: string;
  nombre: string;
  permisos: string[];
}

export interface CapacidadesUsuario {
  /** Regla A del back: tiene todos PLA001–PLA008. */
  analista: boolean;
  /** PLA009 o PLA010. */
  implementador: boolean;
}

/** Usuario de la sesión, tal como lo normaliza el backend a partir de la validación en CAO
 * (ver back/src/infrastructure/cao/caoAuthClient.js). `numeroEmpleado` es el `user` de CAO y
 * `nombre` su `username` (nombre completo). */
export interface UsuarioSesion {
  id?: string | number;
  numeroEmpleado?: string;
  usuario?: string;
  nombre?: string;
  correo?: string;
  perfiles?: PerfilUsuario[];
  /** Unión de los permisos de todos los perfiles del módulo PLANOGRAMA (ej. "PLA001"). */
  permisos: string[];
  capacidades: CapacidadesUsuario;
  /** Tiendas del usuario en CAO; aún no se usan para filtrar. */
  tiendas?: unknown[];
}
