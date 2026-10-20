/**
 * Pruebas de la tubería del Consolidado Tiendas (dominio puro).
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const E = require('../../src/domain/consolidado/consolidado.entity');

// ─── Constructores de base ───────────────────────────────────────────────────

function posicion(id, nivelId, sku, extra = {}) {
  return {
    id, nivelId, ordenHorizontal: id, sku, nombre: null, facings: 1, capacidadMaxima: 6, minFinal: 2, maxFinal: 6,
    ganchos: null, modo: 'PLANOGRAMA', cantidadApilable: 1, capacidadFacing: 3, minEstetico: 2, perfil: 'MRP',
    decision: 'ACTIVO', observaciones: null, crossExterno: false, montarEnDisplay: false, desbordaGondola: false,
    notaDesborde: null, ...extra,
  };
}

const version = (versionId, codigo, estado = 'publicado') => ({ versionId, codigo, estado, planogramaId: versionId * 10, planogramaNombre: `Plano ${codigo}` });
const gondola = (id, versionId, nombre = `G${id}`) => ({ id, versionId, nombre, orden: id, anchoCm: 100, altoCm: 200, porUbicar: false });
const nivel = (id, gondolaId, orden = 1) => ({ id, gondolaId, seccionId: null, orden });
const tienda = (id) => ({ id, codigo: String(100 + id), nombre: `Tienda ${id}`, tipo: 'GRANDE', marca: 'Cemaco' });
const producto = (sku, nombre, marca = null) => ({ sku, nombre, marca, skuSustituto: null, nombreSustituto: null });

/** Versiones 1 y 2 (publicadas) con una góndola y un nivel cada una; tienda 1 monta ambas. */
function baseMinima(extra = {}) {
  return {
    versiones: [version(1, 'AAA-TG'), version(2, 'BBB-TG')],
    asignaciones: [{ versionId: 1, tiendaId: 1 }, { versionId: 2, tiendaId: 1 }],
    tiendas: [tienda(1)],
    gondolas: [gondola(1, 1), gondola(2, 2)],
    secciones: [],
    niveles: [nivel(1, 1), nivel(2, 2)],
    posiciones: [],
    accesorios: [],
    productos: [producto('S1', 'Llanta', 'Acme'), producto('S2', 'Árbol')],
    ...extra,
  };
}

const pipeline = (base) => E.contarPlanogramasPorGrupo(E.expandirPorTienda(E.construirFilasPorVersion(base), base));
const grupoDe = (grupos, sku, tiendaId = 1) => grupos.find((g) => g.sku === sku && g.tienda.id === tiendaId);

const CLAVES_FILA = [
  'versionId', 'codigoVersion', 'planogramaId', 'planogramaNombre', 'estadoVersion', 'tipoVersion', 'esEspecial', 'modo', 'ubicaciones', 'accesorios',
  'facings', 'cantidadApilable', 'capacidadFacing', 'capacidadMaxima', 'minEstetico', 'minFinal', 'maxFinal',
  'minVaria', 'maxVaria', 'perfil', 'decision', 'variaciones', 'observaciones', 'montaje',
];

describe('construirFilasPorVersion', () => {
  it('dos ubicaciones de la misma versión y SKU → una fila con facings sumados y dos ubicaciones', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1', { facings: 2 }), posicion(2, 1, 'S1', { facings: 3 })] });
    const filas = E.construirFilasPorVersion(base).get(1);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].fila.facings, 5);
    assert.equal(filas[0].fila.capacidadMaxima, 12);
    assert.equal(filas[0].fila.ubicaciones.length, 2);
    assert.deepEqual(filas[0].fila.ubicaciones.map((u) => u.nivel), [1, 1]);
  });

  it('claves de la Fila exactamente las del contrato', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1')] });
    const { fila } = E.construirFilasPorVersion(base).get(1)[0];
    assert.deepEqual(Object.keys(fila), CLAVES_FILA);
    assert.deepEqual(Object.keys(fila.ubicaciones[0]), ['posicionId', 'gondola', 'porUbicar', 'seccion', 'nivel', 'orden', 'ganchos']);
    assert.deepEqual(Object.keys(fila.montaje), ['colganteExterno', 'display', 'desborda', 'notaDesborde']);
  });

  it('PLANOGRAMA y CROSS del mismo SKU y versión → dos filas', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1'), posicion(2, 1, 'S1', { modo: 'CROSS' })] });
    assert.deepEqual(E.construirFilasPorVersion(base).get(1).map((x) => x.fila.modo), ['PLANOGRAMA', 'CROSS']);
  });

  it('excluye SKU nulo y modo PENDIENTE, pero estos siguen contando para los ganchos', () => {
    const base = baseMinima({
      posiciones: [posicion(1, 1, null, { modo: 'PENDIENTE' }), posicion(2, 1, 'S1', { modo: 'PENDIENTE' }), posicion(3, 1, 'S2')],
    });
    const filas = E.construirFilasPorVersion(base).get(1);
    assert.deepEqual(filas.map((x) => x.sku), ['S2']);
    assert.deepEqual(filas[0].fila.ubicaciones[0].ganchos, [3]);
  });

  it('omite posiciones huérfanas sin lanzar', () => {
    const base = baseMinima({
      posiciones: [posicion(1, 99, 'S1'), posicion(2, 1, 'S2'), posicion(3, 3, 'S1')],
      niveles: [nivel(1, 1), nivel(2, 2), nivel(3, 77)], // nivel 3 sin góndola cargada
    });
    const filas = E.construirFilasPorVersion(base).get(1);
    assert.deepEqual(filas.map((x) => x.sku), ['S2']);
  });

  it('ignora versiones que no son publicado ni piloto (defensa)', () => {
    const base = baseMinima({
      versiones: [version(1, 'AAA-TG', 'borrador'), version(2, 'BBB-TG', 'piloto')],
      posiciones: [posicion(1, 1, 'S1'), posicion(2, 2, 'S1')],
    });
    const mapa = E.construirFilasPorVersion(base);
    assert.equal(mapa.has(1), false);
    assert.equal(mapa.has(2), true);
    assert.equal(grupoDe(pipeline(base), 'S1').planograma.length, 1);
  });

  it('minVaria, capacidadMáxima nula, observaciones unidas y banderas de montaje', () => {
    const base = baseMinima({
      posiciones: [
        posicion(1, 1, 'S1', { minFinal: 2, capacidadMaxima: null, observaciones: 'a', crossExterno: true }),
        posicion(2, 1, 'S1', { minFinal: 4, observaciones: 'b', desbordaGondola: true, notaDesborde: 'n1' }),
        posicion(3, 1, 'S1', { observaciones: 'a', montarEnDisplay: true, desbordaGondola: true, notaDesborde: 'n2' }),
      ],
      accesorios: [
        { posicionId: 2, orden: 2, codigo: 'B', tamanoPulgadas: 10 },
        { posicionId: 1, orden: 1, codigo: 'A', tamanoPulgadas: null },
        { posicionId: 3, orden: 1, codigo: 'A', tamanoPulgadas: null },
      ],
    });
    const { fila } = E.construirFilasPorVersion(base).get(1)[0];
    assert.equal(fila.minVaria, true);
    assert.equal(fila.minFinal, null);
    assert.equal(fila.maxVaria, false);
    assert.equal(fila.maxFinal, 6);
    assert.equal(fila.capacidadMaxima, null);
    assert.equal(fila.observaciones, 'a · b');
    assert.deepEqual(fila.montaje, { colganteExterno: true, display: true, desborda: true, notaDesborde: 'n1 · n2' });
    assert.deepEqual(fila.accesorios, [{ codigo: 'A', tamanoPulgadas: null }, { codigo: 'B', tamanoPulgadas: 10 }]);
  });

  it('perfil y decisión: valor común o null', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1', { perfil: 'X' }), posicion(2, 1, 'S1', { perfil: 'Y' })] });
    const { fila } = E.construirFilasPorVersion(base).get(1)[0];
    assert.equal(fila.perfil, null);
    assert.equal(fila.decision, 'ACTIVO');
  });
});

describe('construirFilasPorVersion con opciones (productos por planograma)', () => {
  const TODOS = ['borrador', 'en_desarrollo', 'piloto', 'publicado'];

  it('sin opciones: solo piloto y publicado (el consolidado no cambia)', () => {
    const base = baseMinima({
      versiones: [version(1, 'A', 'borrador'), version(2, 'B', 'en_desarrollo'), version(3, 'C', 'piloto'), version(4, 'D', 'publicado')],
      gondolas: [], niveles: [], posiciones: [],
    });
    assert.deepEqual([...E.construirFilasPorVersion(base).keys()], [3, 4]);
    assert.deepEqual([...E.construirFilasPorVersion(base, { estados: TODOS }).keys()], [1, 2, 3, 4]);
  });

  // Tres posiciones del mismo SKU y modo en la versión 1; la del medio es la 2.ª en orden físico.
  const baseTres = () => baseMinima({
    posiciones: [
      posicion(1, 1, 'S1', { facings: 1 }),
      posicion(2, 1, 'S1', { facings: 2, cantidadApilable: 4 }),
      posicion(3, 1, 'S1', { facings: 4 }),
    ],
  });

  it('regla D3: solo cuentan las posiciones que pasaron; los ganchos conservan la numeración de la versión completa', () => {
    const filas = E.construirFilasPorVersion(baseTres(), { posicionIds: new Set([2, 3]) }).get(1);
    assert.equal(filas.length, 1);
    const { fila } = filas[0];
    assert.equal(fila.ubicaciones.length, 2);
    assert.equal(fila.facings, 6);
    // posición 1 usa el gancho 1; la 2 empieza en el 2 (no se renumera al filtrar)
    assert.deepEqual(fila.ubicaciones.map((u) => u.ganchos), [[2, 3], [4, 5, 6, 7]]);
    assert.equal(fila.variaciones.cantidadApilable, true);
  });

  it('posicionIds vacío → sin filas; ids ajenos a la versión se descartan sin error', () => {
    assert.deepEqual(E.construirFilasPorVersion(baseTres(), { posicionIds: new Set() }).get(1), []);
    const filas = E.construirFilasPorVersion(baseTres(), { posicionIds: new Set([1, 999, 12345]) }).get(1);
    assert.equal(filas[0].fila.ubicaciones.length, 1);
  });

  it('skus que excluye el SKU → sin fila; incluido → fila', () => {
    assert.deepEqual(E.construirFilasPorVersion(baseTres(), { skus: new Set(['S2']) }).get(1), []);
    assert.equal(E.construirFilasPorVersion(baseTres(), { skus: new Set(['S1']) }).get(1).length, 1);
  });

  it('agrega tipo y especial de la versión; variaciones en falso cuando todo coincide', () => {
    const base = baseMinima({
      versiones: [{ ...version(1, 'AAA-TG'), tipo: 'GRANDE', esEspecial: true }, version(2, 'BBB-TG')],
      posiciones: [posicion(1, 1, 'S1'), posicion(2, 1, 'S1')],
    });
    const { fila } = E.construirFilasPorVersion(base).get(1)[0];
    assert.equal(fila.tipoVersion, 'GRANDE');
    assert.equal(fila.esEspecial, true);
    assert.deepEqual(fila.variaciones, { cantidadApilable: false, capacidadFacing: false, minEstetico: false, perfil: false, decision: false });
    assert.equal(E.construirFilasPorVersion(base).get(2).length, 0);
  });

  it('un nulo junto a un valor cuenta como variación', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1', { minEstetico: null }), posicion(2, 1, 'S1', { minEstetico: 3 })] });
    assert.equal(E.construirFilasPorVersion(base).get(1)[0].fila.variaciones.minEstetico, true);
  });
});

describe('grupos, conteo y filtros', () => {
  const baseDos = () => baseMinima({
    posiciones: [
      posicion(1, 1, 'S1'), posicion(2, 2, 'S1'),                       // S1 en dos planogramas
      posicion(3, 1, 'S2', { modo: 'CROSS' }),                          // S2 solo cross
    ],
  });

  it('SKU en dos versiones de la tienda → planogramasEnTienda 2', () => {
    const grupos = pipeline(baseDos());
    assert.equal(grupoDe(grupos, 'S1').planogramasEnTienda, 2);
    assert.deepEqual(grupoDe(grupos, 'S1').planograma.map((f) => f.codigoVersion), ['AAA-TG', 'BBB-TG']);
  });

  it('grupo solo con cross → planograma vacío', () => {
    const g = grupoDe(pipeline(baseDos()), 'S2');
    assert.deepEqual(g.planograma, []);
    assert.equal(g.otras.length, 1);
    assert.equal(g.planogramasEnTienda, 0);
  });

  it('el filtro de versión no cambia planogramasEnTienda', () => {
    const filtrados = E.aplicarFiltros(pipeline(baseDos()), { versionIds: [1] });
    const g = grupoDe(filtrados, 'S1');
    assert.equal(g.planograma.length, 1);
    assert.equal(g.planogramasEnTienda, 2);
  });

  it('con filtro de versión, el grupo que solo conserva un impulso sale con planograma []', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1'), posicion(2, 2, 'S1', { modo: 'IMPULSO' })] });
    const g = grupoDe(E.aplicarFiltros(pipeline(base), { versionIds: [2] }), 'S1');
    assert.deepEqual(g.planograma, []);
    assert.equal(g.otras.length, 1);
    assert.equal(g.planogramasEnTienda, 1);
  });

  it('soloDuplicados, estados, tiendas y jerarquía', () => {
    const grupos = pipeline(baseDos());
    assert.deepEqual(E.aplicarFiltros(grupos, { soloDuplicados: true }).map((g) => g.sku), ['S1']);
    assert.equal(E.aplicarFiltros(grupos, { estados: ['piloto'] }).length, 0);
    assert.equal(E.aplicarFiltros(grupos, { tiendaIds: [9] }).length, 0);
    assert.deepEqual(E.aplicarFiltros(grupos, { skusJerarquia: new Set(['S2']) }).map((g) => g.sku), ['S2']);
  });

  it('búsqueda sin acentos ni mayúsculas sobre sku, nombre y marca; nunca como regex', () => {
    const grupos = pipeline(baseDos());
    assert.deepEqual(E.aplicarFiltros(grupos, { busqueda: 'ARBOL' }).map((g) => g.sku), ['S2']);
    assert.deepEqual(E.aplicarFiltros(grupos, { busqueda: 'acme' }).map((g) => g.sku), ['S1']);
    assert.deepEqual(E.aplicarFiltros(grupos, { busqueda: 's2' }).map((g) => g.sku), ['S2']);
    assert.doesNotThrow(() => E.aplicarFiltros(grupos, { busqueda: '(((((a' }));
    assert.equal(E.aplicarFiltros(grupos, { busqueda: '(((((a' }).length, 0);
  });

  it('resumen sobre todo lo filtrado', () => {
    const base = baseDos();
    base.posiciones.push(posicion(4, 2, 'S2', { modo: 'IMPULSO' }));
    const resumen = E.calcularResumen(pipeline(base), 100000);
    assert.deepEqual(resumen, {
      filas: 4, skus: 2, tiendas: 1, gruposConVariosPlanogramas: 1,
      conteos: { PLANOGRAMA: 2, CROSS: 1, IMPULSO: 1, AGREGADO: 2 }, maximoExportacion: 100000,
    });
  });
});

describe('vista, orden y paginación', () => {
  function grande() {
    const base = baseMinima({ tiendas: [tienda(1), tienda(2)] });
    base.asignaciones.push({ versionId: 1, tiendaId: 2 });
    base.productos = ['S3', 'S1', 'S2', 'S10'].map((s) => producto(s, `Prod ${s}`));
    base.posiciones = [
      posicion(1, 1, 'S3'), posicion(2, 1, 'S1'), posicion(3, 1, 'S2'), posicion(4, 1, 'S10'),
      posicion(5, 1, 'S1', { modo: 'CROSS' }), posicion(6, 2, 'S1', { modo: 'CROSS' }),
    ];
    return pipeline(base);
  }

  it('unidadesDeVista: CROSS/IMPULSO generan un grupo por fila con planograma []', () => {
    const cross = E.unidadesDeVista(grande(), 'CROSS');
    assert.equal(cross.length, 3); // S1 en tienda 1 (v1 y v2) + S1 en tienda 2 (v1)
    assert.ok(cross.every((u) => u.planograma.length === 0 && u.otras.length === 1 && u.otras[0].modo === 'CROSS'));
    assert.equal(E.unidadesDeVista(grande(), 'IMPULSO').length, 0);
  });

  it('ordena por SKU (numérico) con desempate por tienda; descendente; por tienda y producto', () => {
    const ord = E.ordenar(grande(), 'sku', 'asc').map((g) => `${g.sku}/${g.tienda.id}`);
    assert.deepEqual(ord, ['S1/1', 'S1/2', 'S2/1', 'S2/2', 'S3/1', 'S3/2', 'S10/1', 'S10/2']);
    assert.deepEqual(E.ordenar(grande(), 'sku', 'desc').map((g) => g.sku).slice(0, 2), ['S10', 'S10']);
    assert.deepEqual(E.ordenar(grande(), 'tienda', 'desc').map((g) => g.tienda.id)[0], 2);
    assert.deepEqual(E.ordenar(grande(), 'producto', 'asc').map((g) => g.sku).slice(0, 2), ['S1', 'S1']);
  });

  it('orden desconocido cae en SKU sin lanzar', () => {
    assert.equal(E.ordenar(grande(), '__proto__', 'asc')[0].sku, 'S1');
  });

  it('paginar: página fuera de rango → data [] con total correcto', () => {
    const unidades = E.ordenar(grande(), 'sku', 'asc');
    const p1 = E.paginar(unidades, 1, 3);
    assert.equal(p1.data.length, 3);
    assert.equal(p1.total, 8);
    assert.deepEqual(E.paginar(unidades, 50, 3), { data: [], total: 8, page: 50, pageSize: 3 });
    assert.equal(E.paginar(unidades, 3, 3).data.length, 2);
  });
});

describe('exportación', () => {
  const COLS = ['sku', 'tienda', 'version', 'minFinal', 'maxFinal', 'montaje'];

  function baseExport() {
    return baseMinima({
      posiciones: [
        posicion(1, 1, 'S1', { minFinal: 2, maxFinal: 6, crossExterno: true }),
        posicion(2, 1, 'S1', { modo: 'CROSS', minFinal: 2, maxFinal: 6 }),       // misma versión: no suma doble
        posicion(3, 2, 'S1', { minFinal: 3, maxFinal: 9 }),                      // otra versión: suma
        posicion(4, 1, 'S2', { modo: 'CROSS', minFinal: null, maxFinal: null }), // sin planograma
        posicion(5, 2, 'S2', { modo: 'IMPULSO', minFinal: null, maxFinal: null }),
      ],
    });
  }

  it('contarFilasExportacion por formato', () => {
    const grupos = pipeline(baseExport());
    assert.equal(E.contarFilasExportacion(grupos, 'DETALLADO'), 5);
    assert.equal(E.contarFilasExportacion(grupos, 'AGREGADO'), 2);
    assert.equal(E.contarFilasExportacion(grupos, 'HOJAS', ['CROSS', 'IMPULSO']), 3);
    assert.equal(E.contarFilasExportacion(grupos, 'HOJAS', ['PLANOGRAMA']), 2);
  });

  it('DETALLADO antepone Modo si falta y no lo duplica si viene', () => {
    const grupos = pipeline(baseExport());
    const [h] = E.construirHojas(grupos, 'DETALLADO', [], COLS);
    assert.equal(h.nombre, 'Consolidado');
    assert.deepEqual(h.encabezados, ['Modo', 'SKU', 'Tienda', 'Planograma versión', 'Mín. final', 'Máx. final', 'Montaje']);
    assert.equal(h.filas.length, 5);
    assert.equal(h.filas[0].length, 7);
    const [h2] = E.construirHojas(grupos, 'DETALLADO', [], ['sku', 'modo']);
    assert.deepEqual(h2.encabezados, ['SKU', 'Modo']);
  });

  it('DETALLADO: orden SKU, tienda, versión; dentro del grupo PLANOGRAMA → CROSS → IMPULSO', () => {
    const [h] = E.construirHojas(pipeline(baseExport()), 'DETALLADO', [], ['sku', 'modo', 'version']);
    assert.deepEqual(h.filas.map((f) => f.map((c) => c.valor).join('|')), [
      'S1|Planograma|AAA-TG · Plano AAA-TG',
      'S1|Planograma|BBB-TG · Plano BBB-TG',
      'S1|Cross|AAA-TG · Plano AAA-TG',
      'S2|Cross|AAA-TG · Plano AAA-TG',
      'S2|Impulso|BBB-TG · Plano BBB-TG',
    ]);
  });

  it('AGREGADO: mín./máx. una vez por versión y sumados entre versiones; todos null → vacío', () => {
    const [h] = E.construirHojas(pipeline(baseExport()), 'AGREGADO', [], COLS);
    assert.equal(h.nombre, 'Min-Max agregado');
    assert.deepEqual(h.encabezados, ['SKU', 'Tienda', 'Planograma versión', 'Mín. final', 'Máx. final', 'Montaje']);
    const [s1, s2] = h.filas;
    assert.deepEqual(s1[3], { tipo: 'numero', valor: 5 });  // 2 (v1, contado una vez) + 3 (v2)
    assert.deepEqual(s1[4], { tipo: 'numero', valor: 15 });
    assert.equal(s1[2].valor, 'AAA-TG · Plano AAA-TG | BBB-TG · Plano BBB-TG');
    assert.equal(s1[5].valor, 'Colgante externo');
    assert.deepEqual(s2[3], { tipo: 'texto', valor: null });
    assert.deepEqual(s2[4], { tipo: 'texto', valor: null });
  });

  it('AGREGADO: si una versión "Varía" el mín. muestra "Varía" y no una suma parcial', () => {
    const base = baseMinima({
      posiciones: [
        posicion(1, 1, 'S1', { minFinal: 4, maxFinal: 6 }),
        posicion(2, 2, 'S1', { minFinal: 2, maxFinal: 6 }),  // misma versión 2: mín. 2 y 3 → Varía
        posicion(3, 2, 'S1', { minFinal: 3, maxFinal: 6 }),
      ],
    });
    const [h] = E.construirHojas(pipeline(base), 'AGREGADO', [], ['sku', 'minFinal', 'maxFinal']);
    assert.deepEqual(h.filas[0][1], { tipo: 'texto', valor: 'Varía' });
    assert.deepEqual(h.filas[0][2], { tipo: 'numero', valor: 12 }); // el máx. no varía: 6 + 6
  });

  it('AGREGADO: mín. estético y capacidad máxima suman planograma + cross + impulso, incluso de la misma versión', () => {
    const base = baseMinima({
      posiciones: [
        posicion(1, 1, 'S1', { minEstetico: 2, capacidadMaxima: 6 }),
        posicion(2, 1, 'S1', { modo: 'CROSS', minEstetico: 3, capacidadMaxima: 4 }),   // misma versión 1
        posicion(3, 2, 'S1', { modo: 'IMPULSO', minEstetico: null, capacidadMaxima: 5 }), // sin mín. estético: no aporta
      ],
    });
    const [h] = E.construirHojas(pipeline(base), 'AGREGADO', [], ['sku', 'minEstetico', 'capacidadMaxima']);
    assert.equal(h.filas.length, 1);
    assert.deepEqual(h.filas[0][1], { tipo: 'numero', valor: 5 });  // 2 + 3
    assert.deepEqual(h.filas[0][2], { tipo: 'numero', valor: 15 }); // 6 + 4 + 5
  });

  it('AGREGADO sin planograma: columnas de fila vacías; sku, producto, tienda y sustituto llenas', () => {
    const grupos = E.aplicarFiltros(pipeline(baseExport()), { busqueda: 's2' });
    const [h] = E.construirHojas(grupos, 'AGREGADO', [], ['sku', 'producto', 'tienda', 'sustituto', 'version', 'gondola']);
    assert.equal(h.filas.length, 1);
    const [sku, prod, tiendaTexto, sust, ver, gon] = h.filas[0].map((c) => c.valor);
    assert.equal(sku, 'S2');
    assert.equal(prod, 'Árbol');
    assert.equal(tiendaTexto, '101 · Tienda 1');
    assert.equal(sust, null);
    assert.equal(ver, null);
    assert.equal(gon, null);
  });

  it('AGREGADO: un solo valor numérico conserva su tipo', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1', { facings: 4 })] });
    const [h] = E.construirHojas(pipeline(base), 'AGREGADO', [], ['sku', 'facings']);
    assert.deepEqual(h.filas[0][1], { tipo: 'numero', valor: 4 });
  });

  it('HOJAS: orden fijo, hoja sin filas solo con encabezados', () => {
    const hojas = E.construirHojas(pipeline(baseExport()), 'HOJAS', ['IMPULSO', 'PLANOGRAMA'], ['sku', 'modo']);
    assert.deepEqual(hojas.map((h) => h.nombre), ['Planograma', 'Impulso']);
    assert.deepEqual(hojas[0].encabezados, ['SKU', 'Modo']);
    assert.equal(hojas[0].filas.length, 2);
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1')] });
    const todas = E.construirHojas(pipeline(base), 'HOJAS', ['PLANOGRAMA', 'CROSS', 'IMPULSO'], ['sku']);
    assert.deepEqual(todas.map((h) => [h.nombre, h.filas.length]), [['Planograma', 1], ['Cross', 0], ['Impulso', 0]]);
    assert.deepEqual(todas[1].encabezados, ['SKU']);
  });

  it('celdas numéricas con tipo número y "Varía" como texto', () => {
    const base = baseMinima({ posiciones: [posicion(1, 1, 'S1', { minFinal: 1 }), posicion(2, 1, 'S1', { minFinal: 2 })] });
    const [h] = E.construirHojas(pipeline(base), 'HOJAS', ['PLANOGRAMA'], ['facings', 'minFinal']);
    assert.deepEqual(h.filas[0], [{ tipo: 'numero', valor: 2 }, { tipo: 'texto', valor: 'Varía' }]);
  });
});
