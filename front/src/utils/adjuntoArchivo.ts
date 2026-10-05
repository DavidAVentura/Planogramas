import { adjuntosService } from '../services/adjuntos.service';
import type { Adjunto } from '../types/adjunto';

/**
 * Sube el archivo directo a Azure Blob con la URL SAS que entregó el backend (el archivo no pasa
 * por la API). Se usa XMLHttpRequest y no fetch porque fetch no reporta el progreso de subida.
 * Requiere CORS habilitado en la cuenta de storage para el origen del front
 * (ver Arquitectura/DESPLIEGUE_AZURE.md).
 */
export function subirABlob(
  urlSubida: string,
  archivo: File,
  tipoMime: string,
  onProgreso?: (porcentaje: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', urlSubida);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('x-ms-blob-content-type', tipoMime);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Azure rechazó la subida del archivo (HTTP ${xhr.status}). Vuelve a intentarlo.`));
    };
    xhr.onerror = () => reject(new Error('No se pudo subir el archivo. Revisa tu conexión y vuelve a intentarlo.'));
    xhr.send(archivo);
  });
}

/** Imágenes y PDF se abren en otra pestaña; el resto (Excel) se descarga con su nombre. */
export function sePrevisualiza(tipoMime: string): boolean {
  return tipoMime.startsWith('image/') || tipoMime === 'application/pdf';
}

/**
 * Abre (`inline`) o descarga (`attachment`) el adjunto con una URL SAS de solo lectura: el
 * navegador baja el archivo directo desde Azure, sin pasar por la API ni cargarlo en memoria.
 * Para previsualizar, la pestaña se abre antes del await para que el navegador no la bloquee
 * como popup. `forzarDescarga` siempre lo guarda como archivo.
 */
export async function abrirAdjunto(adjunto: Adjunto, forzarDescarga = false): Promise<void> {
  const previsualizar = !forzarDescarga && sePrevisualiza(adjunto.tipoMime);
  const ventana = previsualizar ? window.open('', '_blank') : null;
  try {
    const { url } = await adjuntosService.obtenerUrlDescarga(adjunto.id, previsualizar ? 'inline' : 'attachment');
    if (!previsualizar) {
      // Content-Disposition: attachment viene firmado en la URL, así que no saca al usuario de la página.
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.rel = 'noopener';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } else if (ventana) {
      ventana.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener');
    }
  } catch (err) {
    ventana?.close();
    throw err;
  }
}
