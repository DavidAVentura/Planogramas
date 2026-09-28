export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "18 may 2026 · 10:22" */
export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${formatearFecha(iso)} · ${hora}`;
}

/** Subcategoría de planograma sin el código CATI inicial: "(01-0025-…) CANDADOS AUTOS" -> "CANDADOS AUTOS". */
export function subcategoriaSinCodigo(subcategoria: string): string {
  return subcategoria.replace(/^\s*\([^)]*\)\s*/, '');
}

/** "Q 1,299.00" */
export function formatearPrecio(precio: number): string {
  return `Q ${precio.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "1 versión" / "3 versiones". */
export function textoConteo(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
