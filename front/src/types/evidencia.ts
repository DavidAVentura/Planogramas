export type EvidenciaTipoMime = 'image/jpeg' | 'image/png' | 'image/webp';

/** Foto de evidencia — ver Arquitectura/Contratos/17_evidencias/. */
export interface Evidencia {
  id: number;
  nombre_original: string;
  tipo_mime: EvidenciaTipoMime;
  tamano_bytes: number;
  subido_por: string;
  created_at: string;
  /** Solo quien la subió puede quitarla. */
  puedeEliminar: boolean;
}

export interface GondolaEvidencias {
  id: number;
  nombre: string;
  orden: number;
  evidencias: Evidencia[];
}

export interface EvidenciasDeVersion {
  versionId: number;
  tiendaId: number;
  gondolas: GondolaEvidencias[];
}

/** Respuesta del POST: la foto creada con la góndola a la que pertenece. */
export interface EvidenciaCreada extends Evidencia {
  gondolaId: number;
}

export interface AgregarEvidenciaInput {
  gondola_id: number;
  nombre_original: string;
  tipo_mime: EvidenciaTipoMime;
  archivo_base64: string;
}
