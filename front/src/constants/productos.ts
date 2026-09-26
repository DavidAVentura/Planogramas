import type { FiltroJerarquia, FiltrosListadoProductos, ModoAparicion } from '../types/producto';

interface MetaBadge {
  label: string;
  bg: string;
  color: string;
}

/** Orden en que se muestran los modos en la tabla. */
export const MODOS_APARICION: ModoAparicion[] = ['PLANOGRAMA', 'CROSS', 'IMPULSO'];

// Cross e Impulso también se distinguen por luminosidad, no solo por tono; el texto siempre
// acompaña al color.
export const MODO_APARICION_META: Record<ModoAparicion, MetaBadge> = {
  PLANOGRAMA: { label: 'Planograma', bg: 'var(--cemaco-indigo-100)', color: 'var(--cemaco-indigo)' },
  CROSS:      { label: 'Cross',      bg: '#ffe8d2',                  color: '#8a3f00' },
  IMPULSO:    { label: 'Impulso',    bg: 'var(--cemaco-green-50)',   color: 'var(--cemaco-green-700)' },
};

export const ESTADO_PRODUCTO_META: Record<string, MetaBadge> = {
  activo:   { label: 'Activo',   bg: 'var(--cemaco-green-50)', color: 'var(--cemaco-green-700)' },
  inactivo: { label: 'Inactivo', bg: 'var(--ink-100)',         color: 'var(--fg-2)' },
};

export const TIPO_VERSION_LABEL: Record<string, string> = {
  GRANDE: 'Tienda grande',
  MEDIANA: 'Tienda mediana',
  EXPRESS: 'Tienda express',
};

export const JERARQUIA_VACIA: FiltroJerarquia = {
  area: '',
  departamento: '',
  familia: '',
  categoria: '',
  subcategoria: '',
};

export const FILTROS_PRODUCTOS_INICIALES: FiltrosListadoProductos = {
  busqueda: '',
  modo: '',
  estado: '',
  planogramas: [],
};
