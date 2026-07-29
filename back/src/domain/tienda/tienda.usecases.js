/**
 * tienda.usecases.js
 * Casos de uso del dominio Tienda.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const { ESTADOS, validarGrupoSinVersionEspecial } = require('./tienda.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorNotFound(id) {
  const err = new Error(`Tienda ${id} no encontrada`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista las tiendas de la cadena. Por defecto solo activas; si `sinVersionEspecial`
 * viene en true, delega en la variante que excluye tiendas ya clonadas de esa base.
 * @param {object} repo
 * @param {{ tipo?, estado?, sinVersionEspecial?, planogramaId?, versionBaseId? }} filtros
 * @returns {Promise<object[]>}
 */
async function listarTiendas(repo, filtros) {
  validarGrupoSinVersionEspecial(filtros);

  const estado = filtros.estado ?? ESTADOS.ACTIVO;

  if (filtros.sinVersionEspecial) {
    return repo.listarDisponiblesParaVersionEspecial({
      planogramaId:  filtros.planogramaId,
      versionBaseId: filtros.versionBaseId,
      tipo:          filtros.tipo,
      estado,
    });
  }

  return repo.listar({ tipo: filtros.tipo, estado });
}

/**
 * Retorna los planogramas publicados asignados a una tienda.
 * @param {object} repo
 * @param {number} tiendaId
 * @param {{ departamento? }} filtros
 * @returns {Promise<{ tienda: object, planogramas: object[], mensaje?: string }>}
 */
async function obtenerPlanogramasDeTienda(repo, tiendaId, filtros) {
  const tienda = await repo.buscarPorId(tiendaId);
  if (!tienda) throw errorNotFound(tiendaId);

  const planogramas = await repo.listarPlanogramasPublicados(tiendaId, filtros);

  return {
    tienda,
    planogramas,
    ...(planogramas.length === 0 && { mensaje: 'No hay planogramas publicados asignados a esta tienda' }),
  };
}

module.exports = {
  listarTiendas,
  obtenerPlanogramasDeTienda,
};
