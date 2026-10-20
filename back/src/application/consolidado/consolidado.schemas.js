/**
 * consolidado.schemas.js
 * Esquemas Joi de la query del Consolidado Tiendas (módulo 21). Se validan con
 * `validarQueryEstricta` (sin `stripUnknown`: un parámetro desconocido es 400). Las listas llegan
 * como csv con tope de longitud ANTES de dividirlas; un parámetro repetido (arreglo) no es string
 * y falla. Los enumerados solo se aceptan de una lista permitida: ningún valor de la query se usa
 * como SQL ni como propiedad dinámica.
 */

const Joi = require('joi');

const { MODOS, FORMATOS } = require('../../domain/consolidado/consolidado.entity');
const { CLAVES_COLUMNAS_CONSOLIDADO, columnasInvalidas } = require('../../domain/consolidado/columnas');
const { errorValidacion } = require('../compartido/validacion');
const { listaEnteros, nivelJerarquia } = require('../compartido/esquemasComunes');

const ESTADOS_FILTRO = Object.freeze(['publicado', 'piloto']);
const ORDENES = Object.freeze(['sku', 'producto', 'tienda', 'version']);
const TAMANOS_PAGINA = Object.freeze([25, 50, 100, 200]);
const MAX_COLUMNAS = CLAVES_COLUMNAS_CONSOLIDADO.length;
const MAX_CARACTERES_COLUMNAS = 600;
const MAX_CARACTERES_CLAVE_ECO = 40;

/** csv de valores de una lista permitida, únicos, entre `min` y `max` elementos → string[]. */
function listaEnum(valores, min, max) {
  return Joi.string()
    .max(100)
    .messages({ 'string.max': '{{#label}} excede la longitud máxima permitida' })
    .custom((valor, helpers) => {
      const partes = valor.split(',');
      if (!partes.every((p) => valores.includes(p))) return helpers.message(`{{#label}} solo admite: ${valores.join(', ')}`);
      if (new Set(partes).size !== partes.length) return helpers.message('{{#label}} contiene valores repetidos');
      if (partes.length < min || partes.length > max) return helpers.message(`{{#label}} admite entre ${min} y ${max} elementos`);
      return partes;
    });
}

/** csv de claves de columna (únicas, ≤ 24). Que existan en la lista blanca lo verifica `verificarColumnas`. */
function listaColumnas() {
  return Joi.string()
    .max(MAX_CARACTERES_COLUMNAS)
    .messages({ 'string.max': '{{#label}} excede la longitud máxima permitida' })
    .custom((valor, helpers) => {
      const partes = valor.split(',');
      if (partes.length > MAX_COLUMNAS) return helpers.message(`{{#label}} admite como máximo ${MAX_COLUMNAS} columnas`);
      if (new Set(partes).size !== partes.length) return helpers.message('{{#label}} contiene columnas repetidas');
      return partes;
    });
}

/** Filtros comunes del listado y de la exportación. */
const filtrosComunes = {
  tiendaIds:      listaEnteros(2000, 200),
  versionIds:     listaEnteros(5000, 500),
  estados:        listaEnum(ESTADOS_FILTRO, 1, ESTADOS_FILTRO.length),
  area:           nivelJerarquia(),
  departamento:   nivelJerarquia(),
  familia:        nivelJerarquia(),
  categoria:      nivelJerarquia(),
  subcategoria:   nivelJerarquia(),
  busqueda:       Joi.string().trim().max(100).allow('').default(''),
};

const schemaListado = Joi.object({
  ...filtrosComunes,
  vista:          Joi.string().valid(...MODOS).default('PLANOGRAMA'),
  soloDuplicados: Joi.boolean().default(false).when('vista', {
    is: Joi.valid('CROSS', 'IMPULSO'),
    then: Joi.boolean().invalid(true).messages({ 'any.invalid': '{{#label}} solo aplica en la vista PLANOGRAMA' }),
  }),
  page:           Joi.number().integer().min(1).max(10000).default(1),
  pageSize:       Joi.number().valid(...TAMANOS_PAGINA).default(50),
  orden:          Joi.string().valid(...ORDENES).default('sku'),
  direccion:      Joi.string().valid('asc', 'desc').default('asc'),
});

const schemaFiltros = Joi.object({});

const schemaExportar = Joi.object({
  ...filtrosComunes,
  soloDuplicados: Joi.boolean().default(false),
  formato:        Joi.string().valid(...FORMATOS).required(),
  hojas:          Joi.when('formato', {
    is: 'HOJAS',
    then: listaEnum(MODOS, 1, MODOS.length).required(),
    otherwise: Joi.forbidden(),
  }),
  columnas:       listaColumnas().required(),
});

/**
 * Lanza 400 con `details.columnasInvalidas` si alguna clave no está en la lista blanca.
 * Los valores se devuelven acotados: la lista no puede reflejar texto arbitrario largo.
 */
function verificarColumnas(columnas) {
  const invalidas = columnasInvalidas(columnas);
  if (invalidas.length > 0) {
    throw errorValidacion('Columnas no permitidas', {
      columnasInvalidas: invalidas.map((c) => String(c).slice(0, MAX_CARACTERES_CLAVE_ECO)),
    });
  }
  return columnas;
}

module.exports = { schemaListado, schemaFiltros, schemaExportar, verificarColumnas, TAMANOS_PAGINA, ORDENES };
