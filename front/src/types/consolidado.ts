import type { TiendaSeleccionable } from '../components/dominio/modales/SeleccionTiendasModal/SeleccionTiendasModal';
import type { Gancho } from './gancho';
import type { VersionElegible } from './implementacion';
import type { TipoTienda } from './tienda';

// Consolidado Tiendas (módulo 21). Ver Arquitectura/Contratos/21_consolidado/.

export type VistaConsolidado = 'PLANOGRAMA' | 'CROSS' | 'IMPULSO';
export type ModoFila = VistaConsolidado;
export type FormatoDescarga = 'DETALLADO' | 'AGREGADO' | 'HOJAS';
export type EstadoVersionMontable = 'publicado' | 'piloto';
export type OrdenConsolidado = 'sku' | 'producto' | 'tienda' | 'version';

export interface UbicacionConsolidado {
  posicionId: number;
  gondola: string;
  porUbicar: boolean;
  seccion: number | null;
  nivel: number;
  orden: number;
  ganchos: Gancho[];
}

export interface FilaConsolidado {
  versionId: number;
  codigoVersion: string;
  planogramaId: number;
  planogramaNombre: string;
  estadoVersion: EstadoVersionMontable;
  modo: ModoFila;
  ubicaciones: UbicacionConsolidado[];
  accesorios: { codigo: string; tamanoPulgadas: number | null }[];
  facings: number;
  cantidadApilable: number | null;
  capacidadFacing: number | null;
  capacidadMaxima: number | null;
  minEstetico: number | null;
  minFinal: number | null;
  maxFinal: number | null;
  minVaria: boolean;
  maxVaria: boolean;
  perfil: string | null;
  decision: string | null;
  observaciones: string | null;
  montaje: { colganteExterno: boolean; display: boolean; desborda: boolean; notaDesborde: string | null };
}

export interface GrupoConsolidado {
  sku: string;
  producto: { nombre: string | null; marca: string | null; skuSustituto: string | null; nombreSustituto: string | null };
  tienda: { id: number; codigo: string; nombre: string; tipo: TipoTienda; marca: string | null };
  planogramasEnTienda: number;
  planograma: FilaConsolidado[];
  otras: FilaConsolidado[];
}

export interface ResumenConsolidado {
  filas: number;
  skus: number;
  tiendas: number;
  gruposConVariosPlanogramas: number;
  conteos: Record<'PLANOGRAMA' | 'CROSS' | 'IMPULSO' | 'AGREGADO', number>;
  maximoExportacion: number;
}

export interface RespuestaConsolidado {
  data: GrupoConsolidado[];
  total: number;
  page: number;
  pageSize: number;
  resumen: ResumenConsolidado;
}

export interface TiendaFiltroConsolidado extends TiendaSeleccionable {
  totalSkus: number;
}

export interface FiltrosDisponiblesConsolidado {
  tiendas: TiendaFiltroConsolidado[];
  versiones: VersionElegible[];
}

export interface FiltrosConsolidado {
  tiendaIds: number[];
  versionIds: number[];
  estados: EstadoVersionMontable[];
  busqueda: string;
  soloDuplicados: boolean;
}
