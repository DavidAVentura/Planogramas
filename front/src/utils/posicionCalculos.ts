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
