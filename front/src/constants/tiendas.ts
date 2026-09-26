import type { EstadoTienda, FiltrosListadoTiendas, TipoTienda } from '../types/tienda';

interface MetaBadge {
  label: string;
  bg: string;
  color: string;
}

/** En orden de tamaño de tienda: es el orden que usa la tabla al ordenar por tipo. */
export const TIPOS_TIENDA: TipoTienda[] = ['EXPRESS', 'MEDIANA', 'GRANDE'];

export const TIPO_TIENDA_META: Record<TipoTienda, MetaBadge> = {
  GRANDE:  { label: 'Grande',  bg: 'var(--cemaco-indigo-50)', color: 'var(--cemaco-indigo)' },
  MEDIANA: { label: 'Mediana', bg: 'var(--cemaco-green-50)',  color: 'var(--cemaco-green-700)' },
  EXPRESS: { label: 'Express', bg: 'var(--warning-bg)',       color: '#7a5900' },
};

export const ESTADO_TIENDA_META: Record<EstadoTienda, MetaBadge> = {
  activo:   { label: 'Activa',   bg: 'var(--cemaco-green-50)', color: 'var(--cemaco-green-700)' },
  inactivo: { label: 'Inactiva', bg: 'var(--ink-100)',         color: 'var(--fg-2)' },
};

/** Mismas marcas que valida el backend (MARCAS en back/src/domain/tienda/tienda.entity.js). */
export const MARCAS_TIENDA = ['Cemaco', 'Jugueton', 'Bebé Jugueton'] as const;

/** Por defecto se ven solo las activas, igual que el default de GET /tiendas. */
export const FILTROS_TIENDAS_INICIALES: FiltrosListadoTiendas = {
  busqueda: '',
  tipo: '',
  marca: '',
  estado: 'activo',
};
