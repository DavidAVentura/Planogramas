/** Reglas de la descarga de Productos por planograma (Lista y Pivote por versión): validación previa
 * del Pivote (la misma regla que el servidor, solo para avisar), cuerpo de la petición, nombre del
 * archivo y textos de error. Sin React ni red.
 *
 * Los encabezados del Pivote son el mismo literal que `back/src/domain/implementacion/columnasExportacion.js`
 * (los del Excel de categorías que lee `excelProductosPlanograma.ts`); la prueba de reimportación los
 * usa para detectar cualquier deriva entre el back y el lector. */

import type { ApiError } from '../../services/httpClient';
import type { FiltroJerarquia } from '../../types/producto';
import type { CuerpoExportacionPorVersion, FormatoDescargaPorVersion, VersionPorVersion } from '../../types/implementacion';

export const ENCABEZADOS_COMUNES_PIVOTE = ['SKU', 'Descripcion', 'Nombre_planograma', 'Estado_version', 'Modo', 'SKU_sustituto'] as const;

export const CAMPOS_BLOQUE_PIVOTE = [
  'Planograma', 'Facings', 'Cantidad_x_facing', 'Cantidad_facing_vertical', 'Min_estetico', 'Capacidad_maxima',
  'Nombre_accesorio', 'Tamano_accesorio', 'Perfil_redondeo', 'Min_final', 'Max_final', 'Decision_final', 'Observaciones',
] as const;

/** Encabezados de un bloque del Pivote: los 13 campos con sufijo y `S1`…`Sn` (ganchos). */
export function encabezadosBloque(sigla: 'TG' | 'TM' | 'TE', nGanchos: number): string[] {
  return [
    ...CAMPOS_BLOQUE_PIVOTE.map((campo) => `${campo}_${sigla}`),
    ...Array.from({ length: nGanchos }, (_, i) => `${sigla}${i + 1}`),
  ];
}

export interface PivoteAplicable {
  aplicable: boolean;
  /** Versiones normales sin tipo (TG, TM o TE). */
  sinTipo: VersionPorVersion[];
  /** Grupos de versiones normales con el mismo planograma, tipo y estado. */
  duplicadas: VersionPorVersion[][];
  /** Versiones especiales de tienda: no van en el Pivote. */
  especiales: VersionPorVersion[];
}

/**
 * ¿Se puede generar el Pivote con estas versiones? Las especiales de tienda se excluyen (no
 * bloquean salvo que sean todas); una normal sin tipo o dos normales del mismo planograma, tipo y
 * estado lo impiden. El servidor repite esta validación: aquí solo se avisa antes de pedir.
 */
export function pivoteAplicable(versiones: VersionPorVersion[]): PivoteAplicable {
  const especiales = versiones.filter((v) => v.esEspecial);
  const normales = versiones.filter((v) => !v.esEspecial);
  const sinTipo = normales.filter((v) => !v.tipo);

  const porClave = new Map<string, VersionPorVersion[]>();
  normales
    .filter((v) => v.tipo)
    .forEach((v) => {
      const clave = `${v.planogramaId}|${v.tipo}|${v.estado}`;
      porClave.set(clave, [...(porClave.get(clave) ?? []), v]);
    });
  const duplicadas = [...porClave.values()].filter((grupo) => grupo.length > 1);

  const soloEspeciales = versiones.length > 0 && normales.length === 0;
  return { aplicable: !soloEspeciales && sinTipo.length === 0 && duplicadas.length === 0, sinTipo, duplicadas, especiales };
}

interface DatosCuerpo {
  versionIds: number[];
  formato: FormatoDescargaPorVersion;
  jerarquia: FiltroJerarquia;
  posicionIds: number[];
  /** Hay búsqueda o filtros de columna activos en la tabla. */
  hayFiltrosCliente: boolean;
}

/** Cuerpo de la petición: no serializa claves vacías; `posicionIds` solo si hay filtros en la tabla. */
export function construirCuerpoExportacion({
  versionIds, formato, jerarquia, posicionIds, hayFiltrosCliente,
}: DatosCuerpo): CuerpoExportacionPorVersion {
  return {
    versionIds,
    formato,
    ...(jerarquia.area ? { area: jerarquia.area } : {}),
    ...(jerarquia.area && jerarquia.departamento ? { departamento: jerarquia.departamento } : {}),
    ...(hayFiltrosCliente ? { posicionIds } : {}),
  };
}

const NOMBRE_POR_FORMATO: Record<FormatoDescargaPorVersion, string> = { LISTA: 'lista', PIVOTE: 'pivote' };

/** `productos-por-planograma-{lista|pivote}-AAAAMMDD.xlsx`, armado solo con el formato y la fecha. */
export function nombreArchivoPorVersion(formato: FormatoDescargaPorVersion, fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  const aaaammdd = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  return `productos-por-planograma-${NOMBRE_POR_FORMATO[formato]}-${aaaammdd}.xlsx`;
}

const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const MENSAJE_PIVOTE_NO_APLICABLE =
  'El Pivote no se puede generar con estas versiones. Revisa que cada una tenga tipo y que no haya dos del mismo planograma, tipo y estado.';
export const MENSAJE_DESCARGA_GENERICO = 'No se pudo generar el archivo. Intenta de nuevo.';

/** Texto del error de la descarga y dónde mostrarlo: `enModal` (queda en el modal) o toast. */
export function mensajeErrorDescargaPorVersion(error: ApiError): { texto: string; enModal: boolean } {
  if (error.status === 422 && error.code === 'PIVOTE_NO_APLICABLE') {
    return { texto: MENSAJE_PIVOTE_NO_APLICABLE, enModal: true };
  }
  if (error.status === 422 && error.code === 'EXPORTACION_DEMASIADO_GRANDE') {
    const d = (error.details ?? {}) as { filas?: unknown; maximo?: unknown };
    if (esNumero(d.filas) && esNumero(d.maximo)) {
      return {
        texto: `La descarga tendría ${d.filas} filas y el máximo es ${d.maximo}. Elige menos versiones o filtra por Área y Departamento.`,
        enModal: true,
      };
    }
  }
  if (error.status === 429) {
    return { texto: 'Hiciste muchas descargas seguidas. Espera un minuto e intenta de nuevo.', enModal: false };
  }
  if (error.status === 503) {
    return {
      texto: error.code === 'EXPORTACION_EN_CURSO'
        ? 'Hay otra descarga en curso. Intenta de nuevo en unos segundos.'
        : 'No se pudo consultar la jerarquía en CATI. Intenta de nuevo en unos minutos.',
      enModal: false,
    };
  }
  if (error.status === 404) return { texto: 'Alguna de las versiones elegidas ya no existe. Vuelve a elegirlas.', enModal: false };
  if (error.status === 403) return { texto: 'No tienes permiso para esta acción.', enModal: false };
  return { texto: MENSAJE_DESCARGA_GENERICO, enModal: false };
}
