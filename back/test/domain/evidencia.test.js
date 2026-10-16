/**
 * Pruebas de los casos de uso de evidencia: autor tomado solo del token (nunca del body),
 * nombre en la respuesta y permiso de eliminar por número de empleado.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const usecases = require('../../src/domain/evidencia/evidencia.usecases');

const PNG = Buffer.from('imagen-falsa').toString('base64');

function crearRepos({ filas = [] } = {}) {
  const evidencias = new Map(filas.map((f) => [f.id, { ...f }]));
  let siguienteId = Math.max(0, ...evidencias.keys()) + 1;
  const creadas = [];

  const evidenciaRepo = {
    creadas,
    async listarGondolasDeVersion() { return [{ id: 7, nombre: 'G1', orden: 1 }]; },
    async gondolaPerteneceAVersion() { return true; },
    async listarPorTiendaYVersion() { return [...evidencias.values()]; },
    async buscarPorId(id) { return evidencias.get(id) ?? null; },
    async crear(datos) {
      creadas.push(datos);
      const id = siguienteId++;
      evidencias.set(id, {
        id, gondolaId: datos.gondola_id, nombreOriginal: datos.nombre_original, tipoMime: datos.tipo_mime,
        tamanoBytes: datos.tamano_bytes, blobContainer: datos.blob_container, blobPath: datos.blob_path,
        subidoPor: datos.subido_por, subidoPorNombre: datos.subido_por_nombre, createdAt: new Date(),
      });
      return id;
    },
    async eliminar(id) { evidencias.delete(id); },
  };
  const implementacionRepo = {
    async buscarTienda() { return { id: 1, codigo: 'T01', estado: 'activo' }; },
    async listarVersionesAsignadas() { return [{ versionId: 5 }]; },
  };
  const llamadas = { subir: 0 };
  const blobStorage = {
    container: 'adjuntos',
    async subir() { llamadas.subir++; return { url: 'https://blob/x' }; },
    async eliminar() {},
  };
  return { evidenciaRepo, implementacionRepo, blobStorage, llamadas };
}

const datosBase = { gondola_id: 7, nombre_original: 'foto.png', tipo_mime: 'image/png', archivo_base64: PNG };

describe('evidencia.usecases', () => {
  it('el autor sale del parámetro autor, nunca de datos (C-01)', async () => {
    const { evidenciaRepo, implementacionRepo, blobStorage } = crearRepos();
    const datos = {
      ...datosBase, subido_por: '999', subido_por_nombre: 'FALSO', subidoPor: '999', subidoPorNombre: 'FALSO',
    };
    await usecases.agregarEvidencia(
      evidenciaRepo, implementacionRepo, blobStorage, 1, 5, datos, { numero: '100702', nombre: 'JUAN LÓPEZ' },
    );
    assert.equal(evidenciaRepo.creadas[0].subido_por, '100702');
    assert.equal(evidenciaRepo.creadas[0].subido_por_nombre, 'JUAN LÓPEZ');
  });

  it('agregar y listar con el mismo número da puedeEliminar true; con otro, false (C-02)', async () => {
    const { evidenciaRepo, implementacionRepo, blobStorage } = crearRepos();
    const creada = await usecases.agregarEvidencia(
      evidenciaRepo, implementacionRepo, blobStorage, 1, 5, datosBase, { numero: 'X', nombre: 'Ana' },
    );
    assert.equal(creada.puedeEliminar, true);
    assert.equal(creada.subido_por_nombre, 'Ana');

    const propia = await usecases.listarEvidencias(evidenciaRepo, implementacionRepo, 1, 5, 'X');
    assert.equal(propia.gondolas[0].evidencias[0].puedeEliminar, true);
    const ajena = await usecases.listarEvidencias(evidenciaRepo, implementacionRepo, 1, 5, 'Y');
    assert.equal(ajena.gondolas[0].evidencias[0].puedeEliminar, false);
  });

  it('el nombre no sirve como usuario para eliminar (C-03)', async () => {
    const { evidenciaRepo, implementacionRepo, blobStorage } = crearRepos({
      filas: [{ id: 1, gondolaId: 7, subidoPor: '100702', subidoPorNombre: 'JUAN LÓPEZ', blobContainer: 'c', blobPath: 'p' }],
    });
    const lista = await usecases.listarEvidencias(evidenciaRepo, implementacionRepo, 1, 5, 'JUAN LÓPEZ');
    assert.equal(lista.gondolas[0].evidencias[0].puedeEliminar, false);
    await assert.rejects(
      usecases.eliminarEvidencia(evidenciaRepo, blobStorage, 1, 'JUAN LÓPEZ'),
      { status: 403, code: 'FORBIDDEN' },
    );
  });

  it('una fila heredada sin nombre lista subido_por_nombre null', async () => {
    const { evidenciaRepo, implementacionRepo } = crearRepos({
      filas: [{ id: 1, gondolaId: 7, subidoPor: 'sistema' }],
    });
    const lista = await usecases.listarEvidencias(evidenciaRepo, implementacionRepo, 1, 5, '100702');
    assert.equal(lista.gondolas[0].evidencias[0].subido_por, 'sistema');
    assert.equal(lista.gondolas[0].evidencias[0].subido_por_nombre, null);
  });

  it('cada evidencia expone exactamente las claves del contrato (C-07)', async () => {
    const { evidenciaRepo, implementacionRepo } = crearRepos({
      filas: [{ id: 1, gondolaId: 7, subidoPor: '1', subidoPorNombre: 'Ana', correo: 'a@b.c', permisos: ['x'] }],
    });
    const lista = await usecases.listarEvidencias(evidenciaRepo, implementacionRepo, 1, 5, '1');
    assert.deepEqual(Object.keys(lista.gondolas[0].evidencias[0]), [
      'id', 'nombre_original', 'tipo_mime', 'tamano_bytes', 'subido_por', 'subido_por_nombre',
      'created_at', 'puedeEliminar',
    ]);
  });

  it('con autor "sistema" lanza antes de subir el blob (C-11)', async () => {
    const { evidenciaRepo, implementacionRepo, blobStorage, llamadas } = crearRepos();
    await assert.rejects(
      usecases.agregarEvidencia(
        evidenciaRepo, implementacionRepo, blobStorage, 1, 5, datosBase, { numero: 'sistema', nombre: 'Sistema' },
      ),
      (err) => err.status === undefined,
    );
    assert.equal(llamadas.subir, 0);
    assert.equal(evidenciaRepo.creadas.length, 0);
  });
});
