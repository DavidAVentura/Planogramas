export interface ProductoCatalogo {
  sku: string;
  nombre: string;
  marca: string | null;
  subcategoria: string | null;
  ancho_cm: number | null;
  alto_cm: number | null;
  profundidad_cm: number | null;
  imagen_url: string | null;
  precio: number | null;
}

export interface ProductoDetalle extends ProductoCatalogo {
  categoria_nivel1: string | null;
  categoria_nivel2: string | null;
  sku_sustituto: string | null;
  fuente_dimensiones: 'CATI' | 'VTEX' | 'MANUAL' | null;
  dimensiones_validadas: boolean;
}

export interface DimensionesProducto {
  ancho_cm: number;
  alto_cm: number;
  profundidad_cm: number;
}

export interface InventarioSap {
  sku: string | null;
  centroId: string | null;
  centro: string | null;
  stock: string | null;
  stockDaniado: string | null;
  stockBloqueado: string | null;
  stockAlterno: string | null;
}
