/**
 * planograma.usecases.js
 * Casos de uso del dominio Planograma.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 */

const {
  calcularEstadoInicial,
  validarEstadoParaArchivar,
  validarEstadoParaEditar,
  ESTADOS,
} = require('./planograma.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorNotFound(id) {
  const err = new Error(`Planograma ${id} no encontrado`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorNombreDuplicado() {
  const err = new Error('Ya existe un planograma con ese nombre en el departamento indicado');
  err.status = 409;
  err.code   = 'CONFLICT';
  return err;
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista planogramas con filtros y paginación.
 * @param {object} repo  Repositorio de planogramas
 * @param {{ departamento?, estado?, search?, page?, pageSize? }} filtros
 * @returns {Promise<{ data: object[], total: number, page: number, pageSize: number }>}
 */
async function listarPlanogramas(repo, filtros) {
  const page     = Math.max(1, parseInt(filtros.page     ?? 1,  10));
  const pageSize = Math.max(1, parseInt(filtros.pageSize ?? 20, 10));

  const { data, total } = await repo.listar({ ...filtros, page, pageSize });

  return { data, total, page, pageSize };
}

/**
 * Crea un planograma nuevo.
 * @param {object} repo
 * @param {{ nombre: string, departamento: string, subcategorias: string[] }} datos
 * @param {string} userId
 * @returns {Promise<object>} Planograma creado (detalle completo)
 */
async function crearPlanograma(repo, datos, userId) {
  const duplicado = await repo.existeNombreEnDepartamento(datos.nombre, datos.departamento);
  if (duplicado) throw errorNombreDuplicado();

  const planograma = {
    nombre:       datos.nombre,
    departamento: datos.departamento,
    estado:       calcularEstadoInicial(),
    created_by:   userId ?? 'sistema',
  };

  const id = await repo.crear(planograma, datos.subcategorias ?? []);
  return repo.buscarPorId(id);
}

/**
 * Retorna el detalle completo de un planograma.
 * @param {object} repo
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerPlanograma(repo, id) {
  const planograma = await repo.buscarPorId(id);
  if (!planograma) throw errorNotFound(id);
  return planograma;
}

/**
 * Aplica un partial update de nombre, departamento y/o subcategorías.
 * @param {object} repo
 * @param {number} id
 * @param {{ nombre?, departamento?, subcategorias?: string[] }} cambios
 * @returns {Promise<object>} Planograma actualizado
 */
async function editarPlanograma(repo, id, cambios) {
  const planograma = await repo.buscarPorId(id);
  if (!planograma) throw errorNotFound(id);

  validarEstadoParaEditar(planograma.estado);

  // Validar nombre único solo si se cambia nombre o departamento
  const nombreFinal       = cambios.nombre       ?? planograma.nombre;
  const departamentoFinal = cambios.departamento ?? planograma.departamento;
  const cambiaNombre      = nombreFinal !== planograma.nombre || departamentoFinal !== planograma.departamento;

  if (cambiaNombre) {
    const duplicado = await repo.existeNombreEnDepartamento(nombreFinal, departamentoFinal, id);
    if (duplicado) throw errorNombreDuplicado();
  }

  const camposMetadatos = {};
  if (cambios.nombre       !== undefined) camposMetadatos.nombre       = cambios.nombre;
  if (cambios.departamento !== undefined) camposMetadatos.departamento = cambios.departamento;

  await repo.actualizar(id, camposMetadatos, cambios.subcategorias);

  return repo.buscarPorId(id);
}

/**
 * Archiva un planograma.
 * Falla con 409 si ya está archivado.
 * Falla con 422 si tiene versiones publicadas asignadas a tiendas.
 * @param {object} repo
 * @param {number} id
 * @returns {Promise<object>} Planograma archivado
 */
async function archivarPlanograma(repo, id) {
  const planograma = await repo.buscarPorId(id);
  if (!planograma) throw errorNotFound(id);

  validarEstadoParaArchivar(planograma.estado);

  const tienePublicadas = await repo.tieneVersionesPublicadas(id);
  if (tienePublicadas) {
    const err = new Error('El planograma tiene versiones publicadas asignadas a tiendas y no puede archivarse');
    err.status = 422;
    err.code   = 'UNPROCESSABLE';
    throw err;
  }

  await repo.archivar(id);
  return repo.buscarPorId(id);
}

module.exports = {
  listarPlanogramas,
  crearPlanograma,
  obtenerPlanograma,
  editarPlanograma,
  archivarPlanograma,
};
