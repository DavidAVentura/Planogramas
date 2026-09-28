// Preferencias del rol Implementador guardadas en este navegador (localStorage). Si localStorage no
// está disponible o el valor guardado es inválido, se usa el valor por defecto.
import {
  validarPreferencias,
  type PreferenciasColumnas,
} from '../domain/implementacion/columnasProductos';
import type { TiendaImplementador } from '../types/implementacion';

const CLAVE_TIENDA = 'planogramas.tiendaImplementador';
const CLAVE_COLUMNAS = 'planogramas.implementador.productos.columnas';

function leerJson(clave: string): unknown {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin localStorage la preferencia solo dura esta sesión.
  }
}

// ─── Tienda del Implementador ────────────────────────────────────────────────

export function cargarTiendaImplementador(): TiendaImplementador | null {
  const datos = leerJson(CLAVE_TIENDA) as Partial<TiendaImplementador> | null;
  if (!datos || typeof datos !== 'object') return null;
  const { id, codigo, nombre } = datos;
  if (!Number.isInteger(id) || (id as number) <= 0 || typeof codigo !== 'string' || typeof nombre !== 'string') {
    return null;
  }
  return { id: id as number, codigo, nombre };
}

export function guardarTiendaImplementador(tienda: TiendaImplementador | null) {
  escribir(CLAVE_TIENDA, tienda && { id: tienda.id, codigo: tienda.codigo, nombre: tienda.nombre });
}

// ─── Columnas de la tabla Productos ──────────────────────────────────────────

export function cargarPreferenciasColumnas(): PreferenciasColumnas {
  return validarPreferencias(leerJson(CLAVE_COLUMNAS));
}

export function guardarPreferenciasColumnas(prefs: PreferenciasColumnas) {
  escribir(CLAVE_COLUMNAS, prefs);
}
