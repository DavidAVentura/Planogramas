/**
 * libroXlsx.js  (infraestructura)
 * Único archivo que conoce `write-excel-file`. Recibe las hojas del dominio
 * ({ nombre, encabezados, filas: [[{ tipo, valor }]], y opcionalmente `grupos`, `anchos`, `congelarFilas`,
 * `congelarColumnas` }) y devuelve el .xlsx como Buffer.
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

/**
 * Fila de grupo (opcional): el título va en la celda `desde` combinada sobre su bloque
 * (`columnSpan`); el resto de la fila queda vacío. Los títulos pasan por `sanear` como cualquier texto.
 */
function filaDeGrupos(grupos, anchoFila) {
  const fila = Array.from({ length: anchoFila }, () => null);
  grupos.forEach(({ titulo, desde, hasta }) => {
    fila[desde] = { type: String, value: sanear(titulo), fontWeight: 'bold', columnSpan: hasta - desde + 1, align: 'center' };
  });
  return fila;
}

function construirHoja({ nombre, grupos, encabezados, filas, anchos, congelarFilas, congelarColumnas }) {
  const hoja = {
    sheet: nombre,
    data: [
      ...(grupos ? [filaDeGrupos(grupos, encabezados.length)] : []),
      encabezados.map((e) => ({ type: String, value: sanear(e), fontWeight: 'bold' })),
      ...filas.map((fila) => fila.map(construirCelda)),
    ],
  };
  if (anchos) hoja.columns = anchos.map((width) => ({ width }));
  if (congelarFilas) hoja.stickyRowsCount = congelarFilas;
  if (congelarColumnas) hoja.stickyColumnsCount = congelarColumnas;
  return hoja;
}

/**
 * @param {Array<{ nombre: string, encabezados: string[], filas: Array<Array<{ tipo: string, valor: any }>>,
 *   grupos?: Array<{ titulo: string, desde: number, hasta: number }>, anchos?: number[],
 *   congelarFilas?: number, congelarColumnas?: number }>} hojas
 * @returns {Promise<Buffer>}
 */
async function escribirLibroXlsx(hojas) {
  return writeExcelFile(hojas.map(construirHoja)).toBuffer();
}

module.exports = { escribirLibroXlsx, sanear, construirHoja };
