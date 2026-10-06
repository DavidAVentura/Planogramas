/** Uso del espacio de un nivel en sus dos ejes — lo comparten todas las barras de llenado (Lienzo a
 * escala, filas del Lienzo y Editor) para que su tooltip muestre siempre la misma información. */

export interface UsoHorizontal {
  ocupadoCm: number;
  disponibleCm: number;
  /** Negativo si el nivel está sobre-ocupado. */
  libreCm: number;
  /** ocupado / disponible; null si el nivel no tiene ancho disponible. */
  ratio: number | null;
  posiciones: number;
}

export interface UsoVertical {
  /** Alto útil del nivel (hasta el nivel de arriba o el techo); null si no se conoce. */
  altoNivelCm: number | null;
  /** Alto del producto más alto × apilable; null si ningún producto tiene alto registrado. */
  ocupadoCm: number | null;
  libreCm: number | null;
  ratio: number | null;
  masAlto: { etiqueta: string; altoCm: number } | null;
  /** Productos con SKU pero sin alto registrado (no entran en el cálculo). */
  sinAlto: number;
}

export interface ItemAltura {
  /** SKU o nombre, para mostrar cuál es el producto más alto. */
  etiqueta: string;
  /** Alto unitario del producto; null si no está registrado. */
  altoCm: number | null;
  apilable: number;
}

export function calcularUsoHorizontal(ocupadoCm: number, disponibleCm: number, posiciones: number): UsoHorizontal {
  return {
    ocupadoCm,
    disponibleCm,
    libreCm: disponibleCm - ocupadoCm,
    ratio: disponibleCm > 0 ? ocupadoCm / disponibleCm : null,
    posiciones,
  };
}

export function calcularUsoVertical(altoNivelCm: number | null, items: ItemAltura[]): UsoVertical {
  const conAlto = items
    .filter((i) => i.altoCm !== null && i.altoCm > 0)
    .map((i) => ({ etiqueta: i.etiqueta, altoCm: i.altoCm! * Math.max(1, i.apilable) }));
  const masAlto = conAlto.reduce<{ etiqueta: string; altoCm: number } | null>((max, i) => (!max || i.altoCm > max.altoCm ? i : max), null);
  const alto = altoNivelCm !== null && altoNivelCm > 0 ? altoNivelCm : null;
  const ocupadoCm = masAlto?.altoCm ?? null;
  return {
    altoNivelCm: alto,
    ocupadoCm,
    libreCm: alto !== null && ocupadoCm !== null ? alto - ocupadoCm : null,
    ratio: alto !== null && ocupadoCm !== null ? ocupadoCm / alto : null,
    masAlto,
    sinAlto: items.length - conAlto.length,
  };
}

/** Color de una barra de uso: verde hasta 85 %, ámbar hasta 100 %, rojo si se pasa. Gris = sin dato. */
export function claseUso(ratio: number | null): 'sin-dato' | 'excedido' | 'justo' | 'ok' {
  if (ratio === null) return 'sin-dato';
  if (ratio > 1) return 'excedido';
  if (ratio > 0.85) return 'justo';
  return 'ok';
}

/**
 * Alto útil de un nivel a partir de las alturas desde el piso: hasta la base del nivel inmediato
 * superior de la misma sección o, si es el más alto, hasta el techo (alto de la góndola). null si
 * es el más alto y no se conoce el techo.
 */
export function altoUtilDeNivelCm(
  nivel: { id: number | string; altura_desde_piso_cm: number; seccionId?: number | null },
  niveles: Array<{ id: number | string; altura_desde_piso_cm: number; seccionId?: number | null }>,
  techoCm: number | null,
): number | null {
  const encima = niveles
    .filter((n) => n.id !== nivel.id && (n.seccionId ?? null) === (nivel.seccionId ?? null) && n.altura_desde_piso_cm > nivel.altura_desde_piso_cm)
    .map((n) => n.altura_desde_piso_cm);
  const limite = encima.length ? Math.min(...encima) : techoCm;
  return limite === null ? null : limite - nivel.altura_desde_piso_cm;
}
