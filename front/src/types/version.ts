export type VersionTipo = 'GRANDE' | 'MEDIANA' | 'EXPRESS';
export type VersionEstado = 'borrador' | 'en_desarrollo' | 'piloto' | 'publicado' | 'archivado';

export interface TiendaResumen {
  id: number;
  codigo: string;
  nombre: string;
  marca?: string | null;
}

/** Fila de `GET /planogramas/{id}/versiones` — la que alimenta la tabla de versiones. */
export interface VersionListItem {
  id: number;
  tipo: VersionTipo;
  codigo: string;
  estado: VersionEstado;
  notas: string | null;
  versionBaseId: number | null;
  totalGondolas: number;
  totalPosiciones: number;
  tiendas: TiendaResumen[];
  createdAt: string;
}

/** Forma que devuelven crear/promover/guardar — sin las métricas agregadas del listado. */
export interface Version {
  id: number;
  planogramaId: number;
  tipo: VersionTipo;
  codigo: string;
  estado: VersionEstado;
  notas: string | null;
  versionBaseId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrearVersionInput {
  tipo: VersionTipo;
  notas?: string;
  versionBaseId?: number;
  tiendaId?: number;
}

export interface PromoverAPilotoResultado extends Version {
  tiendas: TiendaResumen[];
}

export interface PromoverAPublicadoResultado extends Version {
  versionAnteriorArchivada: { id: number; codigo: string } | null;
}

export interface TiendasDeVersion {
  asignadas: TiendaResumen[];
  disponibles: TiendaResumen[];
}

export interface ErrorBloqueante {
  posicionId: number;
  sku: string;
  gondola: string;
  nivel: number;
  error: string;
}
