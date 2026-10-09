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
  descripcion: string | null;
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
  /** La fila está en la góndola "Por ubicar" (importada del Excel, sin lugar definitivo aún). */
  porUbicar: boolean;
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
  min_final: number | null;
  max_final: number | null;
  perfil_redondeo: PerfilRedondeo;
  modo: ModoPosicion;
  decision: DecisionPosicion;
  observaciones: string | null;
  /** Números de gancho donde se monta (guardados del Excel o calculados por el sistema). */
  ganchos: number[];
  /** Accesorios de montaje con su medida (ej. R45-12-212P2 · 12"). */
  accesorios: { codigo: string; nombre: string; tamano_pulgadas: number | null }[];
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

// ─── Vista Por versión (Analista) — ver GET_implementacion_versiones.md ─────────

/**
 * Datos de una versión que usan el selector y los chips de la tabla de productos. Las versiones del
 * Implementador (`PlanogramaImplementacion`) los cumplen; las de Por versión pueden estar en
 * cualquier estado (borrador o archivada si llegan por enlace).
 */
export interface VersionElegible {
  versionId: number;
  codigo: string;
  estado: string;
  nombre: string;
  descripcion: string | null;
  departamento: string;
  totalProductos: number;
}

/** Versión elegible en Por versión: publicadas y piloto, más las pedidas por enlace. */
export interface VersionPorVersion extends VersionElegible {
  tipo: TipoTienda;
  esEspecial: boolean;
  planogramaId: number;
  adjuntos: number;
  /** Tiendas que montan la versión. */
  tiendaIds: number[];
}

/**
 * Resumen de una versión para la franja de la tabla de productos (archivos, inventario, evidencia).
 * `PlanogramaImplementacion` lo cumple; el de Por versión agrega si la tienda la monta.
 */
export interface ResumenVersion extends Omit<PlanogramaImplementacion, 'estado'> {
  estado: string;
  /** Solo en Por versión: si la tienda elegida monta la versión; `null` sin tienda. */
  montadaEnTienda?: boolean | null;
}

/** Resumen de una versión pedida en Por versión; con tienda trae inventario y evidencia en ella. */
export interface ResumenVersionPorVersion extends ResumenVersion {
  montadaEnTienda: boolean | null;
}

export interface ProductosPorVersion extends EstadoInventario {
  /** `null` sin tienda elegida: las columnas de inventario van en null. */
  tienda: TiendaImplementacion | null;
  umbralImplementable: number;
  versiones: ResumenVersionPorVersion[];
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
