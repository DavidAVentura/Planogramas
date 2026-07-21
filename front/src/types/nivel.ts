export const TIPOS_ACCESORIO = ['GANCHO', 'BANDEJA', 'BARRA', 'CANASTA', 'OTRO'] as const;
export type TipoAccesorio = (typeof TIPOS_ACCESORIO)[number];

export interface NivelAccesorio {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Nivel {
  id: number;
  gondolaId: number;
  orden: number;
  altura_desde_piso_cm: number;
  tipo_accesorio: TipoAccesorio;
  accesorio: NivelAccesorio | null;
  tamano_accesorio_pulgadas: number | null;
  ancho_disponible_cm: number;
  notas: string | null;
}

export interface NivelEditado extends Nivel {
  advertencia?: string;
}

export interface NivelCampos {
  altura_desde_piso_cm: number;
  tipo_accesorio: TipoAccesorio;
  codigo_accesorio_id?: number | null;
  tamano_accesorio_pulgadas?: number | null;
  ancho_disponible_cm: number;
  notas?: string | null;
}

export interface NivelInput extends NivelCampos {
  orden: number;
}

export type NivelCambios = Partial<NivelCampos>;

export interface NivelResumen {
  id: number;
  gondolaNombre: string;
  orden: number;
  totalPosiciones: number;
}

export interface OrdenNivel {
  id: number;
  orden: number;
}
