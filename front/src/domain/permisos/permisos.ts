// Permisos CAO del módulo PLANOGRAMA y reglas de acceso del front. Lógica pura, sin React.
// Los guards del front son cosméticos: la autorización real vive en el back (403).
import type { UsuarioSesion } from '../../types/usuario';

export const PERMISOS = {
  EDITAR_ESTRUCTURA: 'PLA001',
  CREAR_PLANOGRAMA: 'PLA002',
  EDITAR_PLANOGRAMA: 'PLA003',
  CREAR_VERSION: 'PLA004',
  EDITAR_VERSION: 'PLA005',
  EDITAR_LIENZO: 'PLA006',
  CREAR_TIENDA: 'PLA007',
  EDITAR_TIENDA: 'PLA008',
  MI_TIENDA: 'PLA009',
  PRODUCTOS_TIENDA: 'PLA010',
} as const;

export type CodigoPermiso = (typeof PERMISOS)[keyof typeof PERMISOS];
export type Modo = 'analista' | 'implementador';

export interface ReglaAcceso {
  /** Exige la capacidad de analista que calcula el back (regla A). */
  analista?: boolean;
  /** Basta con uno de estos permisos. */
  algunoDe?: readonly CodigoPermiso[];
}

export const REGLAS = {
  analista: { analista: true },
  estructura: { analista: true, algunoDe: ['PLA001'] },
  lienzo: { analista: true, algunoDe: ['PLA006'] },
  miTienda: { algunoDe: ['PLA009'] },
  productosTienda: { algunoDe: ['PLA010'] },
} as const satisfies Record<string, ReglaAcceso>;

export interface OpcionNavegacion {
  etiqueta: string;
  ruta: string;
  regla: ReglaAcceso;
  /** Solo activa en la ruta exacta (no en sus subrutas). */
  exacta?: boolean;
}

const MODOS: readonly Modo[] = ['analista', 'implementador'];

export function tienePermiso(usuario: UsuarioSesion | null, codigo: CodigoPermiso): boolean {
  return !!usuario && Array.isArray(usuario.permisos) && usuario.permisos.includes(codigo);
}

export function cumpleRegla(usuario: UsuarioSesion | null, regla: ReglaAcceso): boolean {
  if (!usuario) return false;
  if (regla.analista && usuario.capacidades?.analista !== true) return false;
  if (regla.algunoDe && !regla.algunoDe.some((c) => tienePermiso(usuario, c))) return false;
  return true;
}

export function modosDisponibles(usuario: UsuarioSesion | null): Modo[] {
  if (!usuario) return [];
  const modos: Modo[] = [];
  if (usuario.capacidades?.analista === true) modos.push('analista');
  if (tienePermiso(usuario, PERMISOS.MI_TIENDA) || tienePermiso(usuario, PERMISOS.PRODUCTOS_TIENDA)) {
    modos.push('implementador');
  }
  return modos;
}

/** Modo al que pertenece una ruta; `null` en la raíz y en /auth (no deciden modo). */
export function modoDeRuta(pathname: string): Modo | null {
  if (pathname === '/' || pathname === '/auth') return null;
  if (pathname === '/mi-tienda' || pathname.startsWith('/mi-tienda/')) return 'implementador';
  return 'analista';
}

/** El modo elegido si está disponible; si no, analista si existe; si no, el primero. */
export function resolverModo(modos: Modo[], elegido: Modo | null): Modo | null {
  if (elegido && modos.includes(elegido)) return elegido;
  if (modos.includes('analista')) return 'analista';
  return modos[0] ?? null;
}

/** Modo inicial: manda la ruta actual; si no, el guardado en sessionStorage (si es válido). */
export function modoInicial(pathname: string, guardado: string | null): Modo | null {
  const deRuta = modoDeRuta(pathname);
  if (deRuta) return deRuta;
  return MODOS.find((m) => m === guardado) ?? null;
}

/** Ruta de la primera opción de navegación que el usuario puede ver. */
export function rutaInicio(
  opciones: readonly OpcionNavegacion[],
  usuario: UsuarioSesion | null,
): string | null {
  return opciones.find((o) => cumpleRegla(usuario, o.regla))?.ruta ?? null;
}
