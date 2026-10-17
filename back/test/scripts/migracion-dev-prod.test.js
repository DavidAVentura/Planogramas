const test = require('node:test');
const assert = require('node:assert/strict');

const plan = require('../../scripts/migracion-dev-prod/plan');
const { migrar } = require('../../scripts/migracion-dev-prod/orquestador');

const {
  parsearArgs, validarIdentidad, evaluarContenidoDestino, compararEsquema, expresionSelect,
  tamanoLote, hashFilas, reescribirBlob, verificarBlobsFilas, formatearError, blobYaIdentico,
  enParalelo, ORDEN_TABLAS, BASE_URL_ORIGEN, BASE_URL_DESTINO,
} = plan;

const OTB = { bd: 'OTB', servidor: 'comerciales' };
const PROD = { bd: 'db-planogramas', servidor: 'comerciales' };

// ---------------------------------------------------------------- T1

test('validarIdentidad: origen igual al destino, origen o destino equivocado', () => {
  assert.throws(() => validarIdentidad({ origen: PROD, destino: PROD, modo: 'simulacro' }), /misma base/);
  assert.throws(() => validarIdentidad({ origen: { ...PROD }, destino: OTB, modo: 'simulacro' }), /origen/);
  assert.throws(() => validarIdentidad({ origen: OTB, destino: OTB, modo: 'simulacro' }), /misma base/);
  assert.throws(() => validarIdentidad({ origen: { bd: 'OTB2', servidor: 'comerciales' }, destino: PROD, modo: 'simulacro' }), /origen/);
  assert.throws(() => validarIdentidad({ origen: OTB, destino: { bd: 'otra', servidor: 'comerciales' }, modo: 'simulacro' }), /destino/);
});

test('validarIdentidad: servidor distinto falla y el caso correcto no lanza', () => {
  assert.throws(() => validarIdentidad({ origen: OTB, destino: { ...PROD, servidor: 'otro' }, modo: 'simulacro' }), /servidor/);
  assert.throws(() => validarIdentidad({ origen: { ...OTB, servidor: 'x' }, destino: PROD, modo: 'simulacro' }), /servidor/);
  assert.doesNotThrow(() => validarIdentidad({ origen: OTB, destino: PROD, modo: 'simulacro' }));
  assert.doesNotThrow(() => validarIdentidad({ origen: OTB, destino: PROD, modo: 'ejecutar', confirmar: 'db-planogramas' }));
});

test('parsearArgs y confirmación exacta', () => {
  assert.deepEqual(parsearArgs([]), { modo: 'simulacro', confirmar: null, forzarVaciado: false });
  assert.equal(parsearArgs(['--verificar']).modo, 'verificar');
  assert.equal(parsearArgs(['--solo-blobs', '--ejecutar', '--confirmar=db-planogramas']).modo, 'solo-blobs');
  assert.equal(parsearArgs(['--ejecutar', '--confirmar=db-planogramas', '--forzar-vaciado']).forzarVaciado, true);
  assert.throws(() => parsearArgs(['--ejecutar']), /confirmar/);
  assert.throws(() => parsearArgs(['--forzar-vaciado']), /ejecutar/);
  assert.throws(() => parsearArgs(['--solo-blobs']), /ejecutar/);
  assert.throws(() => parsearArgs(['--verificar', '--ejecutar', '--confirmar=db-planogramas']), /verificar/);
  assert.throws(() => parsearArgs(['--otro']), /desconocido/);
  for (const confirmar of ['DB-Planogramas', ' db-planogramas']) {
    const opciones = parsearArgs(['--ejecutar', `--confirmar=${confirmar}`]);
    assert.throws(() => validarIdentidad({ origen: OTB, destino: PROD, ...opciones }), /confirmar/);
  }
});

test('evaluarContenidoDestino', () => {
  const fixtures = { Tienda: [{ id: 1, codigo: 'T004' }], Accesorio: [{ id: 1, codigo: 'G-12-FIXTURE' }] };
  const base = { Tienda: 1, Accesorio: 1 };
  assert.equal(evaluarContenidoDestino(base, fixtures, false).ok, true);
  const extra = evaluarContenidoDestino({ ...base, Planograma: 1 }, fixtures, false);
  assert.equal(extra.ok, false);
  assert.ok(extra.aBorrar.includes('Planograma: 1'));
  const forzado = evaluarContenidoDestino({ ...base, Planograma: 1 }, fixtures, true);
  assert.equal(forzado.ok, true);
  assert.ok(forzado.advertencia);
  const otro = { ...fixtures, Tienda: [{ id: 1, codigo: 'OTRA' }] };
  assert.equal(evaluarContenidoDestino(base, otro, false).ok, false);
});

function esquemaBase() {
  const tabla = () => ({
    columnas: [{ nombre: 'id', tipo: 'int', longitud: 4, precision: 10, escala: 0, nulable: false, collation: null }],
    pk: ['id'], unicos: [], fks: [], identity: true,
  });
  return Object.fromEntries(ORDEN_TABLAS.map((t) => [t, tabla()]));
}

test('compararEsquema detecta collation, filtro, tabla faltante y tablas extra', () => {
  assert.deepEqual(compararEsquema(esquemaBase(), esquemaBase()), []);

  const conCollation = esquemaBase();
  conCollation.Tienda.columnas[0].collation = 'Latin1_General_CI_AS';
  assert.ok(compararEsquema(esquemaBase(), conCollation).some((d) => d.includes('Tienda.id')));

  const a = esquemaBase();
  const b = esquemaBase();
  a.Producto.unicos = [{ nombre: 'ux', columnas: ['id'], filtro: '([id] IS NOT NULL)' }];
  b.Producto.unicos = [{ nombre: 'ux', columnas: ['id'], filtro: null }];
  assert.ok(compararEsquema(a, b).some((d) => d.includes('únicos')));

  const sinTabla = esquemaBase();
  delete sinTabla.Nivel;
  assert.ok(compararEsquema(esquemaBase(), sinTabla).some((d) => d.includes('Nivel') && d.includes('PROD')));

  const extra = esquemaBase();
  extra.Otra = extra.Tienda;
  extra.knex_migrations = extra.Tienda;
  const difs = compararEsquema(esquemaBase(), extra);
  assert.equal(difs.length, 1);
  assert.match(difs[0], /Otra/);
});

test('expresionSelect y tamanoLote', () => {
  assert.equal(expresionSelect({ nombre: 'f', tipo: 'datetime2' }), 'CONVERT(varchar(27), [f], 121) AS [f]');
  assert.equal(expresionSelect({ nombre: 'm', tipo: 'decimal' }), 'CAST([m] AS varchar(40)) AS [m]');
  assert.equal(expresionSelect({ nombre: 'n', tipo: 'int' }), '[n]');
  assert.throws(() => expresionSelect({ nombre: 'x', tipo: 'varbinary' }), /no soportado/);
  assert.equal(tamanoLote(24), 83);
});

test('hashFilas', () => {
  const cols = ['id', 'v'];
  const h = (filas, pk = ['id']) => hashFilas(filas, cols, pk);
  assert.notEqual(h([{ id: 1, v: null }]), h([{ id: 1, v: 'null' }]));
  assert.notEqual(
    h([{ id: 1, v: '2026-10-01 10:00:00.1234567' }]),
    h([{ id: 1, v: '2026-10-01 10:00:00.1234560' }]),
  );
  const f1 = { id: 1, v: 'a' };
  const f2 = { id: 2, v: 'b' };
  assert.equal(h([f1, f2]), h([f2, f1]));
  assert.notEqual(h([f1, f2]), h([f1, { id: 2, v: 'c' }]));
  // 10 vs 9: orden numérico, estable en cualquier orden de entrada.
  const n = [{ id: 10, v: 'x' }, { id: 9, v: 'y' }];
  assert.equal(h(n), h([...n].reverse()));
  // PK compuesta y PK de texto.
  const comp = [{ id: 1, v: 'b' }, { id: 1, v: 'a' }, { id: 0, v: 'z' }];
  assert.equal(h(comp, ['id', 'v']), h([...comp].reverse(), ['id', 'v']));
  const txt = [{ id: 'B', v: 1 }, { id: 'a', v: 2 }];
  assert.equal(h(txt), h([...txt].reverse()));
});

const filaBlob = (extra = {}) => ({
  id: 1,
  blob_container: 'adjuntos-dev',
  blob_path: 'v1/a.pdf',
  blob_url: `${BASE_URL_ORIGEN}v1/a.pdf`,
  ...extra,
});

test('reescribirBlob', () => {
  const r = reescribirBlob(filaBlob());
  assert.equal(r.blob_container, 'adjuntos');
  assert.equal(r.blob_url, `${BASE_URL_DESTINO}v1/a.pdf`);
  assert.throws(() => reescribirBlob(filaBlob({ blob_url: 'https://planogramasstorage.blob.core.windows.net/otro/v1/a.pdf' })), /blob_url/);
  assert.throws(() => reescribirBlob(filaBlob({ blob_container: 'adjuntos' })), /blob_container/);
  assert.throws(() => reescribirBlob(filaBlob({ blob_path: '' })), /vacío/);
});

test('reescribirBlob rechaza query string y verificarBlobsFilas detecta adjuntos-dev', () => {
  const path = 'v1/a.pdf?sig=abc';
  assert.throws(() => reescribirBlob(filaBlob({ blob_path: path, blob_url: BASE_URL_ORIGEN + path })), /query/);
  const buena = { blob_container: 'adjuntos', blob_path: 'p', blob_url: `${BASE_URL_DESTINO}p` };
  assert.deepEqual(verificarBlobsFilas([buena]), []);
  const mala = { blob_container: 'adjuntos-dev', blob_path: 'p', blob_url: `${BASE_URL_ORIGEN}p` };
  assert.equal(verificarBlobsFilas([buena, mala]).length, 2);
});

test('formatearError oculta query strings y recorta', () => {
  const salida = formatearError({ code: 'X', message: 'falló https://a.blob.core.windows.net/c/x.pdf?sv=1&sig=abc fin' });
  assert.ok(!salida.includes('sig='));
  assert.ok(salida.startsWith('[X]'));
  const larga = formatearError({ statusCode: 500, message: 'a'.repeat(2000) });
  assert.ok(larga.length <= 300 + '[500] '.length);
  assert.doesNotThrow(() => formatearError({ request: { headers: 'secreto' }, message: 'm' }));
  assert.ok(!formatearError({ request: 'secreto', message: 'm' }).includes('secreto'));
});

test('formatearError conserva la causa real de un error de knex con SQL largo', () => {
  const sql = `insert into [Tienda] ([id]) values (${'1, '.repeat(1000)}1)`;
  const err = { code: 'EREQUEST', number: 547, message: `${sql} - The INSERT statement conflicted with the FOREIGN KEY constraint "FK_x".` };
  const salida = formatearError(err);
  assert.ok(salida.startsWith('[547]'));
  assert.ok(salida.includes('conflicted with the FOREIGN KEY'));
  assert.ok(!salida.includes('insert into'));
  assert.ok(salida.length <= 300 + '[547] '.length);
});

test('formatearError no corta los errores propios con " - "', () => {
  const salida = formatearError(new Error('El esquema no es idéntico:\n - a\n - b'));
  assert.ok(salida.includes('El esquema no es idéntico:'));
  assert.ok(salida.includes(' - a'));
});

test('orquestador: commit dudoso conserva --verificar aunque la causa traiga " - "', async () => {
  const m = mundo();
  m.trx.commit = async () => { throw Object.assign(new Error('Connection lost - read ECONNRESET'), { code: 'ESOCKET' }); };
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' }), /--verificar/);
});

test('enParalelo no toma más trabajos cuando detener() es verdadero', async () => {
  const tomados = [];
  await enParalelo([1, 2, 3, 4, 5, 6], 1, async (n) => { tomados.push(n); }, () => tomados.length >= 2);
  assert.deepEqual(tomados, [1, 2]);
});

test('blobYaIdentico', () => {
  const o = { tamanoBytes: 10, md5: 'abc' };
  assert.equal(blobYaIdentico(o, { tamanoBytes: 10, md5: 'abc' }), true);
  assert.equal(blobYaIdentico(o, { tamanoBytes: 10, md5: 'xyz' }), false);
  assert.equal(blobYaIdentico({ tamanoBytes: 10, md5: null }, { tamanoBytes: 10, md5: null }), false);
  assert.equal(blobYaIdentico(o, null), false);
});

test('enParalelo respeta el límite y el orden', async () => {
  let activos = 0;
  let maximo = 0;
  const res = await enParalelo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, async (n) => {
    activos += 1;
    maximo = Math.max(maximo, activos);
    await new Promise((r) => setTimeout(r, 5 * (11 - n)));
    activos -= 1;
    return n * 2;
  });
  assert.ok(maximo <= 4);
  assert.deepEqual(res, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
});

// ---------------------------------------------------------------- T4: orquestador con dobles

const FIXTURES = { Tienda: [{ id: 1, codigo: 'T004' }], Accesorio: [{ id: 1, codigo: 'G-12-FIXTURE' }] };

/** Arma un mundo falso: bd/blobs/conexiones en memoria que registran cada llamada en `llamadas`. */
function mundo({ origen = OTB, destino = PROD, contenidoProd = { Tienda: 1, Accesorio: 1 }, alInsertar, hashMalo, fallaCopia, adjuntoDev, alCopiar } = {}) {
  const llamadas = [];
  const esquema = {};
  const datosDev = {};
  for (const t of ORDEN_TABLAS) {
    const columnas = [{ nombre: 'id', tipo: 'int', longitud: 4, precision: 10, escala: 0, nulable: false, collation: null }];
    if (t === 'Adjunto' || t === 'EvidenciaImplementacion') {
      for (const nombre of ['blob_container', 'blob_path', 'blob_url']) {
        columnas.push({ nombre, tipo: 'nvarchar', longitud: 400, precision: 0, escala: 0, nulable: false, collation: 'x' });
      }
    }
    esquema[t] = { columnas, pk: ['id'], unicos: [], fks: [], identity: t === 'Planograma' };
    datosDev[t] = [{ id: 1 }];
  }
  datosDev.Adjunto = [adjuntoDev ?? filaBlob({ id: 1 })];
  datosDev.EvidenciaImplementacion = [filaBlob({ id: 1, blob_path: 'v1/b.jpg', blob_url: `${BASE_URL_ORIGEN}v1/b.jpg` })];

  const insertadas = {};
  let cargaTerminada = false;
  const estado = { abortado: false, trx: null };

  const trxProd = {
    id: destino,
    commit: async () => { llamadas.push('commit'); },
    rollback: async () => { llamadas.push('rollback'); },
  };
  const trxDev = { esDev: true, id: origen, rollback: async () => { llamadas.push('rollbackDev'); } };
  const knexDev = { id: origen, esDev: true, destroy: async () => { llamadas.push('destroyDev'); } };
  const knexProd = {
    id: destino,
    transaction: async () => { llamadas.push('transaction'); return trxProd; },
    destroy: async () => {},
  };

  const bd = {
    identidad: async (c) => c.id,
    leerEsquema: async () => esquema,
    leerMigraciones: async () => ({ nombres: ['001'], bloqueado: false }),
    abrirLecturaDev: async () => { llamadas.push('abrirLecturaDev'); return trxDev; },
    leerTabla: async (lector, t) => {
      if (lector.esDev) return datosDev[t];
      const filas = insertadas[t] ?? [];
      return hashMalo === t ? filas.map((f) => ({ ...f, id: f.id + 100 })) : filas;
    },
    ultimosIdentity: async () => ({ Planograma: 1 }),
    identCurrent: async () => Object.fromEntries(ORDEN_TABLAS.map((t) => [t, cargaTerminada && t === 'Planograma' ? 1 : 0])),
    contarFilas: async () => (cargaTerminada
      ? Object.fromEntries(ORDEN_TABLAS.map((t) => [t, (insertadas[t] ?? []).length]))
      : contenidoProd),
    filasFixture: async () => FIXTURES,
    fksConfiables: async () => [],
    prepararSesion: async () => { llamadas.push('prepararSesion'); },
    vaciar: async () => { llamadas.push('vaciar'); },
    insertarTabla: async (_trx, { tabla, filas }) => {
      llamadas.push(`insertar:${tabla}`);
      if (alInsertar) await alInsertar(tabla, estado);
      insertadas[tabla] = filas;
    },
    reseed: async () => { llamadas.push('reseed'); cargaTerminada = true; },
  };

  const blobs = {
    propiedades: async () => ({ tamanoBytes: 1, md5: 'a' }),
    copiar: async (ruta) => {
      llamadas.push(`copiar:${ruta}`);
      if (alCopiar) await alCopiar(estado);
      if (fallaCopia) throw new Error('faltante en origen');
      return { estado: 'copiado' };
    },
  };

  const log = Object.assign(() => {}, { tabla: () => {} });
  const correr = (opciones) => migrar({
    opciones: { modo: 'simulacro', confirmar: null, forzarVaciado: false, ...opciones },
    bd, blobs, conexiones: { knexDev, knexProd }, log, estado,
  });
  return { llamadas, correr, estado, trx: trxProd };
}

const sinEscrituras = (llamadas) => {
  assert.ok(!llamadas.includes('abrirLecturaDev'));
  assert.ok(!llamadas.includes('transaction'));
  assert.ok(!llamadas.includes('commit'));
  assert.ok(!llamadas.some((l) => l.startsWith('insertar:') || l.startsWith('copiar:') || l === 'vaciar'));
};

test('orquestador: origen igual al destino aborta sin tocar nada', async () => {
  const m = mundo({ origen: PROD, destino: PROD });
  await assert.rejects(m.correr({}), /misma base/);
  sinEscrituras(m.llamadas);
});

test('orquestador: destino OTB aborta sin escrituras', async () => {
  const m = mundo({ destino: OTB });
  await assert.rejects(m.correr({}));
  sinEscrituras(m.llamadas);
});

test('orquestador: ejecutar con --confirmar distinto en mayúsculas aborta', async () => {
  const m = mundo();
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'DB-Planogramas' }), /confirmar/);
  sinEscrituras(m.llamadas);
});

test('orquestador: contenido inesperado en PROD → rollback sin vaciar; con forzarVaciado continúa', async () => {
  const contenidoProd = { Tienda: 1, Accesorio: 1, Planograma: 1 };
  const a = mundo({ contenidoProd });
  const resA = await a.correr({});
  assert.equal(resA.ok, false);
  assert.ok(a.llamadas.includes('rollback'));
  assert.ok(!a.llamadas.includes('vaciar'));

  const b = mundo({ contenidoProd });
  const resB = await b.correr({ modo: 'simulacro', forzarVaciado: true });
  assert.ok(b.llamadas.includes('vaciar'));
  assert.equal(resB.ok, true);
});

test('orquestador: falla en Posicion → rollback, nunca commit y rechaza', async () => {
  const m = mundo({ alInsertar: async (t) => { if (t === 'Posicion') throw new Error('boom'); } });
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' }), /boom/);
  assert.ok(m.llamadas.includes('rollback'));
  assert.ok(!m.llamadas.includes('commit'));
  assert.equal(m.estado.trx, null);
});

test('orquestador: interrupción durante la carga → rollback sin commit', async () => {
  const m = mundo({ alInsertar: async (t, estado) => { if (t === 'Producto') estado.abortado = true; } });
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' }), /Interrumpido/);
  assert.ok(m.llamadas.includes('rollback'));
  assert.ok(!m.llamadas.includes('commit'));
});

test('orquestador: simulacro correcto termina en rollback, sin commit', async () => {
  const m = mundo();
  const res = await m.correr({});
  assert.deepEqual(res, { ok: true });
  assert.ok(m.llamadas.includes('rollback'));
  assert.ok(!m.llamadas.includes('commit'));
  assert.ok(!m.llamadas.some((l) => l.startsWith('copiar:')));
});

test('orquestador: ejecutar correcto hace commit una vez; con hash distinto hace rollback', async () => {
  const bien = mundo();
  const res = await bien.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' });
  assert.deepEqual(res, { ok: true });
  assert.equal(bien.llamadas.filter((l) => l === 'commit').length, 1);
  assert.equal(bien.llamadas.filter((l) => l.startsWith('copiar:')).length, 2);

  const mal = mundo({ hashMalo: 'Nivel' });
  const resMal = await mal.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' });
  assert.equal(resMal.ok, false);
  assert.ok(!mal.llamadas.includes('commit'));
  assert.ok(mal.llamadas.includes('rollback'));
});

test('orquestador: la conexión DEV se destruye antes de abrir la transacción de PROD', async () => {
  const m = mundo();
  await m.correr({});
  assert.ok(m.llamadas.indexOf('destroyDev') !== -1);
  assert.ok(m.llamadas.indexOf('destroyDev') < m.llamadas.indexOf('transaction'));
  assert.ok(m.llamadas.indexOf('rollbackDev') < m.llamadas.indexOf('destroyDev'));
});

test('orquestador: blob_url de Adjunto fuera de adjuntos-dev aborta antes de copiar y de la transacción', async () => {
  const m = mundo({ adjuntoDev: filaBlob({ blob_url: 'https://planogramasstorage.blob.core.windows.net/otro/v1/a.pdf' }) });
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' }), /blob_url/);
  assert.ok(!m.llamadas.includes('transaction'));
  assert.ok(!m.llamadas.some((l) => l.startsWith('copiar:')));
});

test('orquestador: blob faltante en origen aborta sin abrir transacción', async () => {
  const m = mundo({ fallaCopia: true });
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' }), /faltante/);
  assert.ok(!m.llamadas.includes('transaction'));
  assert.ok(!m.llamadas.includes('commit'));
});

test('orquestador: solo-blobs copia sin abrir transacción; verificar no escribe', async () => {
  const s = mundo();
  const res = await s.correr({ modo: 'solo-blobs', confirmar: 'db-planogramas' });
  assert.deepEqual(res, { ok: true });
  assert.ok(s.llamadas.some((l) => l.startsWith('copiar:')));
  assert.ok(!s.llamadas.includes('transaction'));

  const v = mundo();
  await v.correr({ modo: 'verificar' });
  assert.ok(!v.llamadas.includes('transaction'));
  assert.ok(!v.llamadas.includes('commit'));
  assert.ok(!v.llamadas.some((l) => l.startsWith('insertar:') || l.startsWith('copiar:') || l === 'vaciar' || l === 'reseed'));
});

test('orquestador: interrupción durante la copia de blobs → no abre la transacción de PROD', async () => {
  const m = mundo({ alCopiar: async (estado) => { estado.abortado = true; } });
  await assert.rejects(m.correr({ modo: 'ejecutar', confirmar: 'db-planogramas' }), /Interrumpido/);
  assert.ok(!m.llamadas.includes('transaction'));
  assert.ok(!m.llamadas.includes('vaciar'));
  assert.ok(!m.llamadas.includes('commit'));
});

test('orquestador: interrupción previa a la lectura → no transacción, no vaciar', async () => {
  const m = mundo();
  m.estado.abortado = true;
  await assert.rejects(m.correr({}), /Interrumpido/);
  assert.ok(!m.llamadas.includes('transaction'));
  assert.ok(!m.llamadas.includes('vaciar'));
});
