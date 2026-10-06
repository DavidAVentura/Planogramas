/** Tipos del Agente Importador de PDF de planograma (POST /agente-extractor/pdf-planograma) y de
 * la importación transaccional del layout (POST /versiones/:id/importar-layout). */

import type { DatosVision } from './posicion';

export type TipoAccesorioNivel = 'GANCHO' | 'BANDEJA' | 'BARRA' | 'CANASTA' | 'OTRO';
export type DireccionSeccion = 'COLUMNAS' | 'FILAS';

export interface ProductoPdf {
  sku: string;
  nombre: string;
  marca: string | null;
  ancho_cm: number | null;
  imagen_url: string | null;
}

/** IDENTIFICADO: el SKU impreso existe en CATI. CANDIDATOS: se encontraron candidatos por la
 * descripción visual. NO_ENCONTRADO: ni lo uno ni lo otro — queda como posición pendiente. */
export type EstadoProductoPdf = 'IDENTIFICADO' | 'CANDIDATOS' | 'NO_ENCONTRADO';

export interface EspacioPdf {
  orden_horizontal: number;
  /** Números impresos en el PDF. */
  ganchos: number[];
  /** Números que les asignará el sistema al importar (uno por facing). */
  numeros_sistema: number[];
  facings: number;
  ancho_cm: number;
  sku_impreso: string | null;
  descripcion_visual: string | null;
  confianza: number;
  producto: ProductoPdf | null;
  candidatos: ProductoPdf[];
  estado_producto: EstadoProductoPdf;
}

export interface NivelPdf {
  clave: string;
  seccion_clave: string | null;
  /** 1 = el de arriba. */
  orden: number;
  altura_desde_piso_cm: number;
  ancho_disponible_cm: number;
  tipo_accesorio: TipoAccesorioNivel;
  codigo_accesorio: string | null;
  codigo_accesorio_id: number | null;
  tamano_accesorio_pulgadas: number | null;
  espacios: EspacioPdf[];
}

export interface SeccionPdf {
  clave: string;
  padre_clave: string | null;
  es_division: boolean;
  direccion: DireccionSeccion | null;
  orden: number;
  tam_cm: number;
}

export interface AccesorioMontajePdf {
  codigo: string;
  tipo: TipoAccesorioNivel;
  medida_pulgadas: number | null;
  cantidad: number | null;
  especificaciones: string | null;
  accesorio_id: number | null;
}

export interface CuerpoPdf {
  clave: string;
  nombre: string;
  codigo_mueble: string | null;
  categoria: string | null;
  pagina: number;
  ancho_cm: number;
  alto_cm: number;
  profundidad_cm: number;
  secciones: SeccionPdf[];
  niveles: NivelPdf[];
  accesorios_montaje: AccesorioMontajePdf[];
  notas: string | null;
  advertencias: string[];
}

export interface ResultadoExtraccionPdf {
  archivo: string;
  modelo: string;
  cuerpos: CuerpoPdf[];
  advertencias: string[];
}

// ─── Importación ──────────────────────────────────────────────────────────────

export interface PosicionImportar {
  orden_horizontal: number;
  sku: string | null;
  ancho_asignado_cm: number;
  facings_horizontal: number;
  nombre_detectado: string | null;
  confidence: number;
  datos_vision: (DatosVision & Record<string, unknown>) | null;
  /** Números impresos en el PDF: se guardan para que la numeración del lienzo sea la del PDF. */
  ganchos: number[];
}

export interface NivelImportar {
  seccion_clave: string | null;
  orden: number;
  altura_desde_piso_cm: number;
  tipo_accesorio: TipoAccesorioNivel;
  codigo_accesorio_id: number | null;
  tamano_accesorio_pulgadas: number | null;
  notas: string | null;
  posiciones: PosicionImportar[];
}

export interface CuerpoImportar {
  destino: 'NUEVA' | 'REEMPLAZAR';
  gondola_id?: number;
  nombre: string;
  ancho_cm: number;
  alto_cm: number;
  profundidad_cm: number;
  secciones: SeccionPdf[];
  niveles: NivelImportar[];
}

export interface GondolaImportada {
  id: number;
  nombre: string;
  destino: 'NUEVA' | 'REEMPLAZAR';
  totalSecciones: number;
  totalNiveles: number;
  totalPosiciones: number;
}

export interface ResultadoImportacion {
  gondolas: GondolaImportada[];
  /** Espacios que se llenaron con productos de la góndola "Por ubicar" (Excel). */
  desdePorUbicar: number;
  advertencias: string[];
}

/** Producto de la góndola "Por ubicar" (importado del Excel), para cruzarlo con el PDF por gancho. */
export interface ProductoPorUbicar {
  sku: string | null;
  nombre: string;
  ganchos: number[];
}
