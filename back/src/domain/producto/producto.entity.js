/**
 * producto.entity.js
 * Reglas de negocio puras del dominio Producto (tabla local, distinta del catálogo CATI).
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

/** Valores permitidos de fuente_dimensiones: de dónde vino la última medida guardada. */
const FUENTES_DIMENSIONES = Object.freeze(['CATI', 'VTEX', 'MANUAL']);

/**
 * Niveles de la jerarquía CATI, del más específico al más general. La tabla local no guarda
 * familia ni categoría (y área/departamento pueden quedar desactualizados): el filtro por
 * jerarquía siempre se resuelve en vivo contra CATI, que devuelve los SKUs del nivel elegido.
 */
const NIVELES_JERARQUIA = Object.freeze(['subcategoria', 'categoria', 'familia', 'departamento', 'area']);

/** Modos de Posicion que cuentan como aparición del producto en un planograma. */
const MODOS_APARICION = Object.freeze(['PLANOGRAMA', 'CROSS', 'IMPULSO']);

/**
 * Elige el nivel más específico de los filtros de jerarquía recibidos — el resto de niveles
 * superiores quedan implícitos (una subcategoría ya pertenece a su categoría, familia, etc.).
 * @param {Record<string, string|undefined>} filtros
 * @returns {{ nivel: string, id: string } | null} null si no se filtró por jerarquía
 */
function nivelJerarquiaMasEspecifico(filtros) {
  const nivel = NIVELES_JERARQUIA.find((n) => filtros[n]);
  return nivel ? { nivel, id: filtros[nivel] } : null;
}

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

/**
 * Valida que las tres dimensiones físicas estén completas y sean mayores a 0 — requisito
 * para poder marcar dimensiones_validadas=true (CU-04-13).
 * @param {{ ancho_cm: number|null, alto_cm: number|null, profundidad_cm: number|null }} dimensiones
 */
function validarDimensionesCompletas({ ancho_cm, alto_cm, profundidad_cm }) {
  const incompleta = [ancho_cm, alto_cm, profundidad_cm].some(
    (valor) => valor === null || valor === undefined || Number(valor) <= 0,
  );
  if (incompleta) {
    throw errorUnprocessable('Las tres dimensiones (ancho, alto, profundidad) deben ser mayores a 0 para validar', {
      ancho_cm, alto_cm, profundidad_cm,
    });
  }
}

module.exports = {
  FUENTES_DIMENSIONES,
  NIVELES_JERARQUIA,
  MODOS_APARICION,
  nivelJerarquiaMasEspecifico,
  errorNotFound,
  errorUnprocessable,
  validarDimensionesCompletas,
};
