/**
 * Pruebas de la confirmación de adjuntos: el autor (número y nombre) sale solo del token y el
 * reemplazo sobrescribe al autor anterior.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const usecases = require('../../src/domain/adjunto/adjunto.usecases');

function crearRepos() {
  const registro = { creados: [], actualizados: [] };
  const adjuntoRepo = {
    registro,
    async existeBlobPath() { return false; },
    async crear(datos) { registro.creados.push(datos); return 1; },
    async actualizarArchivo(id, campos) { registro.actualizados.push({ id, campos }); },
    async buscarPorId(id) {
      return { id, versionId: 5, blobContainer: 'c', blobPath: 'versiones/5/viejo.png' };
    },
  };
  const versionRepo = { async buscarPorId(id) { return { id }; } };
  const blobStorage = {
    container: 'adjuntos',
    async obtenerPropiedades() { return { tamanoBytes: 10, tipoMime: 'image/png', url: 'https://blob/x' }; },
    async eliminar() {},
  };
  return { adjuntoRepo, versionRepo, blobStorage };
}

const datos = { nombre_original: 'a.png', tipo_mime: 'image/png', blob_path: 'versiones/5/nuevo-a.png' };

describe('adjunto.usecases (autor)', () => {
  it('agregar persiste el autor del parámetro y no el de datos (C-01)', async () => {
    const { adjuntoRepo, versionRepo, blobStorage } = crearRepos();
    const falsos = {
      ...datos, subidoPor: '999', subido_por: '999', subidoPorNombre: 'FALSO', subido_por_nombre: 'FALSO',
    };
    await usecases.agregarAdjunto(
      adjuntoRepo, versionRepo, blobStorage, 5, falsos, { numero: '100702', nombre: 'JUAN LÓPEZ' },
    );
    assert.equal(adjuntoRepo.registro.creados[0].subido_por, '100702');
    assert.equal(adjuntoRepo.registro.creados[0].subido_por_nombre, 'JUAN LÓPEZ');
  });

  it('nombre igual al número se guarda como null', async () => {
    const { adjuntoRepo, versionRepo, blobStorage } = crearRepos();
    await usecases.agregarAdjunto(
      adjuntoRepo, versionRepo, blobStorage, 5, datos, { numero: '100702', nombre: '100702' },
    );
    assert.equal(adjuntoRepo.registro.creados[0].subido_por_nombre, null);
  });

  it('reemplazar sobrescribe número y nombre con los de quien reemplaza', async () => {
    const { adjuntoRepo, versionRepo, blobStorage } = crearRepos();
    await usecases.reemplazarAdjunto(
      adjuntoRepo, versionRepo, blobStorage, 3, datos, { numero: '200', nombre: 'Otra Persona' },
    );
    const { campos } = adjuntoRepo.registro.actualizados[0];
    assert.equal(campos.subido_por, '200');
    assert.equal(campos.subido_por_nombre, 'Otra Persona');
  });

  it('sin número de empleado lanza antes de escribir', async () => {
    const { adjuntoRepo, versionRepo, blobStorage } = crearRepos();
    await assert.rejects(
      usecases.agregarAdjunto(
        adjuntoRepo, versionRepo, blobStorage, 5, datos, { numero: 'sistema', nombre: 'Sistema' },
      ),
      (err) => err.status === undefined,
    );
    await assert.rejects(
      usecases.reemplazarAdjunto(adjuntoRepo, versionRepo, blobStorage, 3, datos, undefined),
    );
    assert.equal(adjuntoRepo.registro.creados.length, 0);
    assert.equal(adjuntoRepo.registro.actualizados.length, 0);
  });
});
