// Orden y visibilidad de columnas de una tabla, genérico sobre el tipo de clave. Lo usan la tabla
// Productos del Implementador y el Consolidado Tiendas. Lógica pura, sin React.

export interface PreferenciasOrdenVisibilidad<K extends string> {
  orden: K[];
  ocultas: K[];
}

/**
 * Valida lo leído de localStorage: descarta claves desconocidas o repetidas, agrega al final las
 * columnas nuevas y no permite ocultarlas todas. Si no hay nada válido, el orden de `claves` con
 * `ocultasIniciales` ocultas.
 */
export function validarOrdenVisibilidad<K extends string>(
  crudo: unknown,
  claves: readonly K[],
  ocultasIniciales: readonly K[],
): PreferenciasOrdenVisibilidad<K> {
  if (!crudo || typeof crudo !== 'object') return { orden: [...claves], ocultas: [...ocultasIniciales] };
  const datos = crudo as Record<string, unknown>;
  const esClave = (valor: unknown): valor is K => typeof valor === 'string' && claves.includes(valor as K);

  const orden = [...new Set(Array.isArray(datos.orden) ? datos.orden.filter(esClave) : [])];
  claves.forEach((clave) => {
    if (!orden.includes(clave)) orden.push(clave);
  });

  let ocultas = [...new Set(Array.isArray(datos.ocultas) ? datos.ocultas.filter(esClave) : [])];
  if (ocultas.length >= orden.length) ocultas = [];

  return { orden, ocultas };
}

/** Mueve una columna `delta` lugares (flechas del teclado en el panel). Fuera de rango: sin cambio. */
export function moverColumna<K extends string>(orden: K[], clave: K, delta: number): K[] {
  const i = orden.indexOf(clave);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= orden.length) return orden;
  const nuevo = orden.filter((k) => k !== clave);
  nuevo.splice(j, 0, clave);
  return nuevo;
}

/**
 * Soltar `desde` sobre `hacia`: ocupa el lugar de `hacia`, así que si viene de la izquierda queda
 * después de ella y si viene de la derecha, antes.
 */
export function soltarColumna<K extends string>(orden: K[], desde: K, hacia: K): K[] {
  if (desde === hacia || !orden.includes(desde) || !orden.includes(hacia)) return orden;
  const destino = orden.indexOf(hacia);
  const nuevo = orden.filter((k) => k !== desde);
  nuevo.splice(destino, 0, desde);
  return nuevo;
}

export function columnasVisibles<K extends string>(prefs: PreferenciasOrdenVisibilidad<K>): K[] {
  return prefs.orden.filter((k) => !prefs.ocultas.includes(k));
}

/** Muestra u oculta una columna. La última visible no se puede ocultar (devuelve `prefs` tal cual). */
export function alternarVisibilidadBase<P extends PreferenciasOrdenVisibilidad<string>>(
  prefs: P,
  clave: P['orden'][number],
): P {
  if (prefs.ocultas.includes(clave)) return { ...prefs, ocultas: prefs.ocultas.filter((k) => k !== clave) };
  if (columnasVisibles(prefs).length <= 1) return prefs;
  return { ...prefs, ocultas: [...prefs.ocultas, clave] };
}
