/**
 * Desde dónde se abrió Estructura, leído de la URL. El detalle del planograma enlaza a Estructura
 * ya filtrada a un planograma y, según la acción, en un modo:
 *   /estructura?planogramaId=7                          → solo filtrada ("Tiendas", "Ver en Estructura")
 *   /estructura?planogramaId=7&versionId=12&modo=promover → elegir las tiendas del piloto de una versión en desarrollo
 *   /estructura?planogramaId=7&versionId=12&modo=piloto   → sumar o sacar tiendas piloto de una versión en piloto
 */
export type ModoEstructura = 'filtro' | 'promover' | 'piloto';

export interface ContextoEstructura {
  modo: ModoEstructura;
  planogramaId: number;
  /** Solo en `promover` y `piloto`. */
  versionId: number | null;
}

function enteroPositivo(valor: string | null): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function leerContexto(params: URLSearchParams): ContextoEstructura | null {
  const planogramaId = enteroPositivo(params.get('planogramaId'));
  if (!planogramaId) return null;
  const versionId = enteroPositivo(params.get('versionId'));
  const modo = params.get('modo');
  if (versionId && (modo === 'promover' || modo === 'piloto')) return { modo, planogramaId, versionId };
  return { modo: 'filtro', planogramaId, versionId: null };
}

export function rutaEstructura(contexto: { planogramaId: number; versionId?: number; modo?: ModoEstructura }): string {
  const params = new URLSearchParams({ planogramaId: String(contexto.planogramaId) });
  if (contexto.versionId && contexto.modo && contexto.modo !== 'filtro') {
    params.set('versionId', String(contexto.versionId));
    params.set('modo', contexto.modo);
  }
  return `/estructura?${params.toString()}`;
}
