// Filtros del Consolidado Tiendas: query del listado y de la descarga, contador del embudo, chips del
// modo extendido, filas estimadas y mensajes de error. Lógica pura, sin React.
import { ApiError } from '../../services/httpClient';
import type {
  FiltrosConsolidado,
  FormatoDescarga,
  OrdenConsolidado,
  ResumenConsolidado,
  VistaConsolidado,
} from '../../types/consolidado';
import type { FiltroJerarquia } from '../../types/producto';
import { CLAVES_COLUMNA_CONSOLIDADO } from './columnasConsolidado';

export type QueryConsolidado = Record<string, string | number | boolean | undefined>;

export const FILTROS_CONSOLIDADO_INICIALES: FiltrosConsolidado = {
  tiendaIds: [],
  versionIds: [],
  estados: [],
  busqueda: '',
  soloDuplicados: false,
};

export const TAMANOS_PAGINA_CONSOLIDADO = [25, 50, 100, 200];
export const TAMANO_PAGINA_INICIAL = 50;

/** Orden fijo de las hojas del libro (el del servidor). */
export const HOJAS_CONSOLIDADO: VistaConsolidado[] = ['PLANOGRAMA', 'CROSS', 'IMPULSO'];

const csv = (valores: readonly (string | number)[]) => (valores.length > 0 ? valores.join(',') : undefined);

/** "Solo con más de un planograma" solo aplica en la vista Planograma. */
export function filtrosEfectivos(filtros: FiltrosConsolidado, vista: VistaConsolidado): FiltrosConsolidado {
  return filtros.soloDuplicados && vista !== 'PLANOGRAMA' ? { ...filtros, soloDuplicados: false } : filtros;
}

/** Niveles de la jerarquía CATI, del más específico al más general. */
const NIVELES_ESPECIFICO_PRIMERO: (keyof FiltroJerarquia)[] = ['subcategoria', 'categoria', 'familia', 'departamento', 'area'];

/** El nivel más específico elegido de la jerarquía (el único que el servidor usa), o `{}`. */
function parametroJerarquia(jerarquia: FiltroJerarquia): QueryConsolidado {
  const campo = NIVELES_ESPECIFICO_PRIMERO.find((c) => jerarquia[c] !== '');
  return campo ? { [campo]: jerarquia[campo] } : {};
}

function parametrosComunes(filtros: FiltrosConsolidado, jerarquia: FiltroJerarquia): QueryConsolidado {
  return {
    tiendaIds: csv(filtros.tiendaIds),
    versionIds: csv(filtros.versionIds),
    estados: csv(filtros.estados),
    ...parametroJerarquia(jerarquia),
    busqueda: filtros.busqueda.trim() || undefined,
  };
}

/** Query del listado: omite vacíos y valores por defecto; `soloDuplicados` solo en la vista Planograma. */
export function construirQueryListado(
  filtros: FiltrosConsolidado,
  jerarquia: FiltroJerarquia,
  vista: VistaConsolidado,
  page: number,
  pageSize: number,
  orden: OrdenConsolidado,
  direccion: 'asc' | 'desc',
): QueryConsolidado {
  return {
    ...parametrosComunes(filtros, jerarquia),
    soloDuplicados: vista === 'PLANOGRAMA' && filtros.soloDuplicados ? true : undefined,
    vista: vista === 'PLANOGRAMA' ? undefined : vista,
    page: page > 1 ? page : undefined,
    pageSize: pageSize !== TAMANO_PAGINA_INICIAL ? pageSize : undefined,
    orden: orden === 'sku' ? undefined : orden,
    direccion: direccion === 'asc' ? undefined : direccion,
  };
}

/**
 * Query de la descarga: los filtros, el formato y las columnas (solo claves de la lista blanca, sin
 * repetidas, en el orden dado). Nunca lleva vista, página ni orden; `hojas` solo con HOJAS.
 */
export function construirQueryExportacion(
  filtros: FiltrosConsolidado,
  jerarquia: FiltroJerarquia,
  formato: FormatoDescarga,
  hojas: readonly VistaConsolidado[],
  columnas: readonly string[],
): QueryConsolidado {
  const validas = [...new Set(columnas)].filter((c) => (CLAVES_COLUMNA_CONSOLIDADO as readonly string[]).includes(c));
  return {
    ...parametrosComunes(filtros, jerarquia),
    soloDuplicados: filtros.soloDuplicados ? true : undefined,
    formato,
    hojas: formato === 'HOJAS' ? csv(HOJAS_CONSOLIDADO.filter((h) => hojas.includes(h))) : undefined,
    columnas: csv(validas),
  };
}

// ─── Embudo y chips ──────────────────────────────────────────────────────────

export const hayJerarquia = (jerarquia: FiltroJerarquia) => NIVELES_ESPECIFICO_PRIMERO.some((c) => jerarquia[c] !== '');

/** Cada filtro cuenta una vez (la jerarquía también, sin importar cuántos niveles tenga). */
export function contarFiltrosActivos(filtros: FiltrosConsolidado, jerarquia: FiltroJerarquia): number {
  return [
    filtros.tiendaIds.length > 0,
    filtros.versionIds.length > 0,
    filtros.estados.length > 0,
    hayJerarquia(jerarquia),
    filtros.busqueda.trim() !== '',
    filtros.soloDuplicados,
  ].filter(Boolean).length;
}

export type QuitarFiltro =
  | { campo: 'tiendaIds'; id?: number }
  | { campo: 'versionIds'; id?: number }
  | { campo: 'estados' }
  | { campo: 'jerarquia' }
  | { campo: 'busqueda' }
  | { campo: 'soloDuplicados' };

export interface ChipFiltro {
  id: string;
  texto: string;
  titulo?: string;
  /** `null` = chip informativo sin ✕ (la vista). */
  quitar: QuitarFiltro | null;
}

export interface NombresFiltros {
  tiendas: ReadonlyMap<number, string>;
  versiones: ReadonlyMap<number, string>;
  /** Nombres de los niveles elegidos de la jerarquía, de Área hacia abajo. */
  jerarquia: readonly string[];
}

export const ETIQUETA_VISTA: Record<VistaConsolidado, string> = {
  PLANOGRAMA: 'Planograma',
  CROSS: 'Solo cross',
  IMPULSO: 'Solo impulso',
};

const ETIQUETA_ESTADO: Record<string, string> = { publicado: 'Publicada', piloto: 'Piloto' };

/** Hasta 2 valores se listan uno por uno; con 3 o más se agrupan (`Tiendas: 4`, con ✕ que quita todos). */
function chipsLista(
  campo: 'tiendaIds' | 'versionIds',
  singular: string,
  plural: string,
  ids: readonly number[],
  nombres: ReadonlyMap<number, string>,
): ChipFiltro[] {
  const nombreDe = (id: number) => nombres.get(id) ?? String(id);
  if (ids.length === 0) return [];
  if (ids.length < 3) return ids.map((id) => ({ id: `${campo}-${id}`, texto: `${singular}: ${nombreDe(id)}`, quitar: { campo, id } }));
  return [{ id: campo, texto: `${plural}: ${ids.length}`, titulo: ids.map(nombreDe).join(', '), quitar: { campo } }];
}

/** Chips de los filtros activos para la barra colapsada del modo extendido; la vista va como chip sin ✕. */
export function chipsFiltrosActivos(
  filtros: FiltrosConsolidado,
  jerarquia: FiltroJerarquia,
  vista: VistaConsolidado,
  nombres: NombresFiltros,
): ChipFiltro[] {
  const chips: ChipFiltro[] = [
    ...chipsLista('tiendaIds', 'Tienda', 'Tiendas', filtros.tiendaIds, nombres.tiendas),
    ...chipsLista('versionIds', 'Versión', 'Versiones', filtros.versionIds, nombres.versiones),
  ];
  if (filtros.estados.length > 0) {
    const texto = filtros.estados.map((e) => ETIQUETA_ESTADO[e] ?? e).join(' y ');
    chips.push({ id: 'estados', texto: `Estado: ${texto}`, quitar: { campo: 'estados' } });
  }
  if (hayJerarquia(jerarquia)) {
    const ruta = nombres.jerarquia.length > 0 ? nombres.jerarquia.join(' › ') : 'filtrada';
    chips.push({ id: 'jerarquia', texto: `Jerarquía: ${ruta}`, titulo: ruta, quitar: { campo: 'jerarquia' } });
  }
  if (filtros.busqueda.trim()) {
    chips.push({ id: 'busqueda', texto: `Búsqueda: ${filtros.busqueda.trim()}`, quitar: { campo: 'busqueda' } });
  }
  if (filtros.soloDuplicados) {
    chips.push({ id: 'soloDuplicados', texto: 'Más de un planograma', quitar: { campo: 'soloDuplicados' } });
  }
  if (vista !== 'PLANOGRAMA') chips.push({ id: 'vista', texto: `Vista: ${ETIQUETA_VISTA[vista]}`, quitar: null });
  return chips;
}

/** Aplica un ✕ a los filtros (la jerarquía la limpia la página: vive aparte). */
export function quitarDeFiltros(filtros: FiltrosConsolidado, quitar: QuitarFiltro): FiltrosConsolidado {
  switch (quitar.campo) {
    case 'tiendaIds':
      return { ...filtros, tiendaIds: quitar.id === undefined ? [] : filtros.tiendaIds.filter((id) => id !== quitar.id) };
    case 'versionIds':
      return { ...filtros, versionIds: quitar.id === undefined ? [] : filtros.versionIds.filter((id) => id !== quitar.id) };
    case 'estados':
      return { ...filtros, estados: [] };
    case 'busqueda':
      return { ...filtros, busqueda: '' };
    case 'soloDuplicados':
      return { ...filtros, soloDuplicados: false };
    case 'jerarquia':
      return filtros;
  }
}

// ─── Descarga ────────────────────────────────────────────────────────────────

/** Filas que traería la descarga con los filtros actuales (la vista no la limita; el formato sí). */
export function filasEstimadas(
  formato: FormatoDescarga,
  hojas: readonly VistaConsolidado[],
  conteos: ResumenConsolidado['conteos'],
): number {
  if (formato === 'AGREGADO') return conteos.AGREGADO;
  if (formato === 'HOJAS') return HOJAS_CONSOLIDADO.filter((h) => hojas.includes(h)).reduce((s, h) => s + conteos[h], 0);
  return conteos.PLANOGRAMA + conteos.CROSS + conteos.IMPULSO;
}

const NOMBRE_POR_FORMATO: Record<FormatoDescarga, string> = { DETALLADO: 'detallado', AGREGADO: 'minmax', HOJAS: 'hojas' };

/** `consolidado-tiendas-minmax-20261015.xlsx`: misma regla que el servidor (el front no lee Content-Disposition). */
export function nombreArchivo(formato: FormatoDescarga, fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  const aaaammdd = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  return `consolidado-tiendas-${NOMBRE_POR_FORMATO[formato]}-${aaaammdd}.xlsx`;
}

export const MENSAJE_JERARQUIA_NO_DISPONIBLE =
  'La jerarquía no está disponible en este momento. Quita el filtro de jerarquía o inténtalo más tarde.';

const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Texto del toast cuando falla la descarga. */
export function mensajeErrorDescarga(error: ApiError): string {
  if (error.status === 422 && error.code === 'EXPORTACION_DEMASIADO_GRANDE') {
    const d = (error.details ?? {}) as { filas?: unknown; maximo?: unknown };
    if (esNumero(d.filas) && esNumero(d.maximo)) {
      return `La descarga tendría ${d.filas} filas y el máximo es ${d.maximo}. Ajusta los filtros.`;
    }
  }
  if (error.status === 429) return 'Hiciste muchas descargas seguidas. Espera un minuto e inténtalo de nuevo.';
  if (error.status === 503) {
    return error.code === 'EXPORTACION_EN_CURSO' && error.message ? error.message : MENSAJE_JERARQUIA_NO_DISPONIBLE;
  }
  return 'No se pudo generar la descarga. Inténtalo de nuevo.';
}

/** Detalle del estado de error de la tabla (bajo "No se pudo cargar el consolidado"). */
export function detalleErrorListado(error: ApiError): string {
  if (error.status === 503) return MENSAJE_JERARQUIA_NO_DISPONIBLE;
  if (error.status === 400) {
    const detalles = Array.isArray(error.details) ? error.details.filter((d): d is string => typeof d === 'string') : [];
    return [error.message, ...detalles].join(' · ');
  }
  return 'Revisa tu conexión e inténtalo de nuevo.';
}
