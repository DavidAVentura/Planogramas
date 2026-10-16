/**
 * autor.js
 * Regla única para registrar quién cargó un archivo (evidencias y adjuntos): número de empleado
 * y nombre tomados del token CAO, nunca del body. Sin dependencias de Express ni Knex.
 */

const LONGITUD_MAXIMA_NOMBRE_AUTOR = 150;

// Controles (\p{Cc}) se vuelven espacio; los de formato (\p{Cf}: bidi, ancho cero, BOM) se eliminan.
const CONTROLES = /\p{Cc}/gu;
const FORMATO   = /\p{Cf}/gu;

function sanearNombre(nombre) {
  const limpio = nombre.replace(FORMATO, '').replace(CONTROLES, ' ').replace(/\s+/g, ' ').trim();
  // Recorte por unidades UTF-16 (como nvarchar(150)) sin partir un par sustituto (emoji).
  let recorte = '';
  for (const caracter of limpio) {
    if (recorte.length + caracter.length > LONGITUD_MAXIMA_NOMBRE_AUTOR) break;
    recorte += caracter;
  }
  return recorte.trim();
}

/**
 * Normaliza el autor de una carga.
 * El número no se transforma (solo `String`): `puedeEliminar` lo compara tal cual con el del JWT.
 * Un número vacío o `'sistema'` es un error de autenticación/programación (500), no del usuario.
 * @param {{ numero: string, nombre: string }} autor  de `usuarioAuditoria(req)`
 * @returns {{ subido_por: string, subido_por_nombre: string|null }}
 */
function normalizarAutor({ numero, nombre } = {}) {
  if (numero === undefined || numero === null || String(numero).trim() === '' || String(numero) === 'sistema') {
    throw new Error('La carga no tiene número de empleado del usuario autenticado');
  }

  const subido_por = String(numero);
  const saneado    = typeof nombre === 'string' ? sanearNombre(nombre) : '';

  return {
    subido_por,
    subido_por_nombre: saneado === '' || saneado === subido_por ? null : saneado,
  };
}

module.exports = { LONGITUD_MAXIMA_NOMBRE_AUTOR, normalizarAutor };
