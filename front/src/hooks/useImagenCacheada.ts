import { useEffect, useRef, useState } from 'react';
import { imagenEnCache, obtenerImagen } from '../utils/cacheImagenes';

/**
 * Object URL de una imagen pasando por la caché LRU (utils/cacheImagenes.ts): si ya se descargó se
 * muestra al instante, sin volver a pedirla. Los object URL los revoca la caché al desalojarlos, no
 * este hook.
 */
export function useImagenCacheada(clave: string, descargar: () => Promise<Blob>) {
  const [estado, setEstado] = useState(() => ({ clave, url: imagenEnCache(clave), error: false }));
  // La función de descarga suele venir inline; con el ref no reinicia el efecto en cada render.
  const descargarRef = useRef(descargar);
  descargarRef.current = descargar;

  useEffect(() => {
    let vigente = true;
    setEstado({ clave, url: imagenEnCache(clave), error: false });
    obtenerImagen(clave, () => descargarRef.current())
      .then((url) => vigente && setEstado({ clave, url, error: false }))
      .catch(() => vigente && setEstado({ clave, url: null, error: true }));
    return () => {
      vigente = false;
    };
  }, [clave]);

  // Mientras el efecto se pone al día con una clave nueva, no mostrar la imagen anterior.
  if (estado.clave !== clave) return { url: imagenEnCache(clave), error: false };
  return { url: estado.url, error: estado.error };
}

/** Descarga anticipada (ej. la foto siguiente del visor); los errores se ignoran. */
export function precargarImagen(clave: string, descargar: () => Promise<Blob>) {
  obtenerImagen(clave, descargar).catch(() => {});
}
