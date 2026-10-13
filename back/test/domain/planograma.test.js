/**
 * Pruebas del dominio Planograma: reglas puras de la entidad y casos de uso con un repositorio
 * falso inyectado (mismo patrón que usan los controllers con el repositorio de infraestructura).
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  ESTADOS,
  calcularEstadoInicial,
  validarEstadoParaArchivar,
  validarEstadoParaEditar,
} = require('../../src/domain/planograma/planograma.entity');
const usecases = require('../../src/domain/planograma/planograma.usecases');

/** Repositorio en memoria con lo mínimo que piden los casos de uso. */
function crearRepoFalso({ planogramas = [], publicadas = [] } = {}) {
  const filas = new Map(planogramas.map((p) => [p.id, { ...p }]));
  let siguienteId = Math.max(0, ...filas.keys()) + 1;

  return {
    filas,
    async listar({ page, pageSize }) {
      const data = [...filas.values()];
      return { data: data.slice((page - 1) * pageSize, page * pageSize), total: data.length };
    },
    async buscarPorId(id) { return filas.get(id) ?? null; },
    async existeNombreEnDepartamento(nombre, departamento, excluirId) {
      return [...filas.values()].some((p) =>
        p.nombre === nombre && p.departamento === departamento && p.id !== excluirId);
    },
    async crear(datos) {
      const id = siguienteId++;
      filas.set(id, { id, ...datos });
      return id;
    },
    async actualizar(id, campos) { Object.assign(filas.get(id), campos); },
    async tieneVersionesPublicadas(id) { return publicadas.includes(id); },
    async archivar(id) { filas.get(id).estado = ESTADOS.ARCHIVADO; },
  };
}

describe('planograma.entity', () => {
  it('un planograma nuevo nace en borrador', () => {
    assert.equal(calcularEstadoInicial(), ESTADOS.BORRADOR);
  });

  it('no permite archivar dos veces (409)', () => {
    assert.throws(() => validarEstadoParaArchivar(ESTADOS.ARCHIVADO), { status: 409, code: 'CONFLICT' });
    assert.doesNotThrow(() => validarEstadoParaArchivar(ESTADOS.ACTIVO));
  });

  it('solo borrador y activo son editables (422)', () => {
    assert.doesNotThrow(() => validarEstadoParaEditar(ESTADOS.BORRADOR));
    assert.doesNotThrow(() => validarEstadoParaEditar(ESTADOS.ACTIVO));
    assert.throws(() => validarEstadoParaEditar(ESTADOS.ARCHIVADO), { status: 422, code: 'UNPROCESSABLE' });
  });
});

describe('planograma.usecases', () => {
  const base = { id: 1, nombre: 'LIMPIEZA 03', departamento: 'HOGAR', estado: ESTADOS.ACTIVO };

  it('listar normaliza la paginación y devuelve la forma estándar', async () => {
    const repo = crearRepoFalso({ planogramas: [base] });
    // El controller valida page/pageSize con Joi antes de llegar aquí (ver DEUDA_TECNICA: DT-03).
    const res  = await usecases.listarPlanogramas(repo, { page: '0', pageSize: '5' });
    assert.equal(res.page, 1);
    assert.equal(res.pageSize, 5);
    assert.equal(res.total, 1);
  });

  it('crear rechaza un nombre duplicado en el mismo departamento (409)', async () => {
    const repo = crearRepoFalso({ planogramas: [base] });
    await assert.rejects(
      usecases.crearPlanograma(repo, { nombre: base.nombre, departamento: base.departamento }, 'u1'),
      { status: 409 },
    );
  });

  it('crear guarda en borrador y con el usuario que lo crea', async () => {
    const repo  = crearRepoFalso();
    const nuevo = await usecases.crearPlanograma(repo, { nombre: 'AUTOS 01', departamento: 'AUTOS' }, 'u7');
    assert.equal(nuevo.estado, ESTADOS.BORRADOR);
    assert.equal(nuevo.created_by, 'u7');
    assert.equal(nuevo.descripcion, null);
  });

  it('obtener un id inexistente responde 404', async () => {
    await assert.rejects(usecases.obtenerPlanograma(crearRepoFalso(), 99), { status: 404, code: 'NOT_FOUND' });
  });

  it('editar con descripción vacía la borra (null)', async () => {
    const repo = crearRepoFalso({ planogramas: [{ ...base, descripcion: 'algo' }] });
    const res  = await usecases.editarPlanograma(repo, 1, { descripcion: '' });
    assert.equal(res.descripcion, null);
  });

  it('archivar falla con 422 si tiene versiones publicadas', async () => {
    const repo = crearRepoFalso({ planogramas: [base], publicadas: [1] });
    await assert.rejects(usecases.archivarPlanograma(repo, 1), { status: 422 });
    assert.equal(repo.filas.get(1).estado, ESTADOS.ACTIVO);
  });

  it('archivar sin publicadas deja el planograma archivado', async () => {
    const repo = crearRepoFalso({ planogramas: [base] });
    const res  = await usecases.archivarPlanograma(repo, 1);
    assert.equal(res.estado, ESTADOS.ARCHIVADO);
  });
});
