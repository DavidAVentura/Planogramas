import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from './posicion';
import type { TipoTienda } from './tienda';

/** Estados de versión que puede ver el Implementador: la que su tienda monta. */
export type EstadoVersionImplementacion = 'publicado' | 'piloto';

export interface TiendaImplementacion {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoTienda;
}

/** Góndola de la versión con su conteo de fotos de evidencia en la tienda. */
export interface GondolaImplementacion {
  id: number;
  nombre: string;
  orden: number;
  evidencias: number;
}

/** Versión asignada a la tienda — ver Arquitectura/Contratos/16_implementacion/GET_implementacion_resumen.md. */
export interface PlanogramaImplementacion {
  versionId: number;
  codigo: string;
  tipo: TipoTienda;
  estado: EstadoVersionImplementacion;
  esEspecial: boolean;
  planogramaId: number;
  nombre: string;
  departamento: string;
  totalProductos: number;
  /** `null` cuando el inventario no está disponible (modo degradado). */
  conInventario: number | null;
  porcentajeInventario: number | null;
  implementable: boolean | null;
  adjuntos: number;
  evidencias: number;
  gondolas: GondolaImplementacion[];
}

/**
 * Marca de inventario común a resumen y productos. El backend cachea el stock de CATI 2 h; si CATI
 * falla y hay dato previo se sirve igual con `inventarioDesactualizado: true` y `advertencia`.
 */
export interface EstadoInventario {
  inventarioDisponible: boolean;
  inventarioDesactualizado: boolean;
  /** ISO del dato más antiguo usado; `null` sin inventario o sin productos. */
  inventarioActualizadoEn: string | null;
  advertencia?: string;
}

export interface ResumenImplementacion extends EstadoInventario {
  tienda: TiendaImplementacion;
  umbralImplementable: number;
  planogramas: PlanogramaImplementacion[];
}

/** Una fila por posición — ver GET_implementacion_productos.md. */
export interface ProductoImplementacion {
  posicionId: number;
  versionId: number;
  codigoVersion: string;
  estadoVersion: EstadoVersionImplementacion;
  planogramaNombre: string;
  gondolaId: number;
  gondola: string;
  gondolaOrden: number;
  nivelId: number;
  /** `Nivel.orden` (1 = nivel más bajo). */
  nivel: number;
  /** `Posicion.orden_horizontal`. */
  orden: number;
  sku: string;
  nombre: string | null;
  marca: string | null;
  facings_horizontal: number;
  cantidad_apilable: number;
  unidades_por_facing: number;
  capacidad_maxima: number | null;
  min_estetico: number | null;
  perfil_redondeo: PerfilRedondeo;
  modo: ModoPosicion;
  decision: DecisionPosicion;
  observaciones: string | null;
  sku_sustituto: string | null;
  sustituto_nombre: string | null;
  /** `null` cuando el inventario no está disponible. */
  inventario: number | null;
  conInventario: boolean | null;
}

export interface ProductosImplementacion extends EstadoInventario {
  tienda: TiendaImplementacion;
  total: number;
  data: ProductoImplementacion[];
}

/** Filtros de la vista Mi tienda (se aplican en el cliente). */
export interface FiltrosMiTienda {
  busqueda: string;
  departamento: string;
  estado: EstadoVersionImplementacion | '';
  implementable: 'si' | 'no' | '';
  evidencia: 'pendiente' | 'reportado' | '';
}

/** Tienda que eligió el Implementador, recordada en el navegador. */
export interface TiendaImplementador {
  id: number;
  codigo: string;
  nombre: string;
}
