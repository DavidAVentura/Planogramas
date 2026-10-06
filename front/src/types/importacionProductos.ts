/** POST /versiones/:id/importar-productos — Excel de productos → góndola "Por ubicar". */

import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from './posicion';

export interface ProductoExcel {
  sku: string;
  descripcion: string | null;
  ganchos: number[];
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
  accesorio_codigo: string | null;
  tamano_accesorio_pulgadas: number | null;
  observaciones: string | null;
}

export interface ResultadoImportacionProductos {
  gondola: { id: number; creada: boolean; totalNiveles: number } | null;
  totalImportados: number;
  omitidos: { sku: string; motivo: string }[];
  advertencias: string[];
}
