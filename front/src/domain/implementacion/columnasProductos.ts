// Columnas de la tabla Productos del Implementador: definición, filtros, orden y preferencias
// (orden/visibilidad). Funciones puras, sin React: la vista solo decide cómo pintar cada celda.
import {
  DECISION_POSICION_META,
  ESTADO_INVENTARIO_META,
  PERFIL_REDONDEO_META,
  type EstadoInventario,
} from '../../constants/implementacion';
import { MODO_APARICION_META, MODOS_APARICION } from '../../constants/productos';
import { DECISIONES_POSICION, PERFILES_REDONDEO } from '../../types/posicion';
import type { ProductoImplementacion } from '../../types/implementacion';
import {
  alternarOrden,
  ordenarAnidado,
  type CriterioOrden,
  type DireccionOrden,
  type ValorOrdenable,
} from '../orden/ordenAnidado';
import { contieneTexto, parsearFiltroNumerico } from './filtrosColumna';

export const CLAVES_COLUMNA = [
  'sku',
  'producto',
  'version',
  'gondola',
  'nivel',
  'orden',
  'ganchos',
  'accesorio',
  'facings',
  'apilable',
  'capacidadFacing',
  'capacidadMaxima',
  'minEstetico',
  'minFinal',
  'maxFinal',
  'perfil',
  'modo',
  'decision',
  'observaciones',
  'sustituto',
  'inventario',
  'estado',
] as const;

export type ClaveColumna = (typeof CLAVES_COLUMNA)[number];
export type CriterioOrdenProducto = CriterioOrden<ClaveColumna>;

export interface OpcionEnum {
  valor: string;
  etiqueta: string;
}

interface ColumnaBase {
  clave: ClaveColumna;
  etiqueta: string;
  /** Ancho mínimo en px; la última columna visible se estira si sobra espacio. */
  ancho: number;
}

interface ColumnaTexto extends ColumnaBase {
  filtro: 'texto';
  texto: (f: ProductoImplementacion) => string;
  orden: (f: ProductoImplementacion) => ValorOrdenable;
}

interface ColumnaNumero extends ColumnaBase {
  filtro: 'numero';
  numero: (f: ProductoImplementacion) => number | null;
}

interface ColumnaEnum extends ColumnaBase {
  filtro: 'enum';
  opciones: OpcionEnum[];
  valor: (f: ProductoImplementacion) => string | null;
}

export type ColumnaProducto = ColumnaTexto | ColumnaNumero | ColumnaEnum;

export function estadoInventario(f: ProductoImplementacion): EstadoInventario | null {
  if (f.conInventario === null) return null;
  return f.conInventario ? 'con' : 'sin';
}

/** "R45-12-212P2 12"" — un accesorio por línea lógica, separados por coma. */
export function textoAccesorios(f: ProductoImplementacion): string {
  return f.accesorios.map((a) => `${a.codigo}${a.tamano_pulgadas ? ` ${a.tamano_pulgadas}"` : ''}`).join(', ');
}

const opcionesDe = <K extends string>(claves: readonly K[], etiqueta: (k: K) => string): OpcionEnum[] =>
  claves.map((valor) => ({ valor, etiqueta: etiqueta(valor) }));

export const COLUMNAS_PRODUCTO: ColumnaProducto[] = [
  { clave: 'sku', etiqueta: 'SKU', ancho: 104, filtro: 'texto', texto: (f) => f.sku, orden: (f) => f.sku },
  {
    clave: 'producto',
    etiqueta: 'Producto',
    ancho: 250,
    filtro: 'texto',
    texto: (f) => `${f.nombre ?? ''} ${f.marca ?? ''}`,
    orden: (f) => f.nombre,
  },
  {
    clave: 'version',
    etiqueta: 'Planograma versión',
    ancho: 190,
    filtro: 'texto',
    texto: (f) => `${f.codigoVersion} ${f.planogramaNombre}`,
    orden: (f) => f.codigoVersion,
  },
  { clave: 'gondola', etiqueta: 'Góndola', ancho: 140, filtro: 'texto', texto: (f) => f.gondola, orden: (f) => f.gondola },
  { clave: 'nivel', etiqueta: 'Nivel', ancho: 88, filtro: 'numero', numero: (f) => f.nivel },
  { clave: 'orden', etiqueta: 'Posición en nivel', ancho: 104, filtro: 'numero', numero: (f) => f.orden },
  {
    clave: 'ganchos',
    etiqueta: 'Ganchos',
    ancho: 130,
    filtro: 'texto',
    texto: (f) => f.ganchos.join(', '),
    orden: (f) => (f.ganchos.length ? Math.min(...f.ganchos) : null),
  },
  {
    clave: 'accesorio',
    etiqueta: 'Accesorio de montaje',
    ancho: 170,
    filtro: 'texto',
    texto: textoAccesorios,
    orden: (f) => textoAccesorios(f) || null,
  },
  { clave: 'facings', etiqueta: 'Facing horizontal', ancho: 110, filtro: 'numero', numero: (f) => f.facings_horizontal },
  { clave: 'apilable', etiqueta: 'Cantidad apilable', ancho: 110, filtro: 'numero', numero: (f) => f.cantidad_apilable },
  {
    clave: 'capacidadFacing',
    etiqueta: 'Capacidad del facing',
    ancho: 118,
    filtro: 'numero',
    numero: (f) => f.unidades_por_facing,
  },
  { clave: 'capacidadMaxima', etiqueta: 'Capacidad máxima', ancho: 116, filtro: 'numero', numero: (f) => f.capacidad_maxima },
  { clave: 'minEstetico', etiqueta: 'Mín. estético', ancho: 104, filtro: 'numero', numero: (f) => f.min_estetico },
  { clave: 'minFinal', etiqueta: 'Mín. final', ancho: 96, filtro: 'numero', numero: (f) => f.min_final },
  { clave: 'maxFinal', etiqueta: 'Máx. final', ancho: 96, filtro: 'numero', numero: (f) => f.max_final },
  {
    clave: 'perfil',
    etiqueta: 'Perfil de redondeo',
    ancho: 170,
    filtro: 'enum',
    opciones: opcionesDe(PERFILES_REDONDEO, (p) => `${PERFIL_REDONDEO_META[p].label} · ${PERFIL_REDONDEO_META[p].ayuda}`),
    valor: (f) => f.perfil_redondeo,
  },
  {
    clave: 'modo',
    etiqueta: 'Modo',
    ancho: 130,
    filtro: 'enum',
    opciones: opcionesDe(MODOS_APARICION, (m) => MODO_APARICION_META[m].label),
    valor: (f) => f.modo,
  },
  {
    clave: 'decision',
    etiqueta: 'Decisión',
    ancho: 120,
    filtro: 'enum',
    opciones: opcionesDe(DECISIONES_POSICION, (d) => DECISION_POSICION_META[d].label),
    valor: (f) => f.decision,
  },
  {
    clave: 'observaciones',
    etiqueta: 'Observaciones',
    ancho: 260,
    filtro: 'texto',
    texto: (f) => f.observaciones ?? '',
    orden: (f) => f.observaciones || null,
  },
  {
    clave: 'sustituto',
    etiqueta: 'SKU sustituto',
    ancho: 210,
    filtro: 'texto',
    texto: (f) => `${f.sku_sustituto ?? ''} ${f.sustituto_nombre ?? ''}`,
    orden: (f) => f.sku_sustituto,
  },
  { clave: 'inventario', etiqueta: 'Inventario', ancho: 110, filtro: 'numero', numero: (f) => f.inventario },
  {
    clave: 'estado',
    etiqueta: 'Estado',
    ancho: 150,
    filtro: 'enum',
    opciones: opcionesDe(['con', 'sin'] as const, (e) => ESTADO_INVENTARIO_META[e].label),
    valor: estadoInventario,
  },
];

const POR_CLAVE = new Map(COLUMNAS_PRODUCTO.map((c) => [c.clave, c]));

export function columnaProducto(clave: ClaveColumna): ColumnaProducto {
  return POR_CLAVE.get(clave)!;
}

function esClaveColumna(valor: unknown): valor is ClaveColumna {
  return typeof valor === 'string' && POR_CLAVE.has(valor as ClaveColumna);
}

// ─── Filtros y orden ─────────────────────────────────────────────────────────

export type FiltrosColumna = Partial<Record<ClaveColumna, string>>;

/** Claves de los filtros numéricos que no se pueden interpretar (se ignoran al filtrar). */
export function filtrosInvalidos(filtros: FiltrosColumna): Set<ClaveColumna> {
  const invalidos = new Set<ClaveColumna>();
  for (const [clave, expresion] of Object.entries(filtros) as [ClaveColumna, string][]) {
    const col = columnaProducto(clave);
    if (col.filtro === 'numero' && expresion.trim() && !parsearFiltroNumerico(expresion)) invalidos.add(clave);
  }
  return invalidos;
}

type Prueba = (f: ProductoImplementacion) => boolean;

function pruebaDeFiltro(col: ColumnaProducto, expresion: string): Prueba | null {
  if (!expresion.trim()) return null;
  if (col.filtro === 'enum') return (f) => col.valor(f) === expresion;
  if (col.filtro === 'texto') return (f) => contieneTexto(col.texto(f), expresion);
  const prueba = parsearFiltroNumerico(expresion);
  if (!prueba) return null;
  // Sin dato (ej. inventario no disponible) no cumple ningún filtro numérico.
  return (f) => {
    const v = col.numero(f);
    return v !== null && prueba(v);
  };
}

/** Búsqueda general de la barra: SKU, nombre o marca. */
export function coincideBusqueda(f: ProductoImplementacion, busqueda: string): boolean {
  return contieneTexto(`${f.sku} ${f.nombre ?? ''} ${f.marca ?? ''}`, busqueda);
}

export function filtrarProductos(
  filas: ProductoImplementacion[],
  busqueda: string,
  filtros: FiltrosColumna,
): ProductoImplementacion[] {
  const pruebas = (Object.entries(filtros) as [ClaveColumna, string][])
    .map(([clave, expresion]) => pruebaDeFiltro(columnaProducto(clave), expresion))
    .filter((p): p is Prueba => p !== null);
  return filas.filter((f) => coincideBusqueda(f, busqueda) && pruebas.every((p) => p(f)));
}

function valorOrden(f: ProductoImplementacion, clave: ClaveColumna): ValorOrdenable {
  const col = columnaProducto(clave);
  if (col.filtro === 'numero') return col.numero(f);
  if (col.filtro === 'texto') return col.orden(f);
  // Los enums se ordenan por su etiqueta visible.
  const valor = col.valor(f);
  return valor === null ? null : (col.opciones.find((o) => o.valor === valor)?.etiqueta ?? valor);
}

/** Sin criterios se conserva el orden del backend (versión, góndola, nivel, posición). */
export function ordenarProductos(
  filas: ProductoImplementacion[],
  orden: CriterioOrdenProducto[],
): ProductoImplementacion[] {
  return ordenarAnidado(filas, orden, valorOrden);
}

export { alternarOrden };

// ─── Preferencias de columnas (orden, visibilidad y orden de filas) ──────────

export interface PreferenciasColumnas {
  orden: ClaveColumna[];
  ocultas: ClaveColumna[];
  criterios: CriterioOrdenProducto[];
}

export const PREFERENCIAS_INICIALES: PreferenciasColumnas = {
  orden: [...CLAVES_COLUMNA],
  ocultas: [],
  criterios: [],
};

/**
 * Valida lo leído de localStorage: descarta claves desconocidas, agrega al final las columnas
 * nuevas, no permite ocultar todas y quita criterios de orden de columnas ocultas o inválidos.
 */
export function validarPreferencias(crudo: unknown): PreferenciasColumnas {
  if (!crudo || typeof crudo !== 'object') return PREFERENCIAS_INICIALES;
  const datos = crudo as Record<string, unknown>;

  const orden = [...new Set(Array.isArray(datos.orden) ? datos.orden.filter(esClaveColumna) : [])];
  CLAVES_COLUMNA.forEach((clave) => {
    if (!orden.includes(clave)) orden.push(clave);
  });

  let ocultas = [...new Set(Array.isArray(datos.ocultas) ? datos.ocultas.filter(esClaveColumna) : [])];
  if (ocultas.length >= orden.length) ocultas = [];

  const vistos = new Set<ClaveColumna>();
  const criterios = (Array.isArray(datos.criterios) ? datos.criterios : []).filter(
    (c): c is CriterioOrdenProducto => {
      if (!c || typeof c !== 'object') return false;
      const { campo, dir } = c as { campo?: unknown; dir?: unknown };
      const valido =
        esClaveColumna(campo) &&
        !ocultas.includes(campo) &&
        !vistos.has(campo) &&
        (dir === 'asc' || dir === 'desc');
      if (valido) vistos.add(campo as ClaveColumna);
      return valido;
    },
  );

  return { orden, ocultas, criterios: criterios.map(({ campo, dir }) => ({ campo, dir: dir as DireccionOrden })) };
}

/** Mueve una columna `delta` lugares (flechas del teclado en el panel). Fuera de rango: sin cambio. */
export function moverColumna(orden: ClaveColumna[], clave: ClaveColumna, delta: number): ClaveColumna[] {
  const i = orden.indexOf(clave);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= orden.length) return orden;
  const nuevo = orden.filter((k) => k !== clave);
  nuevo.splice(j, 0, clave);
  return nuevo;
}

/**
 * Soltar `desde` sobre `hacia`: ocupa el lugar de `hacia`, así que si viene de la izquierda queda
 * después de ella y si viene de la derecha, antes.
 */
export function soltarColumna(orden: ClaveColumna[], desde: ClaveColumna, hacia: ClaveColumna): ClaveColumna[] {
  if (desde === hacia || !orden.includes(desde) || !orden.includes(hacia)) return orden;
  const destino = orden.indexOf(hacia);
  const nuevo = orden.filter((k) => k !== desde);
  nuevo.splice(destino, 0, desde);
  return nuevo;
}

/**
 * Muestra u oculta una columna. Ocultarla también quita su criterio de orden (y la vista quita su
 * filtro) para no ordenar ni filtrar por algo que no se ve. La última visible no se puede ocultar.
 */
export function alternarVisibilidad(prefs: PreferenciasColumnas, clave: ClaveColumna): PreferenciasColumnas {
  if (prefs.ocultas.includes(clave)) return { ...prefs, ocultas: prefs.ocultas.filter((k) => k !== clave) };
  if (columnasVisibles(prefs).length <= 1) return prefs;
  return {
    ...prefs,
    ocultas: [...prefs.ocultas, clave],
    criterios: prefs.criterios.filter((c) => c.campo !== clave),
  };
}

export function columnasVisibles(prefs: PreferenciasColumnas): ClaveColumna[] {
  return prefs.orden.filter((k) => !prefs.ocultas.includes(k));
}
