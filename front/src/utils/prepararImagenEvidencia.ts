import { archivoABase64 } from './archivoABase64';
import { redimensionarImagenABase64 } from './imagenRedimensionar';
import type { EvidenciaTipoMime } from '../types/evidencia';

// Mismo tope que Adjuntos (TAMANO_MAXIMO_BYTES en back/src/domain/adjunto/adjunto.entity.js), que
// es el que reutiliza Evidencias según su contrato.
export const TAMANO_MAXIMO_EVIDENCIA_BYTES = 5 * 1024 * 1024;
export const TIPOS_EVIDENCIA: EvidenciaTipoMime[] = ['image/jpeg', 'image/png', 'image/webp'];

// Intentos de recompresión, de mejor a peor calidad, para fotos de celular que pasan el tope.
const INTENTOS_COMPRESION: [lado: number, calidad: number][] = [
  [2560, 0.85],
  [2000, 0.8],
  [1600, 0.72],
];

export interface ImagenEvidencia {
  nombre: string;
  tipoMime: EvidenciaTipoMime;
  base64: string;
}

/** Bytes que ocupa el contenido decodificado de un base64. */
function bytesDeBase64(base64: string): number {
  const relleno = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - relleno;
}

function nombreJpg(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, '') || 'foto';
  return `${base}.jpg`;
}

/**
 * Valida el tipo de la foto y, si pesa más que el tope del backend, la redimensiona y la recodifica
 * a JPEG en el navegador. Lanza un Error con un mensaje para el usuario si no se puede usar.
 */
export async function prepararImagenEvidencia(archivo: File): Promise<ImagenEvidencia> {
  if (!TIPOS_EVIDENCIA.includes(archivo.type as EvidenciaTipoMime)) {
    throw new Error('Solo se aceptan fotos JPG, PNG o WEBP.');
  }

  if (archivo.size <= TAMANO_MAXIMO_EVIDENCIA_BYTES) {
    return { nombre: archivo.name, tipoMime: archivo.type as EvidenciaTipoMime, base64: await archivoABase64(archivo) };
  }

  for (const [lado, calidad] of INTENTOS_COMPRESION) {
    const { base64 } = await redimensionarImagenABase64(archivo, lado, calidad);
    if (bytesDeBase64(base64) <= TAMANO_MAXIMO_EVIDENCIA_BYTES) {
      return { nombre: nombreJpg(archivo.name), tipoMime: 'image/jpeg', base64 };
    }
  }

  throw new Error('La foto pesa más de 5 MB incluso comprimida. Toma una foto con menor resolución.');
}
