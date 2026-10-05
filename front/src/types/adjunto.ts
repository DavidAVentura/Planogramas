export type AdjuntoTipoMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'application/pdf'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Fila de `GET /versiones/{id}/adjuntos` — ver Arquitectura/Contratos/13_adjuntos/. */
export interface Adjunto {
  id: number;
  versionId: number;
  nombreOriginal: string;
  tipoMime: AdjuntoTipoMime;
  tamanoBytes: number;
  blobContainer: string;
  blobPath: string;
  /** URL del blob sin SAS — el contenedor es privado, no sirve para descarga directa. Usar
   * `abrirAdjunto` (utils/adjuntoArchivo.ts), que pide una URL SAS de lectura. */
  blobUrl: string;
  subidoPor: string;
  createdAt: string;
}

/** Paso 1 (`POST .../subida`): el archivo que se quiere subir, para validar tipo y tamaño. */
export interface SolicitarSubidaAdjuntoInput {
  nombre_original: string;
  tipo_mime: AdjuntoTipoMime;
  tamano_bytes: number;
}

/** URL SAS de solo escritura para subir el archivo directo a Azure Blob. */
export interface SubidaAdjunto {
  blobPath: string;
  urlSubida: string;
  expiraEn: string;
  tipoMime: AdjuntoTipoMime;
}

/** Paso 3 (`POST /versiones/{id}/adjuntos` o `PUT /adjuntos/{id}`): confirma el blob ya subido. */
export interface ConfirmarAdjuntoInput {
  nombre_original: string;
  tipo_mime: AdjuntoTipoMime;
  blob_path: string;
}

/** `inline` abre el archivo en el navegador; `attachment` lo guarda con su nombre original. */
export type ModoDescargaAdjunto = 'inline' | 'attachment';

export interface UrlDescargaAdjunto {
  url: string;
  expiraEn: string;
}
