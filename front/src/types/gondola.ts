export interface Gondola {
  id: number;
  versionId: number;
  nombre: string;
  ancho_cm: number;
  alto_cm: number;
  profundidad_cm: number;
  posicion_en_tienda: string | null;
  orden: number;
}

export interface GondolaListItem extends Gondola {
  totalNiveles: number;
}

export interface GondolaEditada extends Gondola {
  nivelesActualizados: number;
}

export interface GondolaInput {
  nombre: string;
  ancho_cm: number;
  alto_cm: number;
  profundidad_cm: number;
  posicion_en_tienda?: string | null;
}

export interface GondolaResumen {
  id: number;
  nombre: string;
  totalNiveles: number;
  totalPosiciones: number;
}

export interface OrdenGondola {
  id: number;
  orden: number;
}
