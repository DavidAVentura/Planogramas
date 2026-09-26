export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Subcategoría de planograma sin el código CATI inicial: "(01-0025-…) CANDADOS AUTOS" -> "CANDADOS AUTOS". */
export function subcategoriaSinCodigo(subcategoria: string): string {
  return subcategoria.replace(/^\s*\([^)]*\)\s*/, '');
}
