export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "18 may 2026 · 10:22" */
export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${formatearFecha(iso)} · ${hora}`;
}

/** "hace un momento" / "hace 12 min" / "hace 3 h" / fecha y hora si pasó más de un día. */
export function textoHaceTiempo(iso: string, ahora: number = Date.now()): string {
  const minutos = Math.floor((ahora - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 24 * 60) return `hace ${Math.floor(minutos / 60)} h`;
  return `el ${formatearFechaHora(iso)}`;
}

/** Subcategoría de planograma sin el código CATI inicial: "(01-0025-…) CANDADOS AUTOS" -> "CANDADOS AUTOS". */
export function subcategoriaSinCodigo(subcategoria: string): string {
  return subcategoria.replace(/^\s*\([^)]*\)\s*/, '');
}

/** "1 versión" / "3 versiones". */
export function textoConteo(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
