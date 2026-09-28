import type { ModoPosicion } from './posicion';
import type { VersionEstado } from './version';

/** Modos de Posicion que cuentan como aparición del producto en un planograma. */
export type ModoAparicion = Exclude<ModoPosicion, 'PENDIENTE'>;

/** Fila de GET /catalog/productos: producto de la tabla local con sus apariciones. */
export interface ProductoListado {
  sku: string;
  nombre: string;
  marca: string | null;
  /** Área tal como se guardó al registrar el SKU (ej. "FERRETERIA (01)"); solo para mostrar. */
  categoria_nivel1: string | null;
  /** Departamento tal como se guardó al registrar el SKU; solo para mostrar. */
  categoria_nivel2: string | null;
  subcategoria: string | null;
  precio: number | null;
  ancho_cm: number | null;
  alto_cm: number | null;
  profundidad_cm: number | null;
  fuente_dimensiones: 'CATI' | 'VTEX' | 'MANUAL' | null;
  dimensiones_validadas: boolean;
  imagen_url: string | null;
  estado: string;
  sku_sustituto: string | null;
  /** Planogramas distintos (no archivados) en los que aparece, en cualquier modo. */
  planogramas: number;
  /** Planogramas distintos por modo; un planograma puede contar en más de un modo. */
  apariciones: Record<ModoAparicion, number>;
  /** Ids de los planogramas (no archivados) en los que aparece, en cualquier modo. */
  planograma_ids: number[];
}

/** Fila de GET /catalog/productos/:sku/planogramas: una posición del producto. */
export interface AparicionProducto {
  posicionId: number;
  modo: ModoAparicion;
  cross_externo: boolean;
  decision: 'ACTIVO' | 'INACTIVO';
  planogramaId: number;
  planograma: string;
  departamento: string;
  planogramaEstado: string;
  versionId: number;
  codigo: string;
  tipo: 'GRANDE' | 'MEDIANA' | 'EXPRESS';
  versionEstado: VersionEstado;
  gondola: string;
  nivel: number;
  tiendas: number;
}

/** Ids de CATI (GET /jerarquia/*) de cada nivel elegido; '' = sin elegir. */
export interface FiltroJerarquia {
  area: string;
  departamento: string;
  familia: string;
  categoria: string;
  subcategoria: string;
}

/** Filtros que se aplican en el cliente sobre la lista ya filtrada por jerarquía. */
export interface FiltrosListadoProductos {
  busqueda: string;
  /** `NINGUNO` = productos que no aparecen en ningún planograma. */
  modo: ModoAparicion | 'NINGUNO' | '';
  estado: string;
  /** Planogramas elegidos en el modal; vacío = sin filtrar. El nombre solo se usa para mostrarlo. */
  planogramas: PlanogramaFiltro[];
}

export interface PlanogramaFiltro {
  id: number;
  nombre: string;
}
