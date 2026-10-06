export const TIPOS_ACCESORIO = ['GANCHO', 'BANDEJA', 'BARRA', 'CANASTA', 'OTRO'] as const;
export type TipoAccesorioCatalogo = (typeof TIPOS_ACCESORIO)[number];

export interface Accesorio {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  longitud_cm: number | null;
  ancho_cm: number | null;
  notas_capacidad?: string | null;
}

export interface AccesorioInput {
  codigo: string;
  nombre: string;
  tipo: TipoAccesorioCatalogo;
  longitud_cm?: number | null;
  ancho_cm?: number | null;
  notas_capacidad?: string | null;
}
