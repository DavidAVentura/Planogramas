// Reglas de presentación de la vista Mi tienda. Funciones puras, sin React.
import type { FiltrosMiTienda, PlanogramaImplementacion } from '../../types/implementacion';
import { contieneTexto } from './filtrosColumna';

/** Pendiente = la versión no tiene ninguna foto en la tienda; Reportado = al menos una. */
export function evidenciaReportada(p: Pick<PlanogramaImplementacion, 'evidencias'>): boolean {
  return p.evidencias > 0;
}

/**
 * Filtra los planogramas de la tienda. Con el inventario no disponible, "Se puede implementar" no
 * filtra: no hay dato con qué decidirlo.
 */
export function filtrarPlanogramas(
  planogramas: PlanogramaImplementacion[],
  filtros: FiltrosMiTienda,
  inventarioDisponible: boolean,
): PlanogramaImplementacion[] {
  return planogramas.filter(
    (p) =>
      contieneTexto(`${p.nombre} ${p.codigo}`, filtros.busqueda) &&
      (!filtros.departamento || p.departamento === filtros.departamento) &&
      (!filtros.estado || p.estado === filtros.estado) &&
      (!filtros.implementable || !inventarioDisponible || (filtros.implementable === 'si') === (p.implementable === true)) &&
      (!filtros.evidencia || (filtros.evidencia === 'reportado') === evidenciaReportada(p)),
  );
}

export interface KpisMiTienda {
  asignados: number;
  /** `null` sin inventario disponible. */
  implementables: number | null;
  noImplementables: number | null;
  evidenciaPendiente: number;
}

export function calcularKpis(planogramas: PlanogramaImplementacion[], inventarioDisponible: boolean): KpisMiTienda {
  const implementables = planogramas.filter((p) => p.implementable === true).length;
  return {
    asignados: planogramas.length,
    implementables: inventarioDisponible ? implementables : null,
    noImplementables: inventarioDisponible ? planogramas.length - implementables : null,
    evidenciaPendiente: planogramas.filter((p) => !evidenciaReportada(p)).length,
  };
}

export function departamentosDe(planogramas: PlanogramaImplementacion[]): string[] {
  return [...new Set(planogramas.map((p) => p.departamento))].sort((a, b) => a.localeCompare(b, 'es'));
}

/** "2 de 3 góndolas con foto" */
export function textoAvanceEvidencia(conFoto: number, total: number): string {
  return `${conFoto} de ${total} ${total === 1 ? 'góndola con foto' : 'góndolas con foto'}`;
}

/** "90 %" o "85.5 %" (un decimal solo si hace falta). */
export function textoPorcentaje(porcentaje: number): string {
  return `${(Math.round(porcentaje * 10) / 10).toLocaleString('es-GT')} %`;
}

/** IDs de versión del query `?versiones=10,12`: enteros positivos, sin repetir; lo demás se ignora. */
export function parsearIdsVersiones(texto: string | null): number[] {
  if (!texto) return [];
  const ids = texto
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^\d+$/.test(t))
    .map(Number)
    .filter((n) => n > 0);
  return [...new Set(ids)];
}
