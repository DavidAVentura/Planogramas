export const TIPOS_ACCESORIO = ['GANCHO', 'BANDEJA', 'BARRA', 'BOTADERO', 'CANASTA', 'PARRILLA_DIVISOR', 'OTRO'] as const;
export type TipoAccesorioCatalogo = (typeof TIPOS_ACCESORIO)[number];

export const ETIQUETAS_TIPO_ACCESORIO: Record<TipoAccesorioCatalogo, string> = {
  GANCHO: 'Gancho',
  BANDEJA: 'Bandeja',
  BARRA: 'Barra',
  BOTADERO: 'Botadero',
  CANASTA: 'Canasta',
  PARRILLA_DIVISOR: 'Parrilla/Divisor',
  OTRO: 'Otro',
};

export interface Accesorio {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  alto_cm: number | null;
  ancho_cm: number | null;
  profundidad_cm: number | null;
  notas_capacidad?: string | null;
}

export interface AccesorioInput {
  codigo: string;
  nombre: string;
  tipo: TipoAccesorioCatalogo;
  alto_cm?: number | null;
  ancho_cm?: number | null;
  profundidad_cm?: number | null;
  notas_capacidad?: string | null;
}
