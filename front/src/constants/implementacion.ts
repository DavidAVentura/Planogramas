import type { EstadoVersionImplementacion, FiltrosMiTienda } from '../types/implementacion';
import type { DecisionPosicion, PerfilRedondeo } from '../types/posicion';

export interface MetaBadge {
  label: string;
  bg: string;
  color: string;
}

// "Publicada"/"Piloto" en femenino porque califican a la versión, no al planograma.
export const ESTADO_VERSION_IMPLEMENTACION_META: Record<EstadoVersionImplementacion, MetaBadge> = {
  publicado: { label: 'Publicada', bg: 'var(--cemaco-green-50)', color: '#4f7300' },
  piloto: { label: 'Piloto', bg: '#ffe8d2', color: '#8a3f00' },
};

export const PERFIL_REDONDEO_META: Record<PerfilRedondeo, MetaBadge & { ayuda: string }> = {
  MRP: { label: 'MRP', ayuda: 'No se rompe empaque', bg: 'var(--cemaco-indigo-50)', color: 'var(--cemaco-indigo)' },
  ZSRE: { label: 'ZSRE', ayuda: 'Se puede romper empaque', bg: 'var(--ink-100)', color: 'var(--fg-2)' },
};

export const DECISION_POSICION_META: Record<DecisionPosicion, MetaBadge> = {
  ACTIVO: { label: 'Activo', bg: 'var(--cemaco-green-50)', color: '#4f7300' },
  INACTIVO: { label: 'Inactivo', bg: 'var(--ink-100)', color: 'var(--fg-2)' },
};

export type EstadoInventario = 'con' | 'sin';

export const ESTADO_INVENTARIO_META: Record<EstadoInventario, MetaBadge> = {
  con: { label: 'Con inventario', bg: 'var(--cemaco-green-50)', color: '#4f7300' },
  sin: { label: 'Sin inventario', bg: 'var(--danger-bg)', color: '#b3261e' },
};

export const FILTROS_MI_TIENDA_INICIALES: FiltrosMiTienda = {
  busqueda: '',
  departamento: '',
  estado: '',
  implementable: '',
  evidencia: '',
};

/** Umbral por defecto si la respuesta no lo trae (regla 4 del contrato de resumen). */
export const UMBRAL_IMPLEMENTABLE_POR_DEFECTO = 85;
