export type PlanogramaEstado = 'borrador' | 'activo' | 'archivado';

export interface VersionResumen {
  id: number;
  tipo: string;
  codigo: string;
  estado: string;
  totalTiendas: number;
}

interface PlanogramaBase {
  id: number;
  nombre: string;
  departamento: string;
  estado: PlanogramaEstado;
  created_at: string;
  created_by: string;
}

export interface PlanogramaListItem extends PlanogramaBase {
  totalVersiones: number;
}

export interface PlanogramaDetalle extends PlanogramaBase {
  subcategorias: string[];
  versiones: VersionResumen[];
}

export interface ListarPlanogramasFiltros {
  departamento?: string;
  estado?: PlanogramaEstado;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListarPlanogramasResultado {
  data: PlanogramaListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CrearPlanogramaInput {
  nombre: string;
  departamento: string;
  subcategorias: string[];
}

export type EditarPlanogramaInput = Partial<CrearPlanogramaInput>;
