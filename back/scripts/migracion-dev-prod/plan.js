/**
 * plan.js — lógica pura de la migración de datos DEV (OTB) → PROD (db-planogramas).
 * Sin knex, sin env y sin Azure: todo lo que se puede probar sin conexión vive aquí.
 * Script de un solo uso (DT-69: retirarlo cuando PROD esté estable).
 */

const crypto = require('node:crypto');

const BD_ORIGEN = 'OTB';
const BD_DESTINO = 'db-planogramas';
const SERVIDOR = 'comerciales';
const CUENTA_BLOB = 'planogramasstorage';
const CONTENEDOR_ORIGEN = 'adjuntos-dev';
const CONTENEDOR_DESTINO = 'adjuntos';
const BASE_URL_ORIGEN = `https://${CUENTA_BLOB}.blob.core.windows.net/${CONTENEDOR_ORIGEN}/`;
const BASE_URL_DESTINO = `https://${CUENTA_BLOB}.blob.core.windows.net/${CONTENEDOR_DESTINO}/`;

// Orden topológico de carga; el vaciado usa el inverso.
const ORDEN_TABLAS = [
  'Tienda', 'Accesorio', 'Producto', 'Planograma', 'EdicionAsignacion', 'PlanogramaSubcategoria',
  'PlanogramaVersion', 'VersionTienda', 'Adjunto', 'HistorialSustitucion', 'Gondola', 'Seccion',
  'Nivel', 'Posicion', 'PosicionAccesorio', 'EvidenciaImplementacion', 'AsignacionAuditoria',
];

const AUTORREFERENCIAS = { Producto: 'sku_sustituto', PlanogramaVersion: 'version_base_id', Seccion: 'padre_id' };
const TABLAS_CON_BLOB = ['Adjunto', 'EvidenciaImplementacion'];
const FIXTURES_DESTINO = {
  Tienda: [{ id: 1, codigo: 'T004' }],
  Accesorio: [{ id: 1, codigo: 'G-12-FIXTURE' }],
};

const TIPOS_TEXTO_FECHA = ['datetime2', 'datetime', 'date'];
const TIPOS_TEXTO_DECIMAL = ['decimal', 'numeric'];
const TIPOS_DIRECTOS = ['int', 'bigint', 'smallint', 'tinyint', 'bit', 'nvarchar', 'varchar', 'nchar', 'char'];

function parsearArgs(argv) {
  let confirmar = null;
  let forzarVaciado = false;
  let ejecutar = false;
  let soloBlobs = false;
  let verificar = false;
  for (const arg of argv) {
    if (arg === '--ejecutar') ejecutar = true;
    else if (arg === '--solo-blobs') soloBlobs = true;
    else if (arg === '--verificar') verificar = true;
    else if (arg === '--forzar-vaciado') forzarVaciado = true;
    else if (arg.startsWith('--confirmar=')) confirmar = arg.slice('--confirmar='.length);
    else throw new Error(`Argumento desconocido: ${String(arg).slice(0, 40)}`);
  }
  if (verificar && (ejecutar || soloBlobs || forzarVaciado || confirmar !== null)) {
    throw new Error('--verificar no admite otros argumentos.');
  }
  if ((soloBlobs || forzarVaciado) && !ejecutar) {
    throw new Error('--solo-blobs y --forzar-vaciado solo valen junto con --ejecutar.');
  }
  if (ejecutar && confirmar === null) throw new Error('--ejecutar exige --confirmar=<base de datos destino>.');
  if (!ejecutar && confirmar !== null) throw new Error('--confirmar solo vale junto con --ejecutar.');
  let modo = 'simulacro';
  if (verificar) modo = 'verificar';
  else if (soloBlobs) modo = 'solo-blobs';
  else if (ejecutar) modo = 'ejecutar';
  return { modo, confirmar, forzarVaciado };
}

function validarIdentidad({ origen, destino, confirmar, modo }) {
  if (origen.bd === destino.bd) throw new Error('Origen y destino son la misma base de datos.');
  if (origen.bd !== BD_ORIGEN) throw new Error(`El origen debe ser ${BD_ORIGEN}, no ${origen.bd}.`);
  if (destino.bd !== BD_DESTINO) throw new Error(`El destino debe ser ${BD_DESTINO}, no ${destino.bd}.`);
  if (origen.servidor !== SERVIDOR || destino.servidor !== SERVIDOR) {
    throw new Error(`Ambas bases deben estar en el servidor ${SERVIDOR}.`);
  }
  if ((modo === 'ejecutar' || modo === 'solo-blobs') && confirmar !== destino.bd) {
    throw new Error('--confirmar no coincide con la base de datos destino real.');
  }
}

function expresionSelect({ nombre, tipo }) {
  if (TIPOS_TEXTO_FECHA.includes(tipo)) return `CONVERT(varchar(27), [${nombre}], 121) AS [${nombre}]`;
  if (TIPOS_TEXTO_DECIMAL.includes(tipo)) return `CAST([${nombre}] AS varchar(40)) AS [${nombre}]`;
  if (TIPOS_DIRECTOS.includes(tipo)) return `[${nombre}]`;
  throw new Error(`Tipo no soportado en la migración: ${tipo} (columna ${nombre}).`);
}

function descColumna(c) {
  return `${c.tipo}(${c.longitud},${c.precision},${c.escala}) ${c.nulable ? 'NULL' : 'NOT NULL'} collation=${c.collation ?? '-'}`;
}

function compararEsquema(dev, prod) {
  const dif = [];
  for (const tabla of ORDEN_TABLAS) {
    const d = dev[tabla];
    const p = prod[tabla];
    if (!d) { dif.push(`${tabla}: no existe en DEV`); continue; }
    if (!p) { dif.push(`${tabla}: no existe en PROD`); continue; }
    const colsD = d.columnas.map((c) => c.nombre).join(',');
    const colsP = p.columnas.map((c) => c.nombre).join(',');
    if (colsD !== colsP) {
      dif.push(`${tabla}: columnas distintas (DEV: ${colsD} · PROD: ${colsP})`);
    } else {
      d.columnas.forEach((c, i) => {
        if (descColumna(c) !== descColumna(p.columnas[i])) {
          dif.push(`${tabla}.${c.nombre}: DEV ${descColumna(c)} · PROD ${descColumna(p.columnas[i])}`);
        }
      });
    }
    if (d.pk.join(',') !== p.pk.join(',')) dif.push(`${tabla}: PK distinta (DEV: ${d.pk} · PROD: ${p.pk})`);
    if (d.identity !== p.identity) dif.push(`${tabla}: identity distinto`);
    const unicos = (e) => e.unicos.map((u) => `${u.nombre}(${u.columnas.join(',')})[${u.filtro ?? ''}]`).sort().join(' | ');
    if (unicos(d) !== unicos(p)) dif.push(`${tabla}: índices únicos distintos (DEV: ${unicos(d)} · PROD: ${unicos(p)})`);
    const fks = (e) => [...e.fks].sort().join(',');
    if (fks(d) !== fks(p)) dif.push(`${tabla}: FKs distintas (DEV: ${fks(d)} · PROD: ${fks(p)})`);
  }
  for (const tabla of Object.keys(prod)) {
    if (!ORDEN_TABLAS.includes(tabla) && !tabla.startsWith('knex_migrations')) {
      dif.push(`${tabla}: tabla extra en PROD`);
    }
  }
  return dif;
}

function tamanoLote(numColumnas) {
  return Math.floor(2000 / numColumnas);
}

function comparar(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const x = String(a);
  const y = String(b);
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}

function ordenarPorPk(filas, pk) {
  return [...filas].sort((f, g) => {
    for (const c of pk) {
      const r = comparar(f[c], g[c]);
      if (r !== 0) return r;
    }
    return 0;
  });
}

function hashFilas(filas, columnas, pk) {
  const texto = ordenarPorPk(filas, pk)
    .map((f) => JSON.stringify(columnas.map((c) => f[c] ?? null)))
    .join('\n');
  return crypto.createHash('sha256').update(texto).digest('hex');
}

function reescribirBlob(fila) {
  if (fila.blob_container !== CONTENEDOR_ORIGEN) {
    throw new Error(`blob_container inesperado en DEV: ${String(fila.blob_container).slice(0, 40)}`);
  }
  if (!fila.blob_path) throw new Error('blob_path vacío.');
  if (fila.blob_url !== BASE_URL_ORIGEN + fila.blob_path) {
    throw new Error(`blob_url de DEV no corresponde a ${CONTENEDOR_ORIGEN} (${fila.blob_path}).`);
  }
  const url = BASE_URL_DESTINO + fila.blob_path;
  if (url.includes('?') || url.includes('sig=')) throw new Error(`URL destino con query string (${fila.blob_path}).`);
  return { ...fila, blob_container: CONTENEDOR_DESTINO, blob_url: url };
}

// Implementación propia, independiente de reescribirBlob.
function verificarBlobsFilas(filasProd) {
  const errores = [];
  filasProd.forEach((f, i) => {
    if (f.blob_container !== 'adjuntos') errores.push(`fila ${i}: blob_container ${f.blob_container}`);
    if (f.blob_url !== BASE_URL_DESTINO + f.blob_path) errores.push(`fila ${i}: blob_url no corresponde a ${f.blob_path}`);
  });
  return errores;
}

function evaluarContenidoDestino(conteos, filasFixture, forzarVaciado) {
  const aBorrar = [];
  let esperado = true;
  for (const tabla of ORDEN_TABLAS) {
    const n = conteos[tabla] ?? 0;
    const fixture = FIXTURES_DESTINO[tabla];
    if (n > 0) aBorrar.push(`${tabla}: ${n}`);
    if (fixture) {
      const reales = filasFixture[tabla] ?? [];
      const coincide = n === fixture.length
        && fixture.every((e, i) => reales[i] && reales[i].id === e.id && reales[i].codigo === e.codigo);
      if (!coincide) esperado = false;
    } else if (n > 0) {
      esperado = false;
    }
  }
  if (esperado) return { ok: true, aBorrar, advertencia: null };
  if (forzarVaciado) {
    return { ok: true, aBorrar, advertencia: 'PROD tiene contenido distinto de los fixtures; se borra por --forzar-vaciado.' };
  }
  return { ok: false, aBorrar, advertencia: null };
}

function blobYaIdentico(origen, destino) {
  if (!destino || !origen.md5 || !destino.md5) return false;
  return origen.tamanoBytes === destino.tamanoBytes && origen.md5 === destino.md5;
}

function formatearError(err) {
  const codigo = err?.number ?? err?.code ?? err?.statusCode ?? 'ERROR';
  let texto = String(err?.message ?? err);
  // Solo los errores de knex/driver traen "<sql> - <causa>": se conserva la causa. Los propios van íntegros.
  const delDriver = err?.number !== undefined || err?.code === 'EREQUEST';
  if (delDriver) {
    const i = texto.lastIndexOf(' - ');
    if (i !== -1) texto = texto.slice(i + 3);
  }
  const oculto = texto.replace(/\?[^\s'"]*/g, '?<oculto>');
  return `[${codigo}] ${delDriver ? oculto.slice(-300) : oculto.slice(0, 300)}`;
}

/** `detener` (opcional) se consulta antes de tomar cada trabajo: si devuelve true, no se toman más. */
async function enParalelo(items, limite, fn, detener = () => false) {
  const resultados = new Array(items.length);
  let siguiente = 0;
  let fallo = false;
  async function trabajador() {
    while (siguiente < items.length && !fallo && !detener()) {
      const i = siguiente++;
      try {
        resultados[i] = await fn(items[i], i);
      } catch (err) {
        fallo = true;
        throw err;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return resultados;
}

module.exports = {
  BD_ORIGEN, BD_DESTINO, SERVIDOR, CUENTA_BLOB, CONTENEDOR_ORIGEN, CONTENEDOR_DESTINO,
  BASE_URL_ORIGEN, BASE_URL_DESTINO, ORDEN_TABLAS, AUTORREFERENCIAS, TABLAS_CON_BLOB,
  FIXTURES_DESTINO, TIPOS_TEXTO_FECHA, TIPOS_TEXTO_DECIMAL, TIPOS_DIRECTOS,
  parsearArgs, validarIdentidad, expresionSelect, compararEsquema, tamanoLote, ordenarPorPk,
  hashFilas, reescribirBlob, verificarBlobsFilas, evaluarContenidoDestino, blobYaIdentico,
  formatearError, enParalelo,
};
