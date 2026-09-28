/**
 * asignacion.usecases.js
 * Casos de uso de la asignación versión ↔ tienda (vista Estructura).
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const {
  ORIGENES,
  calcularAccion,
  validarVersionMontable,
  validarBaseParaEspecial,
  validarSinCeldasRepetidas,
} = require('./asignacion.entity');
const { generarCodigoEspecial } = require('../version/version.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function error(status, code, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  err.code   = code;
  return err;
}

function indexarPorId(filas) {
  return new Map(filas.map((f) => [f.id, f]));
}

function unicos(valores) {
  return [...new Set(valores.filter((v) => v !== null && v !== undefined))];
}

async function cargarReferencias(repo, cambios) {
  const [tiendas, planogramas, versiones] = await Promise.all([
    repo.buscarTiendas(unicos(cambios.map((c) => c.tiendaId))),
    repo.buscarPlanogramas(unicos(cambios.map((c) => c.planogramaId))),
    repo.buscarVersiones(unicos(cambios.flatMap((c) => [c.versionId, c.crearEspecialDesde]))),
  ]);
  return { tiendas: indexarPorId(tiendas), planogramas: indexarPorId(planogramas), versiones: indexarPorId(versiones) };
}

function validarTiendaYPlanograma(cambio, refs) {
  const tienda = refs.tiendas.get(cambio.tiendaId);
  if (!tienda) throw error(404, 'NOT_FOUND', `Tienda ${cambio.tiendaId} no encontrada`);
  if (tienda.estado !== 'activo') throw error(422, 'UNPROCESSABLE', `La tienda ${tienda.codigo} está inactiva`);

  const planograma = refs.planogramas.get(cambio.planogramaId);
  if (!planograma) throw error(404, 'NOT_FOUND', `Planograma ${cambio.planogramaId} no encontrado`);
  if (planograma.estado === 'archivado') throw error(422, 'UNPROCESSABLE', `El planograma ${planograma.nombre} está archivado`);

  return { tienda, planograma };
}

function buscarVersion(refs, id) {
  const version = refs.versiones.get(id);
  if (!version) throw error(404, 'NOT_FOUND', `Versión ${id} no encontrada`);
  return version;
}

/** Destino de la celda: una versión existente, una especial por clonar o null (quitar). */
async function resolverDestino(repo, cambio, refs, tienda, planograma) {
  if (cambio.crearEspecialDesde) {
    const base = buscarVersion(refs, cambio.crearEspecialDesde);
    validarBaseParaEspecial(base, planograma.id);
    if (await repo.tiendaTieneEspecialDeBase(base.id, tienda.id)) {
      throw error(409, 'CONFLICT', `La tienda ${tienda.codigo} ya tiene una versión especial derivada de ${base.codigo}`);
    }
    const codigo = generarCodigoEspecial(planograma.nombre, base.tipo, tienda.codigo);
    return {
      nueva: { id: null, codigo, estado: 'publicado' },
      especialNueva: { versionBaseId: base.id, tipo: base.tipo, codigo },
    };
  }

  if (!cambio.versionId) return { nueva: null };

  const version = buscarVersion(refs, cambio.versionId);
  validarVersionMontable(version, planograma.id, tienda.id);
  return { nueva: { id: version.id, codigo: version.codigo, estado: version.estado } };
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Matriz planograma × tienda de la vista Estructura.
 * @param {object} repo
 * @returns {Promise<object>}
 */
async function obtenerMatriz(repo) {
  return repo.obtenerMatriz();
}

/**
 * Guarda un grupo de cambios de asignación como una sola edición auditada.
 * Cada cambio lleva `versionId` (montar esa versión), `crearEspecialDesde` (clonar una especial
 * publicada desde esa base y montarla) o ninguno de los dos (quitar el planograma de la tienda).
 * @param {object} repo
 * @param {{ cambios: object[], motivo?: string }} datos
 * @param {{ numero, nombre }} usuario
 * @returns {Promise<{ edicionId, fecha, cambios: number, especialesCreadas: object[] }>}
 */
async function guardarEdicion(repo, datos, usuario) {
  validarSinCeldasRepetidas(datos.cambios);

  const refs = await cargarReferencias(repo, datos.cambios);
  const actuales = await repo.asignacionesActuales(datos.cambios);

  const operaciones = [];
  for (const cambio of datos.cambios) {
    const { tienda, planograma } = validarTiendaYPlanograma(cambio, refs);
    const { nueva, especialNueva } = await resolverDestino(repo, cambio, refs, tienda, planograma);
    const anterior = actuales[`${planograma.id}|${tienda.id}`] ?? null;
    const accion = calcularAccion(anterior, nueva, { creaEspecial: Boolean(especialNueva) });
    if (!accion) continue;
    operaciones.push({ planogramaId: planograma.id, tiendaId: tienda.id, accion, anterior, nueva, especialNueva });
  }

  if (operaciones.length === 0) {
    throw error(422, 'UNPROCESSABLE', 'Ninguno de los cambios modifica la asignación actual');
  }

  const resultado = await repo.aplicarEdicion(
    { usuario, motivo: datos.motivo || null, origen: ORIGENES.MANUAL },
    operaciones,
  );
  return { ...resultado, cambios: operaciones.length };
}

/**
 * Historial de una celda planograma × tienda.
 * @param {object} repo
 * @param {{ planogramaId: number, tiendaId: number }} filtros
 * @returns {Promise<{ eventos: object[] }>}
 */
async function listarHistorial(repo, filtros) {
  const eventos = await repo.listarHistorial(filtros.planogramaId, filtros.tiendaId);
  return { eventos };
}

module.exports = {
  obtenerMatriz,
  guardarEdicion,
  listarHistorial,
};
