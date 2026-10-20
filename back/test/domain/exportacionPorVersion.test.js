/**
 * Pruebas de la descarga "Productos por planograma" (dominio puro): validación del Pivote, orden,
 * hojas Lista / Pivote por versión / Versiones y nombre de archivo.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { construirFilasPorVersion } = require('../../src/domain/consolidado/consolidado.entity');
const X = require('../../src/domain/implementacion/exportacionPorVersion.entity');
const C = require('../../src/domain/implementacion/columnasExportacion');

const TODOS = ['borrador', 'en_desarrollo', 'piloto', 'publicado'];

function posicion(id, nivelId, sku, extra = {}) {
  return {
    id, nivelId, ordenHorizontal: id, sku, nombre: null, facings: 1, capacidadMaxima: 6, minFinal: 2, maxFinal: 6,
    ganchos: null, modo: 'PLANOGRAMA', cantidadApilable: 1, capacidadFacing: 3, minEstetico: 2, perfil: 'MRP',
    decision: 'ACTIVO', observaciones: null, crossExterno: false, montarEnDisplay: false, desbordaGondola: false,
    notaDesborde: null, ...extra,
  };
}

const version = (versionId, codigo, tipo, estado, extra = {}) => ({
  versionId, codigo, tipo, estado, esEspecial: false, planogramaId: 10, planogramaNombre: 'Ferretería', ...extra,
});

/** Una góndola y un nivel por versión (ids = versionId). */
function baseDe(versiones, posiciones, extra = {}) {
  return {
    versiones,
    gondolas: versiones.map((v) => ({ id: v.versionId, versionId: v.versionId, nombre: `G${v.versionId}`, orden: 1, anchoCm: 100, altoCm: 200, porUbicar: false })),
    secciones: [],
    niveles: versiones.map((v) => ({ id: v.versionId, gondolaId: v.versionId, seccionId: null, orden: 1 })),
    posiciones,
    accesorios: [],
    productos: [
      { sku: 'S1', nombre: 'Llanta', marca: 'Acme', area: 'A01', departamento: 'D05', skuSustituto: 'S9', nombreSustituto: 'Otra' },
      { sku: 'S2', nombre: 'Árbol', marca: null, area: 'A02', departamento: 'D07', skuSustituto: null, nombreSustituto: null },
    ],
    ...extra,
  };
}

const filasDe = (base) => construirFilasPorVersion(base, { estados: TODOS });
const texto = (celdas, i) => celdas[i].valor;

describe('validarPivote', () => {
  it('TG piloto + TG publicado del mismo planograma es válido', () => {
    const vs = [version(1, 'A-TG-P', 'GRANDE', 'piloto'), version(2, 'A-TG', 'GRANDE', 'publicado')];
    const { incluidas, excluidas } = X.validarPivote(vs);
    assert.equal(incluidas.length, 2);
    assert.deepEqual(excluidas, []);
  });

  it('dos TG borrador del mismo planograma → 422 con ambos ids en duplicadas', () => {
    const vs = [version(1, 'A', 'GRANDE', 'borrador'), version(2, 'B', 'GRANDE', 'borrador')];
    assert.throws(() => X.validarPivote(vs), (e) => {
      assert.equal(e.status, 422);
      assert.equal(e.code, 'PIVOTE_NO_APLICABLE');
      assert.deepEqual(e.details, {
        sinTipo: [], soloEspeciales: false,
        duplicadas: [{ planogramaId: 10, tipo: 'GRANDE', estado: 'borrador', versionIds: [1, 2] }],
      });
      return true;
    });
  });

  it('mismo tipo y estado en planogramas distintos, o tipos distintos, es válido', () => {
    const vs = [version(1, 'A', 'GRANDE', 'publicado'), version(2, 'B', 'GRANDE', 'publicado', { planogramaId: 11 }), version(3, 'C', 'MEDIANA', 'publicado')];
    assert.equal(X.validarPivote(vs).incluidas.length, 3);
  });

  it('una especial + una normal: la especial queda excluida con su motivo', () => {
    const esp = version(2, 'A-ESP', 'GRANDE', 'publicado', { esEspecial: true });
    const { incluidas, excluidas } = X.validarPivote([version(1, 'A', 'GRANDE', 'publicado'), esp]);
    assert.deepEqual(incluidas.map((v) => v.versionId), [1]);
    assert.deepEqual(excluidas, [{ version: esp, motivo: C.MOTIVO_ESPECIAL }]);
  });

  it('solo especiales → 422 soloEspeciales', () => {
    assert.throws(() => X.validarPivote([version(1, 'A', 'GRANDE', 'publicado', { esEspecial: true })]), (e) => {
      assert.equal(e.code, 'PIVOTE_NO_APLICABLE');
      assert.equal(e.details.soloEspeciales, true);
      return true;
    });
  });

  it('versión normal sin tipo → 422 sinTipo', () => {
    assert.throws(() => X.validarPivote([version(1, 'A', null, 'publicado'), version(2, 'B', 'GRANDE', 'publicado')]), (e) => {
      assert.deepEqual(e.details.sinTipo, [1]);
      return true;
    });
  });
});

describe('hoja Pivote por versión', () => {
  const vs = [version(1, 'A-TG-P', 'GRANDE', 'piloto'), version(2, 'A-TG', 'GRANDE', 'publicado'), version(3, 'A-TM', 'MEDIANA', 'publicado')];

  function pivote(posiciones, extra = {}, versiones = vs) {
    const base = baseDe(versiones, posiciones, extra);
    return X.construirHojaPivote(filasDe(base), versiones, base.productos);
  }

  it('encabezados: comunes + 13 campos y ganchos por bloque TG, TM, TE; grupos con su rango', () => {
    const hoja = pivote([posicion(1, 1, 'S1', { facings: 2 }), posicion(2, 3, 'S1')]);
    assert.deepEqual(hoja.encabezados.slice(0, 6), C.ENCABEZADOS_COMUNES_PIVOTE);
    assert.deepEqual(hoja.encabezados.slice(6, 19), [
      'Planograma_TG', 'Facings_TG', 'Cantidad_x_facing_TG', 'Cantidad_facing_vertical_TG', 'Min_estetico_TG', 'Capacidad_maxima_TG',
      'Nombre_accesorio_TG', 'Tamano_accesorio_TG', 'Perfil_redondeo_TG', 'Min_final_TG', 'Max_final_TG', 'Decision_final_TG', 'Observaciones_TG',
    ]);
    assert.deepEqual(hoja.encabezados.slice(19, 21), ['TG1', 'TG2']);
    assert.equal(hoja.grupos.map((g) => g.titulo).join(), 'TG,TM,TE');
    assert.deepEqual(hoja.grupos[0], { titulo: 'TG', desde: 6, hasta: 20 });
    assert.ok(hoja.encabezados.includes('Facings_TM') && hoja.encabezados.includes('Facings_TE'));
    assert.equal(hoja.anchos.length, hoja.encabezados.length);
    assert.equal(hoja.congelarFilas, 2);
    assert.equal(hoja.congelarColumnas, 6);
    assert.equal(hoja.nombre, 'Pivote por versión');
  });

  it('TG piloto + TG publicado: dos filas por SKU–modo, publicado primero', () => {
    const hoja = pivote([posicion(1, 1, 'S1'), posicion(2, 2, 'S1')]);
    assert.equal(hoja.filas.length, 2);
    assert.deepEqual(hoja.filas.map((f) => texto(f, 3)), ['Publicada', 'Piloto']);
    assert.deepEqual(hoja.filas.map((f) => texto(f, 6)), ['A-TG', 'A-TG-P']);
  });

  it('SKU cross solo en TG: fila Cross con bloque TG lleno y TM/TE vacíos', () => {
    const hoja = pivote([posicion(1, 2, 'S2', { modo: 'CROSS' })]);
    assert.equal(hoja.filas.length, 1);
    const fila = hoja.filas[0];
    assert.equal(texto(fila, 4), 'Cross');
    const iTM = hoja.encabezados.indexOf('Planograma_TM');
    assert.equal(texto(fila, 6), 'A-TG');
    assert.equal(fila[iTM].valor, null);
    assert.ok(fila.slice(iTM).every((c) => c.valor === null));
  });

  it('Min_final distinto entre posiciones → "Varía" como texto; único → número', () => {
    const hoja = pivote([posicion(1, 2, 'S1', { minFinal: 2 }), posicion(2, 2, 'S1', { minFinal: 3, maxFinal: 6 })]);
    const i = hoja.encabezados.indexOf('Min_final_TG');
    assert.deepEqual(hoja.filas[0][i], { tipo: 'texto', valor: 'Varía' });
    assert.deepEqual(hoja.filas[0][i + 1], { tipo: 'numero', valor: 6 });
    assert.equal(hoja.filas[0][hoja.encabezados.indexOf('Facings_TG')].valor, 2);
  });

  it('cantidades y perfil distintos → "Varía"; iguales → número / valor', () => {
    const hoja = pivote([posicion(1, 2, 'S1', { cantidadApilable: 1, perfil: 'MRP' }), posicion(2, 2, 'S1', { cantidadApilable: 2, perfil: 'ZSRE' })]);
    const celda = (campo) => hoja.filas[0][hoja.encabezados.indexOf(campo)];
    assert.equal(celda('Cantidad_facing_vertical_TG').valor, 'Varía');
    assert.deepEqual(celda('Cantidad_x_facing_TG'), { tipo: 'numero', valor: 3 });
    assert.equal(celda('Perfil_redondeo_TG').valor, 'Varía');
    assert.equal(celda('Decision_final_TG').valor, 'ACTIVO');
  });

  it('ganchos TG1..TGn: número normal como número y exhibición "54E" como texto', () => {
    const hoja = pivote([posicion(1, 2, 'S1', { facings: 2, ganchos: [7, '54E'] })]);
    const i = hoja.encabezados.indexOf('TG1');
    assert.deepEqual(hoja.filas[0][i], { tipo: 'numero', valor: 7 });
    assert.deepEqual(hoja.filas[0][i + 1], { tipo: 'texto', valor: '54E' });
    assert.equal(hoja.encabezados[i + 2], 'Planograma_TM');
  });

  it('sin ganchos en ningún bloque: 0 columnas de gancho', () => {
    const base = baseDe(vs, [posicion(1, 2, 'S1', { ganchos: [] })]);
    base.gondolas.forEach((g) => { g.porUbicar = true; }); // por ubicar: sin números calculados
    const hoja = X.construirHojaPivote(filasDe(base), vs, base.productos);
    assert.ok(!hoja.encabezados.includes('TG1'));
    assert.equal(hoja.encabezados.length, 6 + 13 * 3);
  });

  it('accesorios: códigos unidos con " // " y tamaños con comillas; "Varía" si unos tienen tamaño y otros no', () => {
    const conTamano = pivote([posicion(1, 2, 'S1')], { accesorios: [
      { posicionId: 1, orden: 1, codigo: 'GAN', tamanoPulgadas: 22 }, { posicionId: 1, orden: 2, codigo: 'ARO', tamanoPulgadas: 12 },
    ] });
    const i = conTamano.encabezados.indexOf('Nombre_accesorio_TG');
    assert.equal(conTamano.filas[0][i].valor, 'GAN // ARO');
    assert.equal(conTamano.filas[0][i + 1].valor, '22" // 12"');

    const mixto = pivote([posicion(1, 2, 'S1')], { accesorios: [
      { posicionId: 1, orden: 1, codigo: 'GAN', tamanoPulgadas: 22 }, { posicionId: 1, orden: 2, codigo: 'ARO', tamanoPulgadas: null },
    ] });
    assert.equal(mixto.filas[0][i + 1].valor, 'Varía');

    const sinTamano = pivote([posicion(1, 2, 'S1')], { accesorios: [{ posicionId: 1, orden: 1, codigo: 'GAN', tamanoPulgadas: null }] });
    assert.equal(sinTamano.filas[0][i].valor, 'GAN');
    assert.equal(sinTamano.filas[0][i + 1].valor, null);
  });

  it('orden determinista: SKU → planograma → estado → modo', () => {
    const hoja = pivote([
      posicion(1, 2, 'S2'), posicion(2, 2, 'S1', { modo: 'IMPULSO' }), posicion(3, 2, 'S1'), posicion(4, 1, 'S1'), posicion(5, 2, 'S1', { modo: 'CROSS' }),
    ]);
    assert.deepEqual(hoja.filas.map((f) => `${texto(f, 0)}|${texto(f, 3)}|${texto(f, 4)}`), [
      'S1|Publicada|Planograma', 'S1|Publicada|Cross', 'S1|Publicada|Impulso', 'S1|Piloto|Planograma', 'S2|Publicada|Planograma',
    ]);
  });

  it('comunes: descripción y SKU sustituto del producto', () => {
    const hoja = pivote([posicion(1, 2, 'S1')]);
    assert.deepEqual(hoja.filas[0].slice(0, 6).map((c) => c.valor), ['S1', 'Llanta', 'Ferretería', 'Publicada', 'Planograma', 'S9']);
  });

  it('una versión no incluida (especial) no aporta filas aunque esté en las filas por versión', () => {
    const esp = version(4, 'A-ESP', 'GRANDE', 'publicado', { esEspecial: true });
    const todas = [...vs, esp];
    const base = baseDe(todas, [posicion(1, 4, 'S1')]);
    const hoja = X.construirHojaPivote(filasDe(base), X.validarPivote(todas).incluidas, base.productos);
    assert.equal(hoja.filas.length, 0);
  });
});

describe('ordenarPivote', () => {
  it('desempata por planogramaId cuando dos planogramas tienen el mismo nombre', () => {
    const g = (planogramaId, estadoVersion) => ({ sku: '123', planogramaId, planogramaNombre: 'PINTURAS', estadoVersion, modo: 'PLANOGRAMA' });
    const entrada = [g(9, 'publicado'), g(4, 'piloto'), g(4, 'publicado'), g(9, 'piloto')];
    const orden = X.ordenarPivote(entrada).map((x) => `${x.planogramaId}-${x.estadoVersion}`);
    assert.deepEqual(orden, ['4-publicado', '4-piloto', '9-publicado', '9-piloto']);
    assert.deepEqual(X.ordenarPivote([...entrada].reverse()).map((x) => `${x.planogramaId}-${x.estadoVersion}`), orden);
  });
});

describe('hoja Lista', () => {
  const vs = [version(1, 'A-TG', 'GRANDE', 'publicado'), version(2, 'B-TM', 'MEDIANA', 'borrador', { esEspecial: true, planogramaNombre: 'Otro' })];

  it('una fila por SKU–versión–modo, con las 28 columnas en el orden del contrato', () => {
    const base = baseDe(vs, [posicion(1, 1, 'S1', { facings: 2 }), posicion(2, 1, 'S1'), posicion(3, 1, 'S1', { modo: 'CROSS' }), posicion(4, 2, 'S1')]);
    const hoja = X.construirHojaLista(filasDe(base), base.productos);
    assert.equal(hoja.nombre, 'Lista');
    assert.equal(hoja.congelarFilas, 1);
    assert.deepEqual(hoja.encabezados, [
      'SKU', 'Producto', 'Área', 'Departamento', 'Planograma', 'Versión', 'Tipo (TG/TM/TE)', 'Estado de la versión', 'Especial de tienda', 'Modo',
      'Góndola', 'Sección', 'Nivel', 'Posición en nivel', 'Ganchos', 'Accesorio de montaje', 'Montaje', 'Facing horizontal', 'Cantidad apilable',
      'Capacidad del facing', 'Capacidad máxima', 'Mín. estético', 'Mín. final', 'Máx. final', 'Perfil de redondeo', 'Decisión', 'Observaciones', 'SKU sustituto',
    ]);
    assert.equal(hoja.anchos.length, 28);
    assert.equal(hoja.filas.length, 3);
    // orden SKU → versión (A-TG, B-TM) → modo
    const col = (f, etiqueta) => f[hoja.encabezados.indexOf(etiqueta)].valor;
    assert.deepEqual(hoja.filas.map((f) => `${col(f, 'Versión')}|${col(f, 'Modo')}`), ['A-TG|Planograma', 'A-TG|Cross', 'B-TM|Planograma']);
    const primera = hoja.filas[0];
    assert.equal(col(primera, 'Producto'), 'Llanta · Acme');
    assert.equal(col(primera, 'Área'), 'A01');
    assert.equal(col(primera, 'Departamento'), 'D05');
    assert.equal(col(primera, 'Tipo (TG/TM/TE)'), 'TG');
    assert.equal(col(primera, 'Estado de la versión'), 'Publicada');
    assert.equal(col(primera, 'Especial de tienda'), 'No');
    assert.equal(col(primera, 'Facing horizontal'), 3);
    assert.equal(col(hoja.filas[2], 'Estado de la versión'), 'Borrador');
    assert.equal(col(hoja.filas[2], 'Especial de tienda'), 'Sí');
    assert.equal(col(primera, 'SKU sustituto'), 'S9 · Otra');
  });

  it('sin posiciones → hoja solo con encabezados', () => {
    const base = baseDe(vs, []);
    assert.deepEqual(X.construirHojaLista(filasDe(base), base.productos).filas, []);
  });
});

describe('hoja Versiones y conteo', () => {
  it('lista cada versión elegida con Incluida y Motivo', () => {
    const esp = version(2, 'A-ESP', 'GRANDE', 'publicado', { esEspecial: true });
    const vs = [version(1, 'A', 'GRANDE', 'publicado'), esp];
    const { excluidas } = X.validarPivote(vs);
    const hoja = X.construirHojaVersiones(vs, excluidas);
    assert.equal(hoja.nombre, 'Versiones');
    assert.deepEqual(hoja.encabezados, ['Id', 'Código', 'Planograma', 'Tipo', 'Estado', 'Especial de tienda', 'Incluida', 'Motivo']);
    assert.deepEqual(hoja.filas.map((f) => f.map((c) => c.valor)), [
      [1, 'A', 'Ferretería', 'TG', 'Publicada', 'No', 'Sí', null],
      [2, 'A-ESP', 'Ferretería', 'TG', 'Publicada', 'Sí', 'No', 'Especial de tienda: no va en el Pivote'],
    ]);
  });

  it('en la Lista todas van incluidas', () => {
    const hoja = X.construirHojaVersiones([version(1, 'A', 'GRANDE', 'borrador', { esEspecial: true })]);
    assert.equal(hoja.filas[0][6].valor, 'Sí');
  });

  it('contarFilas: Lista cuenta filas por versión; Pivote, grupos', () => {
    const vs = [version(1, 'A-TG', 'GRANDE', 'publicado'), version(2, 'A-TM', 'MEDIANA', 'publicado')];
    const base = baseDe(vs, [posicion(1, 1, 'S1'), posicion(2, 2, 'S1')]);
    const filas = filasDe(base);
    assert.equal(X.contarFilas('LISTA', filas, vs), 2);
    assert.equal(X.contarFilas('PIVOTE', filas, vs), 1);
  });
});

describe('nombreArchivo', () => {
  it('formato enumerado y fecha', () => {
    assert.equal(X.nombreArchivo('PIVOTE', new Date(2026, 9, 19)), 'productos-por-planograma-pivote-20261019.xlsx');
    assert.equal(X.nombreArchivo('LISTA', new Date(2026, 0, 5)), 'productos-por-planograma-lista-20260105.xlsx');
  });
  it('un formato fuera de la lista lanza', () => {
    assert.throws(() => X.nombreArchivo('../x', new Date()));
    assert.throws(() => X.nombreArchivo('__proto__', new Date()));
  });
});

describe('constantes compartidas con el front', () => {
  it('encabezadosBloque sigue el literal del Excel de categorías', () => {
    assert.deepEqual(C.encabezadosBloque('TM', 2).slice(-3), ['Observaciones_TM', 'TM1', 'TM2']);
    assert.equal(C.encabezadosBloque('TE', 0).length, 13);
    assert.deepEqual(C.SIGLAS_BLOQUE, ['TG', 'TM', 'TE']);
    assert.deepEqual(C.TIPO_POR_SIGLA, { TG: 'GRANDE', TM: 'MEDIANA', TE: 'EXPRESS' });
  });
});
