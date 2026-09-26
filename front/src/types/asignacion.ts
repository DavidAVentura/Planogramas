import type { TipoTienda } from './tienda';
import type { VersionEstado, VersionTipo } from './version';

/** Versión no archivada de un planograma, tal como la devuelve `GET /asignaciones`. */
export interface VersionMatriz {
  id: number;
  codigo: string;
  tipo: VersionTipo;
  estado: VersionEstado;
  /** null en la línea base (TG/TM/TE); id de la base si es especial por tienda. */
  versionBaseId: number | null;
  /** Tienda dueña de la especial; null en la línea base. */
  tiendaEspecialId: number | null;
}

export interface PlanogramaMatriz {
  id: number;
  nombre: string;
  departamento: string;
  versiones: VersionMatriz[];
}

export interface TiendaMatriz {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoTienda;
  marca: string | null;
}

/** Versión publicada o en piloto que una tienda tiene montada de un planograma. */
export interface AsignacionMatriz {
  planogramaId: number;
  tiendaId: number;
  versionId: number;
}

export interface MatrizAsignaciones {
  tiendas: TiendaMatriz[];
  planogramas: PlanogramaMatriz[];
  asignaciones: AsignacionMatriz[];
}

/**
 * Un cambio de celda para `POST /asignaciones/ediciones`: `versionId` monta esa versión,
 * `crearEspecialDesde` clona una especial publicada desde esa base, y `versionId: null` quita.
 */
export interface CambioAsignacion {
  planogramaId: number;
  tiendaId: number;
  versionId?: number | null;
  crearEspecialDesde?: number;
}

export interface EspecialCreada {
  versionId: number;
  codigo: string;
  planogramaId: number;
  tiendaId: number;
}

export interface ResultadoEdicion {
  edicionId: number;
  fecha: string;
  cambios: number;
  especialesCreadas: EspecialCreada[];
}

export type AccionAsignacion =
  | 'ASIGNACION'
  | 'CAMBIO'
  | 'RETIRO'
  | 'CREACION_ESPECIAL'
  | 'ENTRADA_PILOTO'
  | 'SALIDA_PILOTO'
  | 'PILOTO_PUBLICADO';

export type OrigenEdicion = 'MANUAL' | 'VERSION' | 'PILOTO' | 'PUBLICACION';

export interface VersionAuditada {
  id: number | null;
  codigo: string | null;
  estado: VersionEstado | null;
}

/** Movimiento de una celda (`GET /asignaciones/historial`). */
export interface EventoHistorial {
  id: number;
  edicionId: number;
  cambiosEnEdicion: number;
  fecha: string;
  usuario: { numero: string; nombre: string };
  motivo: string | null;
  origen: OrigenEdicion;
  accion: AccionAsignacion;
  anterior: VersionAuditada | null;
  nueva: VersionAuditada | null;
}

/** Ficha de solo lectura de una versión (`GET /versiones/:id/resumen`). */
export interface ResumenVersion {
  version: {
    id: number;
    planogramaId: number;
    tipo: VersionTipo;
    codigo: string;
    estado: VersionEstado;
    notas: string | null;
    versionBaseId: number | null;
    versionBase: { id: number; codigo: string } | null;
    /** Solo en una piloto de línea base: la publicada del mismo tipo que reemplazará. */
    reemplazaA: { id: number; codigo: string } | null;
    createdAt: string;
    updatedAt: string;
  };
  planograma: { id: number; nombre: string; departamento: string; estado: string; subcategorias: string[] };
  estructura: {
    gondolas: number;
    niveles: number;
    posiciones: number;
    productos: number;
    metrosLineales: number;
    posicionesPorModo: Record<'PLANOGRAMA' | 'CROSS' | 'IMPULSO' | 'PENDIENTE', number>;
  };
  tiendas: { id: number; codigo: string; nombre: string; tipo: TipoTienda }[];
}
