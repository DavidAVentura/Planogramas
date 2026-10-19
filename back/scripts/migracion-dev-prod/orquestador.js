/**
 * orquestador.js — flujo de la migración DEV → PROD. Todo lo externo (bd, blobs, conexiones, log)
 * llega inyectado, así se prueba con dobles en memoria. No hace `require` de bd, blobs, knex ni env.
 *
 * Garantías: DEV solo se lee y su conexión se destruye antes de abrir la transacción de PROD;
 * una sola transacción PROD; `commit` solo en modo `ejecutar`, con la verificación completa
 * cuadrada y sin interrupción; cualquier excepción deshace la transacción.
 */

const {
  BD_DESTINO, CONTENEDOR_ORIGEN, CONTENEDOR_DESTINO, ORDEN_TABLAS, AUTORREFERENCIAS, TABLAS_CON_BLOB,
  validarIdentidad, compararEsquema, hashFilas, reescribirBlob, verificarBlobsFilas,
  evaluarContenidoDestino, enParalelo, blobYaIdentico, formatearError,
} = require('./plan');

const CONCURRENCIA_BLOBS = 4;

async function revertir(trx) {
  try { await trx.rollback(); } catch { /* ya cerrada o conexión caída */ }
}

function verificarInterrupcion(estado) {
  if (estado.abortado) throw new Error('Interrumpido: no se tocó PROD. Si ocurrió durante el COMMIT, ejecutar --verificar.');
}

async function migrar({ opciones, bd, blobs, conexiones, log, estado }) {
  const { modo, confirmar, forzarVaciado } = opciones;
  const { knexDev, knexProd } = conexiones;
  const tabla = log.tabla ?? ((filas) => log(JSON.stringify(filas)));

  // 1. Identidad (C-01): antes de leer o escribir cualquier cosa.
  const origen = await bd.identidad(knexDev);
  const destino = await bd.identidad(knexProd);
  log(`Origen: ${origen.servidor} / ${origen.bd} · Destino: ${destino.servidor} / ${destino.bd} · modo: ${modo}`);
  validarIdentidad({ origen, destino, confirmar, modo });

  // 2. Esquema y migraciones (C-12).
  const esquemaDev = await bd.leerEsquema(knexDev);
  const esquemaProd = await bd.leerEsquema(knexProd);
  const difs = compararEsquema(esquemaDev, esquemaProd);
  if (difs.length) throw new Error(`El esquema de DEV y PROD no es idéntico:\n - ${difs.join('\n - ')}`);
  const migDev = await bd.leerMigraciones(knexDev);
  const migProd = await bd.leerMigraciones(knexProd);
  if (migDev.nombres.join('|') !== migProd.nombres.join('|')) {
    throw new Error('Las migraciones aplicadas en DEV y PROD no son las mismas.');
  }
  if (migDev.bloqueado || migProd.bloqueado) throw new Error('knex_migrations_lock está bloqueado.');
  log('Esquema idéntico: sí · migraciones iguales: sí');

  // 3. Lectura completa de DEV (C-02) y reescritura de blobs.
  const datosDev = {};
  let ultimosDev;
  const trxDev = await bd.abrirLecturaDev(knexDev);
  try {
    for (const t of ORDEN_TABLAS) {
      verificarInterrupcion(estado);
      datosDev[t] = await bd.leerTabla(trxDev, t, esquemaDev[t].columnas);
    }
    ultimosDev = await bd.ultimosIdentity(trxDev);
  } finally {
    await revertir(trxDev);
  }
  await knexDev.destroy();

  const datos = { ...datosDev };
  for (const t of TABLAS_CON_BLOB) datos[t] = datosDev[t].map(reescribirBlob);
  const nombresColumnas = {};
  const hashDev = {};
  for (const t of ORDEN_TABLAS) {
    nombresColumnas[t] = esquemaDev[t].columnas.map((c) => c.nombre);
    hashDev[t] = hashFilas(datos[t], nombresColumnas[t], esquemaDev[t].pk);
  }
  const rutasBlobs = [...new Set(TABLAS_CON_BLOB.flatMap((t) => datosDev[t].map((f) => f.blob_path)))];
  log(`DEV leído: ${ORDEN_TABLAS.reduce((n, t) => n + datos[t].length, 0)} filas · ${rutasBlobs.length} blobs referenciados`);

  // 4. Blobs.
  verificarInterrupcion(estado);
  const detener = () => estado.abortado;
  if (modo === 'simulacro') {
    const estados = await enParalelo(rutasBlobs, CONCURRENCIA_BLOBS, async (ruta) => {
      const o = await blobs.propiedades(CONTENEDOR_ORIGEN, ruta);
      if (!o) return 'falta';
      const d = await blobs.propiedades(CONTENEDOR_DESTINO, ruta);
      return blobYaIdentico(o, d) ? 'identico' : 'por-copiar';
    }, detener);
    verificarInterrupcion(estado);
    const cuenta = (e) => estados.filter((x) => x === e).length;
    log(`Blobs (simulacro): ya idénticos ${cuenta('identico')} · por copiar ${cuenta('por-copiar')} · faltan en origen ${cuenta('falta')}`);
    if (cuenta('falta') > 0) throw new Error('Faltan blobs en el origen; no se continúa.');
  } else if (modo === 'ejecutar' || modo === 'solo-blobs') {
    const res = await enParalelo(rutasBlobs, CONCURRENCIA_BLOBS, (ruta) => blobs.copiar(ruta), detener);
    verificarInterrupcion(estado);
    const n = (e) => res.filter((r) => r.estado === e).length;
    log(`Blobs: copiados ${n('copiado')} · ya idénticos ${n('ya-identico')} · faltan en origen 0`);
    if (modo === 'solo-blobs') return { ok: true };
  }

  // Verificación comparada contra DEV (C-11, C-13); `lector` es knexProd o el trx de PROD.
  async function verificar(lector, identAntes) {
    const problemas = [];
    const conteos = await bd.contarFilas(lector, ORDEN_TABLAS);
    const identDespuesTrx = await bd.identCurrent(lector, ORDEN_TABLAS);
    const informe = [];
    for (const t of ORDEN_TABLAS) {
      const filasProd = await bd.leerTabla(lector, t, esquemaDev[t].columnas);
      const hashProd = hashFilas(filasProd, nombresColumnas[t], esquemaDev[t].pk);
      const hashIgual = hashProd === hashDev[t];
      if (conteos[t] !== datos[t].length) problemas.push(`${t}: filas DEV ${datos[t].length} · PROD ${conteos[t]}`);
      if (!hashIgual) problemas.push(`${t}: hash distinto`);
      if (datos[t].length > 0 && ultimosDev[t] !== null && ultimosDev[t] !== undefined
        && identDespuesTrx[t] !== ultimosDev[t]) {
        problemas.push(`${t}: IDENT_CURRENT PROD ${identDespuesTrx[t]} · DEV ${ultimosDev[t]}`);
      }
      if (TABLAS_CON_BLOB.includes(t)) {
        verificarBlobsFilas(filasProd).forEach((e) => problemas.push(`${t}: ${e}`));
      }
      informe.push({
        tabla: t,
        'filas DEV': datos[t].length,
        'filas PROD': conteos[t],
        'hash igual': hashIgual ? 'sí' : 'NO',
        'IDENT DEV': ultimosDev[t] ?? null,
        'IDENT PROD antes': identAntes ? identAntes[t] : null,
        'IDENT PROD después': identDespuesTrx[t],
      });
    }
    const fks = await bd.fksConfiables(lector);
    if (fks.length) problemas.push(`FKs no confiables o deshabilitadas: ${fks.join(', ')}`);
    log(`FKs confiables: ${fks.length ? 'NO' : 'sí'}`);
    return { problemas, informe };
  }

  // 5. Modo verificar: solo lectura.
  if (modo === 'verificar') {
    const { problemas, informe } = await verificar(knexProd, null);
    await enParalelo(rutasBlobs, CONCURRENCIA_BLOBS, async (ruta) => {
      const o = await blobs.propiedades(CONTENEDOR_ORIGEN, ruta);
      const d = await blobs.propiedades(CONTENEDOR_DESTINO, ruta);
      if (!o || !d || o.tamanoBytes !== d.tamanoBytes) problemas.push(`blob ${ruta}: falta o tamaño distinto en destino`);
    });
    tabla(informe);
    problemas.forEach((p) => log(`Problema: ${p}`));
    log(problemas.length ? 'Hay diferencias entre DEV y PROD.' : 'Todas las tablas cuadran.');
    return { ok: problemas.length === 0 };
  }

  // 6. Transacción PROD (simulacro y ejecutar).
  verificarInterrupcion(estado);
  const identAntes = await bd.identCurrent(knexProd, ORDEN_TABLAS);
  const trxProd = await knexProd.transaction();
  estado.trx = trxProd;
  let ok = false;
  let informe = [];
  try {
    await bd.prepararSesion(trxProd);
    const idTrx = await bd.identidad(trxProd);
    if (idTrx.bd !== BD_DESTINO) throw new Error(`La transacción apunta a ${idTrx.bd}, no a ${BD_DESTINO}.`);

    const conteos = await bd.contarFilas(trxProd, ORDEN_TABLAS);
    const fixtures = await bd.filasFixture(trxProd);
    const contenido = evaluarContenidoDestino(conteos, fixtures, forzarVaciado);
    log(`Se borrará de PROD: ${contenido.aBorrar.length ? contenido.aBorrar.join(' · ') : 'nada'}`);
    if (contenido.advertencia) log(`ADVERTENCIA: ${contenido.advertencia}`);
    if (!contenido.ok) {
      log('PROD tiene contenido inesperado: se aborta (usar --forzar-vaciado solo si es intencional). ROLLBACK');
      await revertir(trxProd);
      estado.trx = null;
      return { ok: false };
    }

    verificarInterrupcion(estado);
    await bd.vaciar(trxProd, ORDEN_TABLAS);
    for (const t of ORDEN_TABLAS) {
      await bd.insertarTabla(trxProd, {
        tabla: t,
        columnas: nombresColumnas[t],
        filas: datos[t],
        identity: esquemaDev[t].identity,
        autorreferencia: AUTORREFERENCIAS[t] ?? null,
        pk: esquemaDev[t].pk,
      });
      if (estado.abortado) throw new Error('Interrumpido durante la carga.');
    }
    await bd.reseed(trxProd, ultimosDev);

    const res = await verificar(trxProd, identAntes);
    informe = res.informe;
    res.problemas.forEach((p) => log(`Problema: ${p}`));
    ok = res.problemas.length === 0;

    if (modo === 'ejecutar' && ok && !estado.abortado) {
      try {
        await trxProd.commit();
      } catch (err) {
        estado.trx = null;
        throw new Error(`COMMIT dudoso: ejecutar --verificar para saber el estado real. ${formatearError(err)}`);
      }
      log('COMMIT');
    } else {
      await revertir(trxProd);
      log('ROLLBACK');
      ok = ok && modo === 'simulacro' && !estado.abortado;
    }
    estado.trx = null;
  } catch (err) {
    if (estado.trx) await revertir(trxProd);
    estado.trx = null;
    throw err;
  }

  const identDespues = await bd.identCurrent(knexProd, ORDEN_TABLAS);
  tabla(informe.map((f) => ({ ...f, 'IDENT PROD después': identDespues[f.tabla] })));
  return { ok };
}

module.exports = { migrar };
