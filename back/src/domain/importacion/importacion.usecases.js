/**
 * importacion.usecases.js
 * Casos de uso de la importación de layout completo (Agente Importador de PDF).
 * Reciben los repositorios por inyección de dependencia — sin imports de infraestructura.
 */

const { validarVersionEditable } = require('../gondola/gondola.entity');
const {
  planificarCuerpo,
  validarDestinosUnicos,
  degradarSkusInexistentes,
} = require('./importacion.entity');

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

async function validarGondolasDestino(gondolaRepo, versionId, cuerpos) {
  for (const cuerpo of cuerpos.filter((c) => c.destino === 'REEMPLAZAR')) {
    const gondola = await gondolaRepo.buscarPorId(cuerpo.gondola_id);
    if (!gondola || gondola.versionId !== versionId) {
      throw errorNotFound(`Góndola ${cuerpo.gondola_id} no encontrada en la versión ${versionId}`);
    }
  }
}

async function validarAccesorios(accesorioRepo, planes) {
  const ids = new Set(planes.flatMap((p) => p.niveles.map((n) => n.codigo_accesorio_id).filter(Boolean)));
  for (const id of ids) {
    if (!(await accesorioRepo.buscarPorId(id))) throw errorNotFound(`Accesorio ${id} no encontrado`);
  }
}

/** Garantiza cada SKU en el catálogo local (nutriéndolo desde CATI); devuelve los que no existen. */
async function skusInexistentes(productoRepo, planes) {
  const skus = new Set(planes.flatMap((p) => p.niveles.flatMap((n) => n.posiciones.map((x) => x.sku).filter(Boolean))));
  const faltantes = new Set();
  for (const sku of skus) {
    if (!(await productoRepo.asegurarExistencia(sku))) faltantes.add(sku);
  }
  return faltantes;
}

/**
 * Importa uno o más cuerpos (góndolas completas con secciones, niveles y posiciones) en una
 * versión editable, en una sola transacción. Las posiciones con SKU que no existe quedan como
 * PENDIENTE con advertencia (no bloquean la importación).
 * @returns {Promise<{ gondolas: object[], advertencias: string[] }>}
 */
async function importarLayout({ importacionRepo, gondolaRepo, versionRepo, accesorioRepo, productoRepo }, versionId, datos) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  validarVersionEditable(version.estado);

  validarDestinosUnicos(datos.cuerpos);
  await validarGondolasDestino(gondolaRepo, versionId, datos.cuerpos);

  const planes = datos.cuerpos.map(planificarCuerpo);
  await validarAccesorios(accesorioRepo, planes);

  const advertencias = degradarSkusInexistentes(planes, await skusInexistentes(productoRepo, planes));
  const gondolas = await importacionRepo.importarCuerpos(versionId, planes);

  return { gondolas, advertencias };
}

module.exports = { importarLayout };
