/**
 * gancho.js
 * Única regla de ganchos del backend. Forma canónica: número (gancho normal, 54) o texto "<n>E"
 * (gancho de exhibición, "54E"), n entero 1..999999. `54` y `"54E"` son ganchos distintos.
 * Sin dependencias.
 */

const MAXIMO_GANCHO = 999999;
const PATRON_TEXTO = /^0*([1-9]\d{0,5})(E?)$/;

/** Devuelve el gancho en forma canónica o `null` si no es válido. */
function normalizarGancho(valor) {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) && valor >= 1 && valor <= MAXIMO_GANCHO ? valor : null;
  }
  if (typeof valor !== 'string') return null;
  const m = PATRON_TEXTO.exec(valor.trim().toUpperCase());
  if (!m) return null;
  const numero = Number(m[1]);
  return m[2] ? `${numero}E` : numero;
}

function numeroGancho(g) {
  return typeof g === 'number' ? g : parseInt(g, 10);
}

function esGanchoExhibicion(g) {
  return typeof g === 'string';
}

/** Por número; a igual número, el normal antes que el de exhibición. */
function compararGanchos(a, b) {
  return (numeroGancho(a) - numeroGancho(b)) || (Number(esGanchoExhibicion(a)) - Number(esGanchoExhibicion(b)));
}

/** Texto de presentación: número con 2 dígitos ("05"), exhibición tal cual ("54E"). */
function textoGancho(g) {
  return typeof g === 'number' ? String(g).padStart(2, '0') : String(g);
}

/**
 * Lee el JSON de la columna `Posicion.ganchos`. Tolerante: descarta valores no canónicos y repetidos.
 * Es el único `JSON.parse` de ganchos del backend.
 * @returns {Array<number|string>|null} `null` si no hay ganchos válidos
 */
function parsearGanchosJson(texto) {
  if (!texto) return null;
  let valor;
  try {
    valor = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!Array.isArray(valor)) return null;
  const ganchos = [...new Set(valor.map(normalizarGancho).filter((g) => g !== null))];
  return ganchos.length ? ganchos : null;
}

module.exports = { normalizarGancho, numeroGancho, esGanchoExhibicion, compararGanchos, parsearGanchosJson, textoGancho };
