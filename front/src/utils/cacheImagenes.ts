/**
 * Caché en memoria de imágenes descargadas como object URL, para no volver a bajar una foto que ya
 * se vio (miniatura → visor, navegar entre fotos, reabrir el modal). Es LRU con tope fijo: al pasar
 * de `MAXIMO_IMAGENES` se descarta la menos usada y se revoca su object URL, así el navegador libera
 * el blob y la memoria nunca crece sin límite.
 */
const MAXIMO_IMAGENES = 20;

// Map conserva el orden de inserción: la primera clave es la menos usada recientemente.
const urls = new Map<string, string>();
// Descargas en curso, para que dos pedidos de la misma imagen compartan una sola descarga.
const pendientes = new Map<string, Promise<string>>();

function marcarUsada(clave: string, url: string) {
  urls.delete(clave);
  urls.set(clave, url);
}

function guardar(clave: string, url: string) {
  marcarUsada(clave, url);
  while (urls.size > MAXIMO_IMAGENES) {
    const [masAntigua, urlAntigua] = urls.entries().next().value!;
    urls.delete(masAntigua);
    URL.revokeObjectURL(urlAntigua);
  }
}

/** Object URL ya descargado, o null si no está en caché (no dispara la descarga). */
export function imagenEnCache(clave: string): string | null {
  const url = urls.get(clave);
  if (!url) return null;
  marcarUsada(clave, url);
  return url;
}

/** Object URL de la imagen: de la caché si ya se bajó, si no la descarga con `descargar`. */
export function obtenerImagen(clave: string, descargar: () => Promise<Blob>): Promise<string> {
  const enCache = imagenEnCache(clave);
  if (enCache) return Promise.resolve(enCache);

  const enCurso = pendientes.get(clave);
  if (enCurso) return enCurso;

  const promesa = descargar()
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      guardar(clave, url);
      return url;
    })
    .finally(() => pendientes.delete(clave));
  pendientes.set(clave, promesa);
  return promesa;
}
