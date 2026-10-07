export interface ProductoCatalogo {
  sku: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
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
  /** Todas las fotos de CATI (URL XL), la principal primero. Solo en GET /catalog/productos/{sku}. */
  imagenes?: string[];
  /** Atributos internos de CATI (pares nombre/valor). */
  atributos?: AtributoProducto[];
}

export interface AtributoProducto {
  nombre: string;
  valor: string;
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

export interface FichaTecnicaCampo {
  etiqueta: string;
  valor: string;
}
