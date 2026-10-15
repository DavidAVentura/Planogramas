/** Normaliza el código de un accesorio: sin espacios en los extremos, espacios internos colapsados
 * y mayúsculas. Misma regla que `normalizarCodigo` en `back/src/domain/accesorio/accesorio.entity.js`;
 * es el único normalizador de código de accesorio del front. */
export function normalizarCodigoAccesorio(codigo: string): string {
  return codigo.trim().replace(/\s+/g, ' ').toUpperCase();
}
