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
}
