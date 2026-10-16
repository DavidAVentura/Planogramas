/**
 * Texto visible del autor de una carga (foto de evidencia o adjunto): `Nombre (#código)`.
 * Lo guardado no cambia; esto solo da formato. Devuelve texto plano: se pinta como hijo JSX o
 * `title`, nunca como HTML.
 */

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);

/** `JUAN DE LA CRUZ` → `Juan de la Cruz` (partículas en minúscula salvo al inicio). */
function tipoTitulo(nombre: string): string {
  return nombre
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es')
    .split(' ')
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra;
      return palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1);
    })
    .join(' ');
}

/**
 * @param numero código de empleado (`subido_por`); en filas heredadas puede ser otro texto
 * @param nombre nombre capturado al cargar; `null` en filas anteriores
 */
export function formatearAutor(numero: string, nombre: string | null | undefined): string {
  const nombreUtil = nombre?.trim() && nombre.trim() !== numero ? tipoTitulo(nombre) : null;
  const soloDigitos = /^\d+$/.test(numero);

  if (nombreUtil) return soloDigitos ? `${nombreUtil} (#${numero})` : `${nombreUtil} (${numero})`;
  return soloDigitos ? `#${numero}` : numero;
}
