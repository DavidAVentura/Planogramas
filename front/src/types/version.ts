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
  /** Góndolas vacías con las que nace la versión (1-20, default 1 en el API). No aplica con
   * `versionBaseId`: la versión especial clona las góndolas de su base. */
  cantidadGondolas?: number;
}

export interface VersionAnteriorArchivada {
  id: number;
  codigo: string;
}

export interface PromoverAPilotoResultado extends Version {
  tiendas: TiendaResumen[];
  versionAnteriorArchivada: VersionAnteriorArchivada | null;
}

export interface PromoverAPublicadoResultado extends Version {
  versionAnteriorArchivada: VersionAnteriorArchivada | null;
}

export interface GuardarVersionResultado extends Version {
  versionAnteriorArchivada: VersionAnteriorArchivada | null;
}

export interface TiendasDeVersion {
  asignadas: TiendaResumen[];
  disponibles: TiendaResumen[];
}

/** Tienda con su tipo, como la devuelve la simulación de publicación. */
export interface TiendaConTipo extends TiendaResumen {
  tipo: VersionTipo;
}

/** `GET /versiones/{id}/publicacion/simular`: qué pasaría al publicar, sin guardar nada. */
export interface SimulacionPublicacion {
  versionId: number;
  codigo: string;
  tipo: VersionTipo;
  esEspecial: boolean;
  erroresBloqueantes: ErrorBloqueante[];
  /** Avisos que no impiden publicar (ej. productos que siguen en la góndola "Por ubicar"). */
  advertencias?: { codigo: string; mensaje: string }[];
  /** Publicada del mismo tipo que se archivaría; null si no hay (o si la versión es especial). */
  versionAnterior: VersionAnteriorArchivada | null;
  /** Tiendas del piloto: pasan de piloto a publicado. */
  tiendasPiloto: TiendaConTipo[];
  /** Tiendas que hoy usan la publicada anterior: migran a esta versión. */
  tiendasMigran: TiendaConTipo[];
  totalTiendas: number;
}

export interface ErrorBloqueante {
  posicionId: number;
  sku: string;
  gondola: string;
  nivel: number;
  error: string;
}
