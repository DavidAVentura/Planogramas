/** POST /versiones/:id/importar-productos — Excel de productos → góndola "Por ubicar". */

import type { Gancho } from './gancho';
import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from './posicion';

export interface AccesorioExcel {
  /** Normalizado con `normalizarCodigoAccesorio` (trim, espacios colapsados, mayúsculas). */
  codigo: string;
  /** 0 < t ≤ 999, hasta 2 decimales. */
  tamano_pulgadas: number | null;
}

export interface ProductoExcel {
  sku: string;
  descripcion: string | null;
  /** Número = normal (54); texto "<n>E" = de exhibición ("54E"). */
  ganchos: Gancho[];
  facings_horizontal: number;
  unidades_por_facing: number;
  cantidad_apilable: number;
  min_estetico: number | null;
  capacidad_maxima: number | null;
  min_final: number | null;
  max_final: number | null;
  perfil_redondeo: PerfilRedondeo | null;
  modo: Exclude<ModoPosicion, 'PENDIENTE'> | null;
  decision: DecisionPosicion | null;
  accesorios: AccesorioExcel[];
  observaciones: string | null;
}

export interface ResultadoImportacionProductos {
  gondola: { id: number; creada: boolean; totalNiveles: number } | null;
  totalImportados: number;
  omitidos: { sku: string; motivo: string }[];
  advertencias: string[];
}
