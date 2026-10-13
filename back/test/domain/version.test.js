/**
 * Pruebas de la máquina de estados y generación de códigos de PlanogramaVersion.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  ESTADOS,
  TIPOS,
  generarCodigo,
  generarCodigoEspecial,
  generarGondolasIniciales,
  calcularTransicionGuardar,
  validarTransicionPromover,
  validarTransicionArchivar,
  validarPlanogramaNoArchivado,
} = require('../../src/domain/version/version.entity');

const UNPROCESSABLE = { status: 422, code: 'UNPROCESSABLE' };

describe('version.entity — códigos', () => {
  it('genera {NOMBRE}-T{INICIAL} en mayúsculas y sin espacios sobrantes', () => {
    assert.equal(generarCodigo('  limpieza 03 ', TIPOS.GRANDE), 'LIMPIEZA 03-TG');
    assert.equal(generarCodigo('Autos', TIPOS.EXPRESS), 'AUTOS-TE');
  });

  it('la versión especial agrega el código de tienda', () => {
    assert.equal(generarCodigoEspecial('Limpieza 03', TIPOS.MEDIANA, ' t0pc'), 'LIMPIEZA 03-TM-T0PC');
  });
});

describe('version.entity — transiciones', () => {
  it('guardar: borrador avanza a en_desarrollo; en_desarrollo y piloto se mantienen', () => {
    assert.equal(calcularTransicionGuardar(ESTADOS.BORRADOR), ESTADOS.EN_DESARROLLO);
    assert.equal(calcularTransicionGuardar(ESTADOS.EN_DESARROLLO), ESTADOS.EN_DESARROLLO);
    assert.equal(calcularTransicionGuardar(ESTADOS.PILOTO), ESTADOS.PILOTO);
  });

  it('guardar: publicado y archivado se rechazan', () => {
    assert.throws(() => calcularTransicionGuardar(ESTADOS.PUBLICADO), UNPROCESSABLE);
    assert.throws(() => calcularTransicionGuardar(ESTADOS.ARCHIVADO), UNPROCESSABLE);
  });

  it('promover solo permite en_desarrollo→piloto y piloto→publicado', () => {
    assert.doesNotThrow(() => validarTransicionPromover(ESTADOS.EN_DESARROLLO, ESTADOS.PILOTO));
    assert.doesNotThrow(() => validarTransicionPromover(ESTADOS.PILOTO, ESTADOS.PUBLICADO));
    assert.throws(() => validarTransicionPromover(ESTADOS.BORRADOR, ESTADOS.PILOTO), UNPROCESSABLE);
    assert.throws(() => validarTransicionPromover(ESTADOS.EN_DESARROLLO, ESTADOS.PUBLICADO), UNPROCESSABLE);
  });

  it('una versión publicada no se archiva manualmente', () => {
    assert.throws(() => validarTransicionArchivar(ESTADOS.PUBLICADO), UNPROCESSABLE);
    for (const estado of [ESTADOS.BORRADOR, ESTADOS.EN_DESARROLLO, ESTADOS.PILOTO]) {
      assert.doesNotThrow(() => validarTransicionArchivar(estado));
    }
  });

  it('no se crean versiones en un planograma archivado', () => {
    assert.throws(() => validarPlanogramaNoArchivado('archivado'), UNPROCESSABLE);
    assert.doesNotThrow(() => validarPlanogramaNoArchivado('activo'));
  });
});

describe('version.entity — góndolas iniciales', () => {
  it('crea N góndolas numeradas y ordenadas desde 1', () => {
    const gondolas = generarGondolasIniciales(3);
    assert.deepEqual(gondolas.map((g) => [g.nombre, g.orden]), [
      ['Góndola 1', 1], ['Góndola 2', 2], ['Góndola 3', 3],
    ]);
    assert.ok(gondolas.every((g) => g.ancho_cm > 0 && g.alto_cm > 0));
  });
});
