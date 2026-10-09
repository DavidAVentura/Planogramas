export type TipoTienda = 'GRANDE' | 'MEDIANA' | 'EXPRESS';
export type EstadoTienda = 'activo' | 'inactivo';

export interface Tienda {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoTienda;
  region: string | null;
  marca: string | null;
  estado: EstadoTienda;
  /** Versiones de planograma en estado `publicado` asignadas a la tienda. */
  versionesPublicadas: number;
}

export interface CrearTiendaInput {
  codigo: string;
  nombre: string;
  tipo: TipoTienda;
  marca: string | null;
  region: string | null;
}

/** Filtros de la vista de administración de tiendas (se aplican en el cliente). */
export interface FiltrosListadoTiendas {
  busqueda: string;
  tipo: TipoTienda | '';
  marca: string;
  estado: EstadoTienda | '';
}

export type EditarTiendaInput = Partial<CrearTiendaInput> & { estado?: EstadoTienda };

/** Versión publicada asignada a una tienda (GET /tiendas/:id/planogramas). */
export interface PlanogramaPublicadoTienda {
  versionId: number;
  /** Código de la versión, ej. "ALFOMBRAS DE AUTO-TG". */
  codigo: string;
  tipo: TipoTienda;
  /** Versión especial por tienda (derivada de una versión base). */
  esEspecial: boolean;
  planogramaId: number;
  nombre: string;
  descripcion: string | null;
  departamento: string;
  /** Con el código CATI al inicio, ej. "(01-0025-993-920399-20573) ALFOMBRAS DE HULE AUTOS". */
  subcategorias: string[];
}

export interface PlanogramasDeTienda {
  tienda: Pick<Tienda, 'id' | 'codigo' | 'nombre'>;
  planogramas: PlanogramaPublicadoTienda[];
  mensaje?: string;
}
