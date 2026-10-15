/**
 * ganchos.schema.js
 * Esquema Joi común de ganchos (importar-productos, importar-layout, POST y PATCH de posiciones).
 * Un gancho es un número (normal, 54) o texto "<n>E" (de exhibición, "54E").
 *
 * Prohibido agregar Joi.number(), Joi.alternatives() o pattern: convertirían "5E1", "1e2", "+54"
 * o "54.0" en números en silencio. `unique()` se aplica sobre los valores ya convertidos.
 */

const Joi = require('joi');
const { normalizarGancho } = require('../../domain/compartido/gancho');

// Única regla de gancho: la misma función que normaliza las lecturas de BD.
const schemaGancho = Joi.any().custom((valor, helpers) => {
  const gancho = normalizarGancho(valor);
  return gancho === null ? helpers.error('any.invalid') : gancho;
}).messages({ 'any.invalid': '{{#label}} debe ser un número de gancho entero (1-999999) o de exhibición como 54E' });

const schemaGanchos = Joi.array().items(schemaGancho).max(100).unique();

module.exports = { schemaGanchos };
