/**
 * implementacion.schemas.js
 * Esquema Joi del cuerpo de POST /implementacion/productos/exportar (CU-10-06). Se valida con
 * `validarQueryEstricta` (clave desconocida = 400). Los ids son enteros positivos seguros, únicos y
 * con tope; los números no se convierten desde texto (`strict`). Los ids de posición nunca se usan
 * como parámetros de SQL: solo acotan en memoria lo que el servidor ya calculó.
 */

const Joi = require('joi');

const { nivelJerarquia } = require('../compartido/esquemasComunes');
const { FORMATOS_DESCARGA } = require('../../domain/implementacion/exportacionPorVersion.entity');

const MAX_VERSIONES = 50;
const MAX_POSICIONES = 30000;

const idEntero = () => Joi.number().strict().integer().positive().max(Number.MAX_SAFE_INTEGER);

const schemaExportar = Joi.object({
  versionIds:  Joi.array().items(idEntero()).unique().min(1).max(MAX_VERSIONES).required(),
  formato:     Joi.string().valid(...FORMATOS_DESCARGA).required(),
  area:        nivelJerarquia(),
  departamento: nivelJerarquia().when('area', {
    not: Joi.exist(),
    then: Joi.forbidden().messages({ 'any.unknown': '{{#label}} requiere area' }),
  }),
  posicionIds: Joi.array().items(idEntero()).unique().max(MAX_POSICIONES),
});

module.exports = { schemaExportar, MAX_VERSIONES, MAX_POSICIONES };
