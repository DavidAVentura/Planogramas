/** Partición de una góndola en columnas o franjas (ver Arquitectura/Contratos/18_secciones/). */
export const DIRECCIONES_SECCION = ['COLUMNAS', 'FILAS'] as const;
export type DireccionSeccion = (typeof DIRECCIONES_SECCION)[number];

/** Nodo del árbol de secciones: una división reparte su espacio entre sus hijas; una hoja tiene niveles. */
export interface NodoSeccion {
  id: number;
  esDivision: boolean;
  direccion: DireccionSeccion | null;
  /** Medida en la dirección del padre (la última hija toma lo que sobre). */
  tamCm: number;
  hijos: NodoSeccion[];
}

/** Sección final (hoja) con su rectángulo en cm, medido desde la esquina superior izquierda. */
export interface HojaSeccion {
  id: number;
  /** 1, 2, 3… en orden de recorrido (arriba antes que abajo, izquierda antes que derecha). */
  indice: number;
  xCm: number;
  yCm: number;
  anchoCm: number;
  altoCm: number;
  nivelIds: number[];
}

export interface EstructuraSecciones {
  gondolaId: number;
  anchoCm: number;
  altoCm: number;
  /** false = góndola sin dividir: se comporta igual que antes de existir las secciones. */
  dividida: boolean;
  raiz: NodoSeccion | null;
  hojas: HojaSeccion[];
}

export interface DividirSeccionInput {
  seccion_id?: number;
  direccion: DireccionSeccion;
}
