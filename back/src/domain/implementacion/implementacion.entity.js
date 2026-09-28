/**
 * implementacion.entity.js
 * Reglas de negocio puras de la vista del Implementador (Mi tienda / Productos).
 * Sin dependencias de Express, Knex ni de CATI.
 * Ver Arquitectura/Contratos/16_implementacion/.
 */

const { ESTADOS_MONTABLES } = require('../asignacion/asignacion.entity');

/** Una versión es implementable si el % de productos con inventario es ESTRICTAMENTE mayor. */
const UMBRAL_IMPLEMENTABLE = 85;

/** Versiones que ve el Implementador: las que la tienda monta (publicado o piloto). */
const ESTADOS_VERSION_IMPLEMENTACION = ESTADOS_MONTABLES;

const ADVERTENCIA_INVENTARIO_NO_DISPONIBLE = 'Inventario no disponible en este momento';
const ADVERTENCIA_INVENTARIO_DESACTUALIZADO = 'No se pudo actualizar el inventario, se muestra el último disponible';

// ─── Errores de dominio ──────────────────────────────────────────────────────

function errorTiendaNoEncontrada() {
  const err = new Error('Tienda no encontrada o inactiva');
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorVersionNoAsignada(versionIds) {
  const err = new Error('Versión no asignada a la tienda');
  err.status  = 404;
  err.code    = 'NOT_FOUND';
  err.details = { versionIds };
  return err;
}

// ─── Reglas ──────────────────────────────────────────────────────────────────

/**
 * Normaliza un código de tienda / centro SAP para compararlos (sin mayúsculas ni espacios).
 * @param {string|null|undefined} codigo
 * @returns {string}
 */
function normalizarCodigoCentro(codigo) {
  return String(codigo ?? '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Porcentaje de productos con inventario, redondeado a 1 decimal. 0 productos → 0.
 * @param {number} conInventario
 * @param {number} totalProductos
 * @returns {number}
 */
function calcularPorcentajeInventario(conInventario, totalProductos) {
  if (!totalProductos) return 0;
  return Math.round((conInventario / totalProductos) * 1000) / 10;
}

/**
 * `porcentaje > 85`, estrictamente mayor. Se evalúa sobre el porcentaje ya redondeado a 1
 * decimal (el mismo que ve el usuario), para que 85.0 nunca aparezca como implementable.
 * @param {number} porcentaje
 * @returns {boolean}
 */
function esImplementable(porcentaje) {
  return porcentaje > UMBRAL_IMPLEMENTABLE;
}

/**
 * Un SKU tiene inventario si sus unidades en la tienda son > 0; sin fila = sin inventario.
 * @param {Map<string, number>} inventarioPorSku
 * @param {string} sku
 * @returns {number} unidades (0 si no hay fila)
 */
function unidadesEnTienda(inventarioPorSku, sku) {
  const unidades = inventarioPorSku.get(String(sku));
  return Number.isFinite(unidades) ? unidades : 0;
}

/**
 * Resumen de inventario de una versión a partir de sus SKUs distintos. Si el inventario no está
 * disponible (modo degradado), los campos derivados van en null.
 * @param {string[]} skus  SKUs distintos ACTIVO de la versión
 * @param {Map<string, number>|null} inventarioPorSku  null = inventario no disponible
 * @returns {{ totalProductos: number, conInventario: number|null, porcentajeInventario: number|null, implementable: boolean|null }}
 */
function resumirInventarioVersion(skus, inventarioPorSku) {
  const totalProductos = skus.length;
  if (!inventarioPorSku) {
    return { totalProductos, conInventario: null, porcentajeInventario: null, implementable: null };
  }

  const conInventario        = skus.filter((sku) => unidadesEnTienda(inventarioPorSku, sku) > 0).length;
  const porcentajeInventario = calcularPorcentajeInventario(conInventario, totalProductos);

  return {
    totalProductos,
    conInventario,
    porcentajeInventario,
    implementable: totalProductos > 0 && esImplementable(porcentajeInventario),
  };
}

module.exports = {
  UMBRAL_IMPLEMENTABLE,
  ESTADOS_VERSION_IMPLEMENTACION,
  ADVERTENCIA_INVENTARIO_NO_DISPONIBLE,
  ADVERTENCIA_INVENTARIO_DESACTUALIZADO,
  errorTiendaNoEncontrada,
  errorVersionNoAsignada,
  normalizarCodigoCentro,
  calcularPorcentajeInventario,
  esImplementable,
  unidadesEnTienda,
  resumirInventarioVersion,
};
