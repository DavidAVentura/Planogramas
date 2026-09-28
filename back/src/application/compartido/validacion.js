/**
 * validacion.js
 * Helpers de validación de request de los módulos 16_implementacion y 17_evidencias. Los errores
 * usan el código genérico `VALIDATION_ERROR` (400); los de Joi se relanzan tal cual para que los
 * formatee el errorHandler global, igual que en el resto del backend.
 */

const CODIGO_VALIDACION = 'VALIDATION_ERROR';

function errorValidacion(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = CODIGO_VALIDACION;
  if (details) err.details = details;
  return err;
}

/**
 * Parsea un entero positivo estricto (rechaza "12abc", "0", "-1", "1.5").
 * @param {any} valor
 * @param {string} nombre  nombre del parámetro, para el mensaje
 * @returns {number}
 */
function parsearEnteroPositivo(valor, nombre) {
  const texto = String(valor ?? '').trim();
  if (!/^[1-9]\d*$/.test(texto) || !Number.isSafeInteger(Number(texto))) {
    throw errorValidacion(`${nombre} debe ser un entero positivo`);
  }
  return Number(texto);
}

/**
 * Parsea una lista de enteros positivos separados por coma (`10,12`). Acepta también el
 * parámetro repetido (`?ids=10&ids=12`). `undefined` si el parámetro no viene. Sin duplicados.
 * @param {any} valor
 * @param {string} nombre
 * @returns {number[]|undefined}
 */
function parsearListaEnterosPositivos(valor, nombre) {
  if (valor === undefined) return undefined;
  const texto = Array.isArray(valor) ? valor.join(',') : String(valor);
  const partes = texto.split(',').map((p) => p.trim());
  if (partes.some((p) => !/^[1-9]\d*$/.test(p) || !Number.isSafeInteger(Number(p)))) {
    throw errorValidacion(`Cada elemento de ${nombre} debe ser un entero positivo`);
  }
  return [...new Set(partes.map(Number))];
}

/**
 * Valida con Joi. Si falla, relanza el error de Joi (el errorHandler global responde
 * 400 VALIDATION_ERROR con los mensajes en details).
 * @param {import('joi').Schema} schema
 * @param {any} datos
 * @returns {any} valor validado
 */
function validarConJoi(schema, datos) {
  const { error, value } = schema.validate(datos, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

/**
 * Usuario del JWT (lo deja el middleware de autenticación en `req.usuario`).
 * @param {import('express').Request} req
 * @returns {string}
 */
function usuarioActual(req) {
  const usuario = req.usuario?.usuario ?? req.usuario?.id;
  return usuario === undefined || usuario === null || usuario === '' ? 'sistema' : String(usuario);
}

module.exports = {
  errorValidacion,
  parsearEnteroPositivo,
  parsearListaEnterosPositivos,
  validarConJoi,
  usuarioActual,
};
