/**
 * Pruebas de la lista blanca de columnas del Consolidado Tiendas.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  CLAVES_COLUMNAS_CONSOLIDADO, COLUMNAS_CONSOLIDADO, esClaveColumna, columnasInvalidas, etiquetaColumna,
  textoMontaje, textoAccesorios,
} = require('../../src/domain/consolidado/columnas');

// Mismo literal que front/src/domain/consolidado/columnasConsolidado.test.ts (DT-43).
const CLAVES_ESPERADAS = [
  'sku', 'producto', 'tienda', 'version', 'estadoVersion', 'seccion', 'gondola', 'nivel', 'orden',
  'ganchos', 'accesorio', 'montaje', 'facings', 'apilable', 'capacidadFacing', 'capacidadMaxima',
  'minEstetico', 'minFinal', 'maxFinal', 'perfil', 'modo', 'decision', 'observaciones', 'sustituto',
];

const grupo = {
  sku: '1200206',
  producto: { nombre: 'Llanta', marca: 'Acme', skuSustituto: '999', nombreSustituto: 'Llanta B' },
  tienda: { id: 7, codigo: '101', nombre: 'Zona 9', tipo: 'GRANDE', marca: 'Cemaco' },
};

function fila(extra = {}) {
  return {
    versionId: 210, codigoVersion: 'AUTOS 02-TG', planogramaId: 165, planogramaNombre: 'Autos',
    estadoVersion: 'publicado', modo: 'PLANOGRAMA',
    ubicaciones: [
      { posicionId: 1, gondola: 'G1', porUbicar: false, seccion: 1, nivel: 3, orden: 2, ganchos: [5, '54E'] },
      { posicionId: 2, gondola: 'G1', porUbicar: false, seccion: 2, nivel: 1, orden: 1, ganchos: [12] },
    ],
    accesorios: [{ codigo: 'R45-12', tamanoPulgadas: 12 }, { codigo: 'X', tamanoPulgadas: null }],
    facings: 2, cantidadApilable: 1, capacidadFacing: 6, capacidadMaxima: 12, minEstetico: 4,
    minFinal: 6, maxFinal: 12, minVaria: false, maxVaria: false, perfil: 'MRP', decision: 'ACTIVO',
    observaciones: 'nota',
    montaje: { colganteExterno: true, display: false, desborda: true, notaDesborde: 'sobra' },
    ...extra,
  };
}

describe('columnas del consolidado', () => {
  it('las 24 claves son exactamente las esperadas y en ese orden', () => {
    assert.deepEqual([...CLAVES_COLUMNAS_CONSOLIDADO], CLAVES_ESPERADAS);
    assert.deepEqual(Object.keys(COLUMNAS_CONSOLIDADO), CLAVES_ESPERADAS);
  });

  it('claves peligrosas no son columnas', () => {
    for (const c of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'inventario', 7, null]) {
      assert.equal(esClaveColumna(c), false, String(c));
    }
    assert.deepEqual(columnasInvalidas(['sku', '__proto__', 'x']), ['__proto__', 'x']);
  });

  it('etiquetas de la tabla de contratos', () => {
    const esperadas = {
      sku: 'SKU', producto: 'Producto', tienda: 'Tienda', version: 'Planograma versión',
      estadoVersion: 'Estado de la versión', seccion: 'Sección', gondola: 'Góndola', nivel: 'Nivel',
      orden: 'Posición en nivel', ganchos: 'Ganchos', accesorio: 'Accesorio de montaje', montaje: 'Montaje',
      facings: 'Facing horizontal', apilable: 'Cantidad apilable', capacidadFacing: 'Capacidad del facing',
      capacidadMaxima: 'Capacidad máxima', minEstetico: 'Mín. estético', minFinal: 'Mín. final',
      maxFinal: 'Máx. final', perfil: 'Perfil de redondeo', modo: 'Modo', decision: 'Decisión',
      observaciones: 'Observaciones', sustituto: 'SKU sustituto',
    };
    for (const [clave, etiqueta] of Object.entries(esperadas)) assert.equal(etiquetaColumna(clave), etiqueta);
  });

  it('valor de cada clave sobre una fila de ejemplo', () => {
    const f = fila();
    const v = (c, fi = f) => COLUMNAS_CONSOLIDADO[c].valor(fi, grupo);
    assert.equal(v('sku'), '1200206');
    assert.equal(v('producto'), 'Llanta · Acme');
    assert.equal(v('tienda'), '101 · Zona 9');
    assert.equal(v('version'), 'AUTOS 02-TG · Autos');
    assert.equal(v('estadoVersion'), 'Publicada');
    assert.equal(v('estadoVersion', fila({ estadoVersion: 'piloto' })), 'Piloto');
    assert.equal(v('seccion'), '1, 2');
    assert.equal(v('gondola'), 'G1');
    assert.equal(v('nivel'), '3, 1');
    assert.equal(v('orden'), '2, 1');
    assert.equal(v('ganchos'), '05, 54E, 12');
    assert.equal(v('accesorio'), 'R45-12 (12"), X');
    assert.equal(v('montaje'), 'R45-12 (12"), X, Colgante externo, Desborda la góndola: sobra');
    assert.equal(v('facings'), 2);
    assert.equal(v('apilable'), 1);
    assert.equal(v('capacidadFacing'), 6);
    assert.equal(v('capacidadMaxima'), 12);
    assert.equal(v('minEstetico'), 4);
    assert.equal(v('minFinal'), 6);
    assert.equal(v('maxFinal'), 12);
    assert.equal(v('perfil'), 'MRP');
    assert.equal(v('modo'), 'Planograma');
    assert.equal(v('modo', fila({ modo: 'CROSS' })), 'Cross');
    assert.equal(v('decision'), 'Activo');
    assert.equal(v('decision', fila({ decision: 'INACTIVO' })), 'Inactivo');
    assert.equal(v('observaciones'), 'nota');
    assert.equal(v('sustituto'), '999 · Llanta B');
  });

  it('varía, null y no finitos', () => {
    const f = fila({ minVaria: true, minFinal: null, capacidadMaxima: null, apilable: undefined, facings: NaN });
    assert.equal(COLUMNAS_CONSOLIDADO.minFinal.valor(f, grupo), 'Varía');
    assert.equal(COLUMNAS_CONSOLIDADO.capacidadMaxima.valor(f, grupo), null);
    assert.equal(COLUMNAS_CONSOLIDADO.facings.valor(f, grupo), null);
    assert.equal(COLUMNAS_CONSOLIDADO.maxFinal.valor(fila({ maxVaria: true }), grupo), 'Varía');
  });

  it('sin fila (sin planograma) las columnas de fila quedan vacías y las de grupo no', () => {
    assert.equal(COLUMNAS_CONSOLIDADO.version.valor(null, grupo), null);
    assert.equal(COLUMNAS_CONSOLIDADO.montaje.valor(null, grupo), null);
    assert.equal(COLUMNAS_CONSOLIDADO.sku.valor(null, grupo), '1200206');
    assert.equal(COLUMNAS_CONSOLIDADO.sustituto.valor(null, { ...grupo, producto: { ...grupo.producto, skuSustituto: null, nombreSustituto: null } }), null);
    assert.equal(COLUMNAS_CONSOLIDADO.producto.valor(null, { ...grupo, producto: { ...grupo.producto, marca: null } }), 'Llanta');
  });

  it('montaje y accesorios sin nada → null', () => {
    const vacia = fila({ accesorios: [], montaje: { colganteExterno: false, display: true, desborda: false, notaDesborde: null } });
    assert.equal(textoMontaje(vacia), 'Display');
    assert.equal(textoAccesorios(vacia), null);
    assert.equal(textoMontaje(fila({ accesorios: [], montaje: { colganteExterno: false, display: false, desborda: false, notaDesborde: null } })), null);
  });
});
