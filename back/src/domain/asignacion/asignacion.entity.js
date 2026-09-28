/**
 * asignacion.entity.js
 * Reglas de negocio puras de la asignación versión ↔ tienda (vista Estructura).
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 *
 * Regla central: una tienda monta UNA sola versión por planograma, publicada (TG/TM/TE o su
 * especial) o en piloto. Montar la piloto en una tienda desmonta su publicada solo en esa tienda.
 */

const { ESTADOS } = require('../version/version.entity');

/** Estados de versión que una tienda puede tener montados. El resto no cuenta como asignación. */
const ESTADOS_MONTABLES = Object.freeze([ESTADOS.PUBLICADO, ESTADOS.PILOTO]);

const ACCIONES = Object.freeze({
  ASIGNACION:        'ASIGNACION',
  CAMBIO:            'CAMBIO',
  RETIRO:            'RETIRO',
  CREACION_ESPECIAL: 'CREACION_ESPECIAL',
  ENTRADA_PILOTO:    'ENTRADA_PILOTO',
  SALIDA_PILOTO:     'SALIDA_PILOTO',
  PILOTO_PUBLICADO:  'PILOTO_PUBLICADO',
});

/** Quién o qué originó una edición. */
const ORIGENES = Object.freeze({
  MANUAL:      'MANUAL',      // matriz de Estructura
  VERSION:     'VERSION',     // "Tiendas asignadas" en el detalle del planograma
  PILOTO:      'PILOTO',      // promover una versión a piloto
  PUBLICACION: 'PUBLICACION', // publicar una versión (mueve tiendas de la anterior y de piloto)
});

/** Usuario que se registra mientras no exista autenticación (CAO, ver MEMORIA_PROYECTO.md). */
const USUARIO_SISTEMA = Object.freeze({ numero: 'sistema', nombre: 'sistema' });

function error(status, code, mensaje, details) {
  const err = new Error(mensaje);
  err.status = status;
  err.code   = code;
  if (details) err.details = details;
  return err;
}

function esMontable(estado) {
  return ESTADOS_MONTABLES.includes(estado);
}

/**
 * Acción de auditoría para una celda que pasa de `anterior` a `nueva` (cada una `{ id, estado }`
 * o null). Retorna null si no cambia nada (misma versión, mismo estado).
 * @param {{ id, estado }|null} anterior
 * @param {{ id, estado }|null} nueva
 * @param {{ creaEspecial?: boolean }} [opciones]
 * @returns {string|null}
 */
function calcularAccion(anterior, nueva, { creaEspecial = false } = {}) {
  if (!nueva) return anterior ? ACCIONES.RETIRO : null;
  if (creaEspecial) return ACCIONES.CREACION_ESPECIAL;
  if (anterior && anterior.id === nueva.id) {
    const sePublico = anterior.estado === ESTADOS.PILOTO && nueva.estado === ESTADOS.PUBLICADO;
    return sePublico ? ACCIONES.PILOTO_PUBLICADO : null;
  }
  if (nueva.estado === ESTADOS.PILOTO) return ACCIONES.ENTRADA_PILOTO;
  if (anterior && anterior.estado === ESTADOS.PILOTO) return ACCIONES.SALIDA_PILOTO;
  return anterior ? ACCIONES.CAMBIO : ACCIONES.ASIGNACION;
}

/**
 * Valida que `version` se pueda montar en la tienda para ese planograma.
 * @param {{ id, planogramaId, estado, versionBaseId, tiendaEspecialId }} version
 * @param {number} planogramaId
 * @param {number} tiendaId
 */
function validarVersionMontable(version, planogramaId, tiendaId) {
  if (version.planogramaId !== planogramaId) {
    throw error(422, 'UNPROCESSABLE', `La versión ${version.id} no pertenece al planograma ${planogramaId}`);
  }
  if (!esMontable(version.estado)) {
    throw error(422, 'UNPROCESSABLE', `La versión ${version.id} está en estado '${version.estado}'; solo se asignan versiones publicadas o en piloto`);
  }
  if (version.versionBaseId !== null && version.tiendaEspecialId !== tiendaId) {
    throw error(422, 'UNPROCESSABLE', `La versión ${version.id} es especial de otra tienda`);
  }
}

/**
 * Valida la versión base desde la que se clona una especial nueva: línea base publicada del
 * mismo planograma.
 * @param {{ id, planogramaId, estado, versionBaseId }} base
 * @param {number} planogramaId
 */
function validarBaseParaEspecial(base, planogramaId) {
  if (base.planogramaId !== planogramaId || base.versionBaseId !== null || base.estado !== ESTADOS.PUBLICADO) {
    throw error(422, 'UNPROCESSABLE', `La versión ${base.id} no es una versión base publicada del planograma ${planogramaId}`);
  }
}

/**
 * Cada celda planograma × tienda aparece a lo sumo una vez en una edición.
 * @param {{ planogramaId, tiendaId }[]} cambios
 */
function validarSinCeldasRepetidas(cambios) {
  const vistas = new Set();
  const repetidas = [];
  cambios.forEach((c) => {
    const clave = `${c.planogramaId}|${c.tiendaId}`;
    if (vistas.has(clave)) repetidas.push(clave);
    vistas.add(clave);
  });
  if (repetidas.length > 0) {
    throw error(400, 'VALIDATION_ERROR', 'Una celda planograma × tienda aparece más de una vez', repetidas);
  }
}

module.exports = {
  ESTADOS_MONTABLES,
  ACCIONES,
  ORIGENES,
  USUARIO_SISTEMA,
  esMontable,
  calcularAccion,
  validarVersionMontable,
  validarBaseParaEspecial,
  validarSinCeldasRepetidas,
};
