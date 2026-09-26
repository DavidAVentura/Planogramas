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
  /** Planogramas distintos con una versión no archivada asignada a la tienda. */
  planogramas: number;
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
