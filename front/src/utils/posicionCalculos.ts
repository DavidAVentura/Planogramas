/**
 * Calcula el ancho asignado a partir de los facings y el ancho físico del producto
 * (facings × ancho_cm del producto). Si no hay ancho de producto conocido, mantiene el
 * ancho actual sin recalcular — el analista puede seguir editándolo a mano.
 */
export function calcularAnchoAsignado(
  facings: number,
  anchoProductoCm: number | null | undefined,
  anchoActualCm: number,
): number {
  if (!facings || !anchoProductoCm) return anchoActualCm;
  return facings * anchoProductoCm;
}

/** capacidad_maxima siempre se deriva así — nunca se ingresa a mano (ver `PosicionDrawer`). */
export function calcularCapacidadMaxima(facings: number, cantidadApilable: number, unidadesPorFacing: number): number {
  return facings * cantidadApilable * unidadesPorFacing;
}

/** min_estetico = 3×facings+1 cuando unidades_por_facing≥4 (empaque no fraccionable en la
 * góndola); si no, coincide con la capacidad máxima (pero queda editable en ese caso). */
export function calcularMinEstetico(facings: number, unidadesPorFacing: number, capacidadMaxima: number): number {
  return unidadesPorFacing >= 4 ? facings * 3 + 1 : capacidadMaxima;
}
