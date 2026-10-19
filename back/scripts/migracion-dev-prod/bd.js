/**
 * bd.js — acceso a BD de la migración DEV → PROD.
 * Lectura: acepta cualquier conexión (knex o trx). Escritura: solo `trxProd`, y cada función
 * verifica antes que el trx esté realmente sobre la base destino. No imprime nada.
 * Los nombres de tabla/columna salen de ORDEN_TABLAS o de sys.columns, nunca de la CLI.
 */

const knex = require('knex');
const { BD_DESTINO, ORDEN_TABLAS, expresionSelect, tamanoLote } = require('./plan');

function crearConexiones() {
  const dev = require('../../knexfile');
  const prod = require('../../knexfile.prod');
  const conTimeout = (base, extra = {}) => knex({
    ...base,
    ...extra,
    connection: {
      ...base.connection,
      options: { ...base.connection.options, requestTimeout: 120000 },
    },
  });
  return {
    knexDev: conTimeout(dev),
    knexProd: conTimeout(prod, { pool: { min: 0, max: 1 } }),
  };
}

const q = (nombre) => `[${nombre}]`;

function validarTabla(tabla) {
  if (!ORDEN_TABLAS.includes(tabla)) throw new Error(`Tabla fuera de la lista de la migración: ${tabla}`);
}

// ---------------------------------------------------------------- lectura

async function identidad(conexion) {
  const filas = await conexion.raw('SELECT DB_NAME() AS bd, @@SERVERNAME AS servidor');
  return { bd: filas[0].bd, servidor: filas[0].servidor };
}

async function leerEsquema(conexion) {
  const columnas = await conexion.raw(`
    SELECT t.name AS tabla, c.name AS nombre, ty.name AS tipo, c.max_length AS longitud,
           c.precision AS precision, c.scale AS escala, c.is_nullable AS nulable,
           c.collation_name AS collation, c.is_identity AS es_identity
    FROM sys.tables t
    JOIN sys.columns c ON c.object_id = t.object_id
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    ORDER BY t.name, c.column_id`);
  const indices = await conexion.raw(`
    SELECT t.name AS tabla, i.name AS nombre, i.is_primary_key AS es_pk,
           i.filter_definition AS filtro, c.name AS columna
    FROM sys.indexes i
    JOIN sys.tables t ON t.object_id = i.object_id
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.is_unique = 1
    ORDER BY t.name, i.name, ic.key_ordinal`);
  const fks = await conexion.raw(`
    SELECT t.name AS tabla, fk.name AS nombre
    FROM sys.foreign_keys fk
    JOIN sys.tables t ON t.object_id = fk.parent_object_id`);

  const esquema = {};
  for (const c of columnas) {
    esquema[c.tabla] ??= { columnas: [], pk: [], unicos: [], fks: [], identity: false };
    esquema[c.tabla].columnas.push({
      nombre: c.nombre,
      tipo: c.tipo,
      longitud: c.longitud,
      precision: c.precision,
      escala: c.escala,
      nulable: Boolean(c.nulable),
      collation: c.collation,
    });
    if (c.es_identity) esquema[c.tabla].identity = true;
  }
  for (const i of indices) {
    const t = esquema[i.tabla];
    if (!t) continue;
    if (i.es_pk) {
      t.pk.push(i.columna);
    } else {
      let u = t.unicos.find((x) => x.nombre === i.nombre);
      if (!u) { u = { nombre: i.nombre, columnas: [], filtro: i.filtro ?? null }; t.unicos.push(u); }
      u.columnas.push(i.columna);
    }
  }
  for (const f of fks) esquema[f.tabla]?.fks.push(f.nombre);
  return esquema;
}

async function leerMigraciones(conexion) {
  const filas = await conexion.raw('SELECT name FROM knex_migrations ORDER BY name');
  const lock = await conexion.raw('SELECT is_locked FROM knex_migrations_lock');
  return {
    nombres: filas.map((f) => f.name),
    bloqueado: lock.some((f) => Number(f.is_locked) !== 0),
  };
}

function abrirLecturaDev(knexDev) {
  return knexDev.transaction(undefined, { isolationLevel: 'snapshot' });
}

async function leerTabla(conexion, tabla, columnas) {
  validarTabla(tabla);
  return conexion.raw(`SELECT ${columnas.map(expresionSelect).join(', ')} FROM ${q(tabla)}`);
}

async function ultimosIdentity(conexion) {
  const filas = await conexion.raw(`
    SELECT t.name AS tabla, CAST(ic.last_value AS bigint) AS ultimo
    FROM sys.identity_columns ic
    JOIN sys.tables t ON t.object_id = ic.object_id
    WHERE SCHEMA_NAME(t.schema_id) = 'dbo'`);
  // OTB tiene tablas ajenas a la app (msg, Ventas…): solo cuentan las de la migración.
  const res = {};
  for (const f of filas.filter((x) => ORDEN_TABLAS.includes(x.tabla))) {
    res[f.tabla] = f.ultimo === null ? null : Number(f.ultimo);
  }
  return res;
}

async function identCurrent(conexion, tablas) {
  const res = {};
  for (const tabla of tablas) {
    validarTabla(tabla);
    const filas = await conexion.raw(`SELECT CAST(IDENT_CURRENT('${q(tabla)}') AS bigint) AS valor`);
    res[tabla] = filas[0].valor === null ? null : Number(filas[0].valor);
  }
  return res;
}

async function contarFilas(conexion, tablas) {
  const res = {};
  for (const tabla of tablas) {
    validarTabla(tabla);
    const filas = await conexion.raw(`SELECT COUNT(*) AS n FROM ${q(tabla)}`);
    res[tabla] = Number(filas[0].n);
  }
  return res;
}

async function filasFixture(conexion) {
  const tienda = await conexion.raw('SELECT TOP 5 id, codigo FROM [Tienda] ORDER BY id');
  const accesorio = await conexion.raw('SELECT TOP 5 id, codigo FROM [Accesorio] ORDER BY id');
  return {
    Tienda: tienda.map((f) => ({ id: f.id, codigo: f.codigo })),
    Accesorio: accesorio.map((f) => ({ id: f.id, codigo: f.codigo })),
  };
}

async function fksConfiables(conexion) {
  const filas = await conexion.raw('SELECT name FROM sys.foreign_keys WHERE is_not_trusted = 1 OR is_disabled = 1');
  return filas.map((f) => f.name);
}

// -------------------------------------------------------------- escritura

async function asegurarDestino(trxProd) {
  const { bd } = await identidad(trxProd);
  if (bd !== BD_DESTINO) throw new Error(`Escritura rechazada: la transacción apunta a ${bd}, no a ${BD_DESTINO}.`);
}

async function prepararSesion(trxProd) {
  await trxProd.raw('SET XACT_ABORT ON');
  await trxProd.raw('SET LOCK_TIMEOUT 30000');
  await asegurarDestino(trxProd);
}

async function vaciar(trxProd, tablas) {
  await asegurarDestino(trxProd);
  const inverso = ORDEN_TABLAS.filter((t) => tablas.includes(t)).reverse();
  for (const tabla of inverso) await trxProd.raw(`DELETE FROM ${q(tabla)}`);
}

async function insertarTabla(trxProd, { tabla, columnas, filas, identity, autorreferencia, pk }) {
  await asegurarDestino(trxProd);
  validarTabla(tabla);
  const sinReferencia = autorreferencia
    ? filas.map((f) => ({ ...f, [autorreferencia]: null }))
    : filas;
  const lote = tamanoLote(columnas.length);
  for (let i = 0; i < sinReferencia.length; i += lote) {
    const insert = trxProd(tabla).insert(sinReferencia.slice(i, i + lote));
    if (!identity) { await insert; continue; }
    // knex manda cada consulta por sp_executesql y un SET hecho ahí se revierte al terminar esa llamada:
    // el ON, el INSERT y el OFF tienen que ir en el mismo lote.
    const { sql, bindings } = insert.toSQL();
    await trxProd.raw(`SET IDENTITY_INSERT ${q(tabla)} ON; ${sql}; SET IDENTITY_INSERT ${q(tabla)} OFF;`, bindings);
  }
  if (autorreferencia) {
    for (const fila of filas.filter((f) => f[autorreferencia] !== null && f[autorreferencia] !== undefined)) {
      const where = pk.map((c) => `${q(c)} = ?`).join(' AND ');
      await trxProd.raw(
        `UPDATE ${q(tabla)} SET ${q(autorreferencia)} = ? WHERE ${where}`,
        [fila[autorreferencia], ...pk.map((c) => fila[c])],
      );
    }
  }
}

async function reseed(trxProd, valores) {
  await asegurarDestino(trxProd);
  for (const [tabla, valor] of Object.entries(valores)) {
    if (valor === null || valor === undefined) continue;
    validarTabla(tabla);
    if (!Number.isInteger(valor)) throw new Error(`Valor de RESEED inválido para ${tabla}.`);
    await trxProd.raw(`DBCC CHECKIDENT ('${q(tabla)}', RESEED, ${valor})`);
  }
}

module.exports = {
  crearConexiones, identidad, leerEsquema, leerMigraciones, abrirLecturaDev, leerTabla,
  ultimosIdentity, identCurrent, contarFilas, filasFixture, fksConfiables,
  asegurarDestino, prepararSesion, vaciar, insertarTabla, reseed,
};
