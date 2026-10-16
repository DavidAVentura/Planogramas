/**
 * libroXlsx.js  (infraestructura)
 * Único archivo que conoce `write-excel-file`. Recibe las hojas del dominio
 * ({ nombre, encabezados, filas: [[{ tipo, valor }]] }) y devuelve el .xlsx como Buffer.
 *
 * Seguridad: todo texto va como celda de texto (nunca fórmula, así "=HYPERLINK(...)" o "+1" no se
 * ejecutan en Excel); los números solo si son finitos; el texto se sanea de caracteres de control
 * y se trunca al máximo de una celda de Excel.
 */

const writeExcelFile = require('write-excel-file/node');

const MAX_CARACTERES_CELDA = 32767;
const CARACTERES_DE_CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g; // eslint-disable-line no-control-regex

function sanear(texto) {
  return String(texto).replace(CARACTERES_DE_CONTROL, '').slice(0, MAX_CARACTERES_CELDA);
}

/** Celda de texto o número; vacía (`null`) si no hay valor o el número no es finito. */
function construirCelda({ tipo, valor }) {
  if (valor === null || valor === undefined) return null;
  if (tipo === 'numero' && typeof valor === 'number') {
    return Number.isFinite(valor) ? { type: Number, value: valor } : null;
  }
  const texto = sanear(valor);
  return texto === '' ? null : { type: String, value: texto };
}

function construirHoja({ nombre, encabezados, filas }) {
  return {
    sheet: nombre,
    data: [
      encabezados.map((e) => ({ type: String, value: sanear(e), fontWeight: 'bold' })),
      ...filas.map((fila) => fila.map(construirCelda)),
    ],
  };
}

/**
 * @param {Array<{ nombre: string, encabezados: string[], filas: Array<Array<{ tipo: string, valor: any }>> }>} hojas
 * @returns {Promise<Buffer>}
 */
async function escribirLibroXlsx(hojas) {
  return writeExcelFile(hojas.map(construirHoja)).toBuffer();
}

module.exports = { escribirLibroXlsx, sanear };
