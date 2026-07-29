export interface ProductoExtraidoImagen {
  sku: string;
  ganchos: number[];
  facings_horizontal: number;
}

export interface NivelExtraidoImagen {
  nivel_orden: number;
  productos: ProductoExtraidoImagen[];
}

export interface ResultadoExtraccionImagen {
  niveles: NivelExtraidoImagen[];
  advertencias: string[];
}
