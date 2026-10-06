/**
 * seccion.entity.js
 * Reglas de negocio puras del dominio Sección (partición de una góndola en columnas o franjas).
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 *
 * Modelo: árbol por góndola. Una DIVISIÓN reparte su espacio entre sus hijas según `direccion`
 * (COLUMNAS: izquierda → derecha; FILAS: arriba → abajo); una HOJA es una sección con niveles.
 * `tamCm` es la medida de cada nodo en la dirección de su padre; la última hija toma lo que
 * sobre (así un cambio de ancho/alto de la góndola nunca deja huecos ni desbordes).
 * Una góndola sin nodos no está dividida: se comporta igual que antes de existir las secciones.
 */

const DIRECCIONES = Object.freeze(['COLUMNAS', 'FILAS']);

/** Medida mínima (cm) de una sección en la dirección de su padre. */
const MIN_TAM_CM = 10;

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

function errorConflict(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 409;
  err.code   = 'CONFLICT';
  if (details) err.details = details;
  return err;
}

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

/**
 * Arma el árbol a partir de las filas planas. Retorna null si la góndola no está dividida.
 * @param {Array<{id, padreId, esDivision, direccion, orden, tamCm}>} filas
 * @returns {object|null} nodo raíz con `hijos` ordenados
 */
function construirArbol(filas) {
  if (!filas.length) return null;
  const porId = new Map(filas.map((f) => [f.id, { ...f, hijos: [] }]));
  let raiz = null;
  for (const nodo of porId.values()) {
    if (nodo.padreId === null || nodo.padreId === undefined) raiz = nodo;
    else porId.get(nodo.padreId)?.hijos.push(nodo);
  }
  for (const nodo of porId.values()) nodo.hijos.sort((a, b) => a.orden - b.orden);
  return raiz;
}

/** Aplana el árbol de vuelta a filas (para persistir). */
function aplanar(raiz) {
  const filas = [];
  (function recorrer(nodo, padreId) {
    filas.push({ id: nodo.id, padreId, esDivision: nodo.esDivision, direccion: nodo.esDivision ? nodo.direccion : null, orden: nodo.orden, tamCm: nodo.tamCm });
    nodo.hijos.forEach((h, i) => { h.orden = i + 1; recorrer(h, nodo.id); });
  })(raiz, null);
  return filas;
}

/**
 * Hojas en orden de recorrido (arriba antes que abajo, izquierda antes que derecha) con su
 * rectángulo en cm, medido desde la esquina superior izquierda de la góndola.
 * @returns {Array<{nodo, x, y, ancho, alto}>}
 */
function calcularHojas(raiz, anchoCm, altoCm) {
  const out = [];
  (function recorrer(nodo, x, y, w, h) {
    if (!nodo.esDivision) { out.push({ nodo, x, y, ancho: w, alto: h }); return; }
    const total = nodo.direccion === 'COLUMNAS' ? w : h;
    let usado = 0;
    nodo.hijos.forEach((c, i) => {
      const tam = i === nodo.hijos.length - 1 ? Math.max(0, total - usado) : Number(c.tamCm);
      if (nodo.direccion === 'COLUMNAS') recorrer(c, x + usado, y, tam, h);
      else recorrer(c, x, y + usado, w, tam);
      usado += tam;
    });
  })(raiz, 0, 0, Number(anchoCm), Number(altoCm));
  return out;
}

function buscarConPadre(raiz, id) {
  let encontrado = null;
  (function recorrer(nodo, padre) {
    if (encontrado) return;
    if (nodo.id === id) { encontrado = { nodo, padre }; return; }
    nodo.hijos.forEach((h) => recorrer(h, nodo));
  })(raiz, null);
  return encontrado;
}

function validarDireccion(direccion) {
  if (!DIRECCIONES.includes(direccion)) throw errorUnprocessable(`Dirección inválida: ${direccion}`);
}

/**
 * Asigna los niveles con seccion_id null a la primera hoja (niveles creados antes de dividir o
 * por un flujo que no conoce las secciones). Muta y retorna los niveles.
 */
function asignarHuerfanos(niveles, primeraHojaId) {
  niveles.forEach((n) => { if (n.seccionId === null || n.seccionId === undefined) n.seccionId = primeraHojaId; });
  return niveles;
}

module.exports = {
  DIRECCIONES,
  MIN_TAM_CM,
  errorUnprocessable,
  errorConflict,
  errorNotFound,
  construirArbol,
  aplanar,
  calcularHojas,
  buscarConPadre,
  validarDireccion,
  asignarHuerfanos,
};
