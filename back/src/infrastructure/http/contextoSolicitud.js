/**
 * contextoSolicitud.js
 * Contexto por request (AsyncLocalStorage). Lo abre el middleware de autenticación con el JWT
 * CAO del usuario, para que adaptadores profundos (ej. tokenManager de CATI) lo lean sin tener
 * que pasarlo por cada controller → usecase → repositorio.
 */

const { AsyncLocalStorage } = require('node:async_hooks');

const almacen = new AsyncLocalStorage();

/**
 * Ejecuta `fn` dentro de un contexto con los datos dados.
 * @param {{ tokenCAO: string, usuario: object }} datos
 * @param {() => void} fn
 */
function ejecutarConContexto(datos, fn) {
  return almacen.run(datos, fn);
}

/** @returns {{ tokenCAO: string, usuario: object } | undefined} */
function obtenerContexto() {
  return almacen.getStore();
}

module.exports = { ejecutarConContexto, obtenerContexto };
