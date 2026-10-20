/**
 * esquemasComunes.js
 * Fragmentos Joi compartidos por los esquemas de los módulos 16 (implementación) y 21 (consolidado):
 * csv de enteros positivos seguros y código de nivel de la jerarquía CATI.
 */

const Joi = require('joi');

const PATRON_LISTA_ENTEROS = /^[1-9]\d*(,[1-9]\d*)*$/;
const PATRON_JERARQUIA = /^[A-Za-z0-9_-]{1,20}$/;

/** csv de enteros positivos seguros, únicos y con tope → number[]. */
function listaEnteros(maxCaracteres, maxElementos) {
  return Joi.string()
    .max(maxCaracteres)
    .pattern(PATRON_LISTA_ENTEROS)
    .messages({
      'string.pattern.base': '{{#label}} debe ser una lista de enteros positivos separados por coma',
      'string.max': '{{#label}} excede la longitud máxima permitida',
    })
    .custom((valor, helpers) => {
      if (!PATRON_LISTA_ENTEROS.test(valor)) return valor; // ya lo reporta `pattern`
      const numeros = valor.split(',').map(Number);
      if (!numeros.every(Number.isSafeInteger)) return helpers.message('{{#label}} contiene un entero fuera de rango');
      if (new Set(numeros).size !== numeros.length) return helpers.message('{{#label}} contiene valores repetidos');
      if (numeros.length > maxElementos) return helpers.message(`{{#label}} admite como máximo ${maxElementos} elementos`);
      return numeros;
    });
}

const nivelJerarquia = () => Joi.string()
  .pattern(PATRON_JERARQUIA)
  .messages({ 'string.pattern.base': '{{#label}} debe ser un código de 1 a 20 caracteres (letras, números, guion o guion bajo)' });

module.exports = { PATRON_JERARQUIA, PATRON_LISTA_ENTEROS, listaEnteros, nivelJerarquia };
