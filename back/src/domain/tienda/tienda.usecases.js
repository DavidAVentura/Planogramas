/**
 * tienda.usecases.js
 * Casos de uso del dominio Tienda.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const { ESTADOS, FILTRO_ESTADO_TODOS, validarGrupoSinVersionEspecial } = require('./tienda.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorNotFound(id) {
  const err = new Error(`Tienda ${id} no encontrada`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorCodigoDuplicado(codigo) {
  const err = new Error(`Ya existe una tienda con el código ${codigo}`);
  err.status = 409;
  err.code   = 'CONFLICT';
  return err;
}

/** `estado` omitido = solo activas; `todos` = sin filtro (null para el repositorio). */
function resolverFiltroEstado(estado) {
  if (estado === FILTRO_ESTADO_TODOS) return null;
  return estado ?? ESTADOS.ACTIVO;
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

  const estado = resolverFiltroEstado(filtros.estado);

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
 * Crea una tienda nueva, siempre en estado activo. El código es único en toda la cadena.
 * @param {object} repo
 * @param {{ codigo, nombre, tipo, marca?, region? }} datos
 * @returns {Promise<object>}
 */
async function crearTienda(repo, datos) {
  if (await repo.existeCodigo(datos.codigo)) throw errorCodigoDuplicado(datos.codigo);

  return repo.crear({
    codigo: datos.codigo,
    nombre: datos.nombre,
    tipo:   datos.tipo,
    marca:  datos.marca ?? null,
    region: datos.region ?? null,
    estado: ESTADOS.ACTIVO,
  });
}

/**
 * Edita los datos de una tienda (partial update). También activa/desactiva vía `estado`:
 * desactivar no toca sus asignaciones a versiones, solo la saca de los listados por defecto.
 * @param {object} repo
 * @param {number} id
 * @param {{ codigo?, nombre?, tipo?, marca?, region?, estado? }} cambios
 * @returns {Promise<object>}
 */
async function editarTienda(repo, id, cambios) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw errorNotFound(id);

  if (cambios.codigo !== undefined && cambios.codigo !== actual.codigo
      && await repo.existeCodigo(cambios.codigo, id)) {
    throw errorCodigoDuplicado(cambios.codigo);
  }

  return repo.editar(id, cambios);
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
  crearTienda,
  editarTienda,
  obtenerPlanogramasDeTienda,
};
