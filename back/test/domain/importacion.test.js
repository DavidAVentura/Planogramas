/**
 * Pruebas de la importación de productos del Excel: accesorios múltiples, accesorio inexistente
 * bloqueante, ganchos de exhibición y cruce con "Por ubicar".
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  accesoriosDeFila, posicionDesdeFila, filtrarProductos, cruzarConPorUbicar,
} = require('../../src/domain/importacion/importacion.entity');
const { importarProductos } = require('../../src/domain/importacion/importacion.usecases');

// ─── Repositorios falsos ──────────────────────────────────────────────────────

function armarRepos({ estado = 'borrador', catalogo = { A: 1, B: 2, 'VDA-22R-PTH': 3 } } = {}) {
  const llamadas = { buscarPorCodigo: [], skusDeVersion: 0, importarPorUbicar: 0 };
  const capturado = { posiciones: null };
  return {
    llamadas,
    capturado,
    repos: {
      versionRepo: { buscarPorId: async () => ({ estado }) },
      accesorioRepo: {
        buscarPorCodigo: async (codigo) => {
          llamadas.buscarPorCodigo.push(codigo);
          return catalogo[codigo] ? { id: catalogo[codigo], codigo } : null;
        },
      },
      importacionRepo: {
        skusDeVersion: async () => { llamadas.skusDeVersion += 1; return new Set(); },
        importarPorUbicar: async (_v, posiciones) => {
          llamadas.importarPorUbicar += 1;
          capturado.posiciones = posiciones;
          return { id: 1, creada: true, totalNiveles: 1 };
        },
      },
      productoRepo: {
        asegurarExistencia: async () => true,
        buscarPorSku: async () => ({ ancho_cm: 10 }),
      },
    },
  };
}

const fila = (extra = {}) => ({ sku: '1', facings_horizontal: 1, ganchos: [], ...extra });

describe('accesoriosDeFila', () => {
  it('usa la lista, el legado o nada, sin combinarlos', () => {
    assert.deepEqual(accesoriosDeFila(fila({ accesorios: [{ codigo: 'A', tamano_pulgadas: 22 }] })), [{ codigo: 'A', tamano_pulgadas: 22 }]);
    assert.deepEqual(accesoriosDeFila(fila({ accesorio_codigo: 'A', tamano_accesorio_pulgadas: 22 })), [{ codigo: 'A', tamano_pulgadas: 22 }]);
    assert.deepEqual(accesoriosDeFila(fila({ tamano_accesorio_pulgadas: 22 })), []);
    assert.deepEqual(accesoriosDeFila(fila()), []);
  });
});

describe('posicionDesdeFila', () => {
  const producto = { existe: true, anchoCm: 10 };
  it('devuelve la lista de accesorios (0, 1 y 2) y no la clave accesorio', () => {
    for (const n of [0, 1, 2]) {
      const lista = Array.from({ length: n }, (_, i) => ({ accesorio_id: i + 1, tamano_pulgadas: 22, orden: i + 1 }));
      const pos = posicionDesdeFila(fila(), producto, lista);
      assert.equal(pos.accesorios.length, n);
      assert.equal('accesorio' in pos, false);
    }
  });
  it('los ganchos de exhibición pasan tal cual', () => {
    assert.deepEqual(posicionDesdeFila(fila({ ganchos: [65, '54E'] }), producto).ganchos, [65, '54E']);
  });
});

describe('filtrarProductos', () => {
  it('ordena por el primer gancho numérico; sin ganchos al final', () => {
    const filas = [fila({ sku: 'a', ganchos: ['54E'] }), fila({ sku: 'b', ganchos: [10] }), fila({ sku: 'c', ganchos: [] })];
    // "54E" cuenta como 54 para ordenar: el 10 va primero.
    assert.deepEqual(filtrarProductos(filas, new Set()).aImportar.map((f) => f.sku), ['b', 'a', 'c']);
  });
});

describe('importarProductos', () => {
  it('guarda [A, B, A] con orden 1, 2, 3 y los ids del catálogo', async () => {
    const { repos, capturado } = armarRepos();
    const resultado = await importarProductos(repos, 1, {
      productos: [fila({ accesorios: [{ codigo: 'A', tamano_pulgadas: 22 }, { codigo: 'B', tamano_pulgadas: null }, { codigo: 'A', tamano_pulgadas: 12 }] })],
    });
    assert.deepEqual(capturado.posiciones[0].accesorios, [
      { accesorio_id: 1, tamano_pulgadas: 22, orden: 1 },
      { accesorio_id: 2, tamano_pulgadas: null, orden: 2 },
      { accesorio_id: 1, tamano_pulgadas: 12, orden: 3 },
    ]);
    assert.equal(resultado.advertencias.some((a) => /accesorio/i.test(a)), false);
  });

  it('un accesorio inexistente bloquea con 422 y no lee SKUs ni escribe', async () => {
    const { repos, llamadas } = armarRepos();
    await assert.rejects(
      importarProductos(repos, 1, { productos: [fila({ accesorios: [{ codigo: 'X', tamano_pulgadas: 22 }] })] }),
      (err) => err.status === 422 && err.code === 'UNPROCESSABLE' && JSON.stringify(err.details.codigos) === '["X"]',
    );
    assert.equal(llamadas.skusDeVersion, 0);
    assert.equal(llamadas.importarPorUbicar, 0);
  });

  it('normaliza los códigos: una sola búsqueda por código', async () => {
    const { repos, llamadas } = armarRepos();
    await importarProductos(repos, 1, {
      productos: [
        fila({ sku: '1', accesorios: [{ codigo: 'vda-22r-pth', tamano_pulgadas: 22 }] }),
        fila({ sku: '2', accesorios: [{ codigo: 'VDA-22R-PTH ', tamano_pulgadas: 22 }] }),
      ],
    });
    assert.deepEqual(llamadas.buscarPorCodigo, ['VDA-22R-PTH']);
  });

  it('más de 200 códigos distintos → 400 sin consultar nada', async () => {
    const { repos, llamadas } = armarRepos();
    const productos = Array.from({ length: 201 }, (_, i) => fila({ sku: `S${i}`, accesorios: [{ codigo: `C${i}`, tamano_pulgadas: null }] }));
    await assert.rejects(importarProductos(repos, 1, { productos }), (err) => err.status === 400 && err.code === 'VALIDATION_ERROR');
    assert.equal(llamadas.buscarPorCodigo.length, 0);
    assert.equal(llamadas.skusDeVersion, 0);
    assert.equal(llamadas.importarPorUbicar, 0);
  });

  it('versión publicada: 422 de versión no editable, sin consultar el catálogo', async () => {
    const { repos, llamadas } = armarRepos({ estado: 'publicado' });
    await assert.rejects(
      importarProductos(repos, 1, { productos: [fila({ accesorios: [{ codigo: 'X', tamano_pulgadas: null }] })] }),
      (err) => err.status === 422 && !err.details?.codigos,
    );
    assert.equal(llamadas.buscarPorCodigo.length, 0);
  });

  it('formato legado → un accesorio con su tamaño y orden 1', async () => {
    const { repos, capturado } = armarRepos();
    await importarProductos(repos, 1, { productos: [fila({ accesorio_codigo: 'A', tamano_accesorio_pulgadas: 22 })] });
    assert.deepEqual(capturado.posiciones[0].accesorios, [{ accesorio_id: 1, tamano_pulgadas: 22, orden: 1 }]);
  });
});

describe('cruzarConPorUbicar con ganchos de exhibición', () => {
  const porUbicar = () => [{
    id: 1, sku: '111', nombre_detectado: null, confidence: 100, ganchos: [65, '54E'], facings_horizontal: 2,
    cantidad_apilable: 1, unidades_por_facing: 1, accesorios: [],
  }];
  const planDe = (ganchos) => [{ niveles: [{ posiciones: [{ ganchos, sku: null }] }] }];

  it('el espacio con 65 toma el producto y el 54E queda en Por ubicar con advertencia', () => {
    const planes = planDe([65]);
    const cruce = cruzarConPorUbicar(planes, porUbicar());
    assert.equal(cruce.llenados, 1);
    assert.equal(planes[0].niveles[0].posiciones[0].facings_horizontal, 2);
    assert.equal(cruce.actualizar.length, 1);
    assert.deepEqual(cruce.actualizar[0].ganchos, ['54E']);
    assert.ok(cruce.advertencias.some((a) => a.includes('los ganchos 54E no están en el PDF')));
  });

  it('los ganchos E no cuentan en el reparto de facings (I1)', () => {
    const fuente = [{
      id: 1, sku: '111', nombre_detectado: null, confidence: 100, ganchos: [65, 66, '54E'], facings_horizontal: 2,
      cantidad_apilable: 1, unidades_por_facing: 1, accesorios: [],
    }];
    const planes = planDe([65, 66]);
    const cruce = cruzarConPorUbicar(planes, fuente);
    assert.equal(planes[0].niveles[0].posiciones[0].facings_horizontal, 2);
    assert.deepEqual(cruce.actualizar[0].ganchos, ['54E']);
    assert.equal(cruce.actualizar[0].facings_horizontal, 1);
  });

  it('un espacio con 54 no toma un producto con 54E', () => {
    const cruce = cruzarConPorUbicar(planDe([54]), porUbicar());
    assert.equal(cruce.llenados, 0);
  });

  it('un espacio con 54E toma el producto que tiene 54E', () => {
    const planes = planDe(['54E']);
    const cruce = cruzarConPorUbicar(planes, porUbicar());
    assert.equal(cruce.llenados, 1);
    const posicion = planes[0].niveles[0].posiciones[0];
    assert.equal(posicion.sku, '111');
    assert.ok(posicion.facings_horizontal >= 1);
  });

  it('un espacio con 54E no toma un producto que solo tiene 54', () => {
    const fuente = [{ ...porUbicar()[0], ganchos: [54] }];
    const cruce = cruzarConPorUbicar(planDe(['54E']), fuente);
    assert.equal(cruce.llenados, 0);
  });

  // Comportamiento actual (igual con ganchos enteros): un gancho repetido entre espacios del PDF llena ambos
  // con el mismo producto. Registrado en DT-30; esta prueba documenta el comportamiento para detectar cambios.
  it('dos espacios con 54E y un solo producto: hoy llena ambos (DT-30)', () => {
    const planes = [{ niveles: [{ posiciones: [{ ganchos: ['54E'], sku: null }, { ganchos: ['54E'], sku: null }] }] }];
    const cruce = cruzarConPorUbicar(planes, porUbicar());
    assert.equal(cruce.llenados, 2);
  });
});
