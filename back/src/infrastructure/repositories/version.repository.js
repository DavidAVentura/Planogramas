/**
 * version.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');
const { ESTADOS } = require('../../domain/version/version.entity');
const { ORIGENES, esMontable, calcularAccion } = require('../../domain/asignacion/asignacion.entity');
const { versionesMontadas, montar, registrarEdicion } = require('./asignacionTx');

const TABLA_VERSION            = 'PlanogramaVersion';
const TABLA_VERSION_TIENDA     = 'VersionTienda';
const TABLA_GONDOLA            = 'Gondola';
const TABLA_NIVEL              = 'Nivel';
const TABLA_SECCION            = 'Seccion';
const TABLA_POSICION           = 'Posicion';
const TABLA_POSICION_ACCESORIO = 'PosicionAccesorio';
const TABLA_ACCESORIO          = 'Accesorio';
const TABLA_TIENDA             = 'Tienda';

// ─── Helpers privados ────────────────────────────────────────────────────────

function mapVersion(row) {
  return {
    id:            row.id,
    planogramaId:  row.planograma_id,
    tipo:          row.tipo,
    codigo:        row.codigo,
    estado:        row.estado,
    notas:         row.notas,
    versionBaseId: row.version_base_id,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

function agruparPor(rows, campoClave) {
  const mapa = {};
  rows.forEach((row) => {
    const clave = row[campoClave];
    if (!mapa[clave]) mapa[clave] = [];
    mapa[clave].push(row);
  });
  return mapa;
}

function mapaConteoPorId(rows, campoId, campoConteo) {
  const mapa = {};
  rows.forEach((row) => { mapa[row[campoId]] = Number(row[campoConteo]); });
  return mapa;
}

// ─── listarPorPlanograma ─────────────────────────────────────────────────────

async function listarPorPlanograma(planogramaId, { incluirArchivadas }) {
  const query = db(TABLA_VERSION).where('planograma_id', planogramaId);
  if (!incluirArchivadas) query.whereNot('estado', ESTADOS.ARCHIVADO);

  const versiones = await query
    .select('id', 'tipo', 'codigo', 'estado', 'notas', 'version_base_id', 'created_at')
    .orderBy('created_at', 'desc');

  const ids = versiones.map((v) => v.id);
  if (ids.length === 0) return [];

  // La góndola "Por ubicar" es temporal: no cuenta como góndola del planograma.
  const gondolaCounts = await db(TABLA_GONDOLA)
    .whereIn('planograma_version_id', ids)
    .where('por_ubicar', false)
    .groupBy('planograma_version_id')
    .select('planograma_version_id')
    .count('id as total');

  const posicionCounts = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, ids)
    .groupBy(`${TABLA_GONDOLA}.planograma_version_id`)
    .select(`${TABLA_GONDOLA}.planograma_version_id as planograma_version_id`)
    .count(`${TABLA_POSICION}.id as total`);

  const tiendasFilas = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .whereIn(`${TABLA_VERSION_TIENDA}.planograma_version_id`, ids)
    .select(
      `${TABLA_VERSION_TIENDA}.planograma_version_id as planograma_version_id`,
      `${TABLA_TIENDA}.id as id`,
      `${TABLA_TIENDA}.codigo as codigo`,
      `${TABLA_TIENDA}.nombre as nombre`,
    );

  const gondolaMap  = mapaConteoPorId(gondolaCounts, 'planograma_version_id', 'total');
  const posicionMap = mapaConteoPorId(posicionCounts, 'planograma_version_id', 'total');
  const tiendasMap  = agruparPor(tiendasFilas, 'planograma_version_id');

  return versiones.map((v) => ({
    id:              v.id,
    tipo:            v.tipo,
    codigo:          v.codigo,
    estado:          v.estado,
    notas:           v.notas,
    versionBaseId:   v.version_base_id,
    totalGondolas:   gondolaMap[v.id] ?? 0,
    totalPosiciones: posicionMap[v.id] ?? 0,
    tiendas:         (tiendasMap[v.id] ?? []).map((t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre })),
    createdAt:       v.created_at,
  }));
}

// ─── crearConGondolas ────────────────────────────────────────────────────────

async function crearConGondolas(version, gondolas) {
  return db.transaction(async (trx) => {
    const [{ id: nuevaVersionId }] = await trx(TABLA_VERSION).insert(version).returning('id');

    if (gondolas.length > 0) {
      await trx(TABLA_GONDOLA).insert(gondolas.map((g) => ({ ...g, planograma_version_id: nuevaVersionId })));
    }

    return nuevaVersionId;
  });
}

// ─── clonarEstructura ────────────────────────────────────────────────────────
// Copia góndolas → niveles → posiciones → accesorios de `versionBaseId` a
// `nuevaVersionId`, dentro de la transacción `trx` del llamador. El id nuevo de
// cada fila padre se usa inmediatamente como FK de sus hijos, sin necesidad de
// mantener un mapa oldId→newId en memoria.

async function clonarEstructura(trx, versionBaseId, nuevaVersionId) {
  const gondolas = await trx(TABLA_GONDOLA)
    .where('planograma_version_id', versionBaseId)
    .orderBy('orden', 'asc');

  for (const gondola of gondolas) {
    const { id: gondolaIdOriginal, planograma_version_id, ...gondolaDatos } = gondola;
    const [{ id: nuevaGondolaId }] = await trx(TABLA_GONDOLA)
      .insert({ ...gondolaDatos, planograma_version_id: nuevaVersionId })
      .returning('id');

    const seccionNueva = await clonarSecciones(trx, gondolaIdOriginal, nuevaGondolaId);

    const niveles = await trx(TABLA_NIVEL)
      .where('gondola_id', gondolaIdOriginal)
      .orderBy('orden', 'asc');

    for (const nivel of niveles) {
      const { id: nivelIdOriginal, gondola_id, seccion_id, ...nivelDatos } = nivel;
      const [{ id: nuevoNivelId }] = await trx(TABLA_NIVEL)
        .insert({ ...nivelDatos, gondola_id: nuevaGondolaId, seccion_id: seccion_id ? (seccionNueva.get(seccion_id) ?? null) : null })
        .returning('id');

      const posiciones = await trx(TABLA_POSICION)
        .where('nivel_id', nivelIdOriginal)
        .orderBy('orden_horizontal', 'asc');

      for (const posicion of posiciones) {
        const { id: posicionIdOriginal, nivel_id, ...posicionDatos } = posicion;
        const [{ id: nuevaPosicionId }] = await trx(TABLA_POSICION)
          .insert({ ...posicionDatos, nivel_id: nuevoNivelId })
          .returning('id');

        const accesorios = await trx(TABLA_POSICION_ACCESORIO).where('posicion_id', posicionIdOriginal);

        if (accesorios.length > 0) {
          const filas = accesorios.map(({ id, posicion_id, ...datos }) => ({
            ...datos,
            posicion_id: nuevaPosicionId,
          }));
          await trx(TABLA_POSICION_ACCESORIO).insert(filas);
        }
      }
    }
  }
}

// ─── clonarSecciones ─────────────────────────────────────────────────────────
// Copia el árbol de secciones de una góndola (padres antes que hijas) y devuelve el mapa
// idOriginal → idNuevo para reasignar `Nivel.seccion_id`. Góndola sin dividir → mapa vacío.

async function clonarSecciones(trx, gondolaIdOriginal, nuevaGondolaId) {
  const secciones = await trx(TABLA_SECCION).where('gondola_id', gondolaIdOriginal);
  const mapa = new Map();
  const pendientes = [...secciones];
  while (pendientes.length) {
    const i = pendientes.findIndex((s) => s.padre_id === null || mapa.has(s.padre_id));
    if (i < 0) break; // árbol inconsistente: no debería ocurrir
    const { id, gondola_id, padre_id, ...datos } = pendientes.splice(i, 1)[0];
    const [{ id: nuevoId }] = await trx(TABLA_SECCION)
      .insert({ ...datos, gondola_id: nuevaGondolaId, padre_id: padre_id === null ? null : mapa.get(padre_id) })
      .returning('id');
    mapa.set(id, nuevoId);
  }
  return mapa;
}

// ─── crearConClon ────────────────────────────────────────────────────────────

async function crearConClon(version, versionBaseId, tiendaId) {
  return db.transaction(async (trx) => {
    const [{ id: nuevaVersionId }] = await trx(TABLA_VERSION).insert(version).returning('id');

    await trx(TABLA_VERSION_TIENDA).insert({ planograma_version_id: nuevaVersionId, tienda_id: tiendaId });

    await clonarEstructura(trx, versionBaseId, nuevaVersionId);

    return nuevaVersionId;
  });
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_VERSION).where('id', id).first();
  return row ? mapVersion(row) : null;
}

// ─── Árbol góndolas → niveles → posiciones (compartido por detalle/estructura) ─

async function obtenerArbolCrudo(versionId, { vistaImplementador }) {
  const gondolas = await db(TABLA_GONDOLA)
    .where('planograma_version_id', versionId)
    .orderBy('orden', 'asc');

  const gondolaIds = gondolas.map((g) => g.id);

  const niveles = gondolaIds.length
    ? await db(TABLA_NIVEL)
        .leftJoin(TABLA_ACCESORIO, `${TABLA_NIVEL}.codigo_accesorio_id`, `${TABLA_ACCESORIO}.id`)
        .whereIn(`${TABLA_NIVEL}.gondola_id`, gondolaIds)
        .orderBy(`${TABLA_NIVEL}.orden`, 'asc')
        .select(
          `${TABLA_NIVEL}.*`,
          `${TABLA_ACCESORIO}.id as accesorio_id`,
          `${TABLA_ACCESORIO}.codigo as accesorio_codigo`,
          `${TABLA_ACCESORIO}.nombre as accesorio_nombre`,
        )
    : [];

  const nivelIds = niveles.map((n) => n.id);

  let posiciones = [];
  if (nivelIds.length > 0) {
    const query = db(TABLA_POSICION).whereIn('nivel_id', nivelIds);
    if (vistaImplementador) query.where('decision', 'ACTIVO');
    posiciones = await query.orderBy('orden_horizontal', 'asc');
  }

  const posicionesPorNivel = agruparPor(posiciones, 'nivel_id');
  const nivelesPorGondola  = agruparPor(niveles, 'gondola_id');

  return gondolas.map((g) => ({
    ...g,
    niveles: (nivelesPorGondola[g.id] ?? []).map((n) => ({
      ...n,
      posiciones: posicionesPorNivel[n.id] ?? [],
    })),
  }));
}

function mapAccesorioNivel(n, incluirId) {
  if (!n.accesorio_id) return null;
  return {
    ...(incluirId && { id: n.accesorio_id }),
    codigo: n.accesorio_codigo,
    nombre: n.accesorio_nombre,
  };
}

function mapPosicionCompleta(p) {
  return {
    id:                  p.id,
    orden_horizontal:    p.orden_horizontal,
    sku:                 p.sku,
    facings_horizontal:  p.facings_horizontal,
    ancho_asignado_cm:   Number(p.ancho_asignado_cm),
    cantidad_apilable:   p.cantidad_apilable,
    unidades_por_facing: p.unidades_por_facing,
    capacidad_maxima:    p.capacidad_maxima,
    min_estetico:        p.min_estetico,
    min_final:           p.min_final,
    max_final:           p.max_final,
    perfil_redondeo:     p.perfil_redondeo,
    modo:                p.modo,
    decision:            p.decision,
    cross_externo:       Boolean(p.cross_externo),
    montar_en_display:   Boolean(p.montar_en_display),
    desborda_gondola:    Boolean(p.desborda_gondola),
    nota_desborde:       p.nota_desborde,
    observaciones:       p.observaciones,
  };
}

function mapPosicionReducida(p) {
  return {
    id:                 p.id,
    sku:                p.sku,
    facings_horizontal: p.facings_horizontal,
    cantidad_apilable:  p.cantidad_apilable,
    modo:               p.modo,
    montar_en_display:  Boolean(p.montar_en_display),
    desborda_gondola:   Boolean(p.desborda_gondola),
    nota_desborde:      p.nota_desborde,
    observaciones:      p.observaciones,
  };
}

function mapNivelCompleto(n) {
  return {
    id:                        n.id,
    orden:                     n.orden,
    altura_desde_piso_cm:      Number(n.altura_desde_piso_cm),
    tipo_accesorio:            n.tipo_accesorio,
    accesorio:                 mapAccesorioNivel(n, true),
    tamano_accesorio_pulgadas: n.tamano_accesorio_pulgadas !== null ? Number(n.tamano_accesorio_pulgadas) : null,
    ancho_disponible_cm:       Number(n.ancho_disponible_cm),
    notas:                     n.notas,
    posiciones:                n.posiciones.map(mapPosicionCompleta),
  };
}

function mapNivelReducido(n) {
  return {
    orden:                     n.orden,
    altura_desde_piso_cm:      Number(n.altura_desde_piso_cm),
    tipo_accesorio:            n.tipo_accesorio,
    accesorio:                 mapAccesorioNivel(n, false),
    tamano_accesorio_pulgadas: n.tamano_accesorio_pulgadas !== null ? Number(n.tamano_accesorio_pulgadas) : null,
    posiciones:                n.posiciones.map(mapPosicionReducida),
  };
}

function mapGondolaCompleta(g) {
  return {
    id:                 g.id,
    nombre:             g.nombre,
    ancho_cm:           Number(g.ancho_cm),
    alto_cm:            Number(g.alto_cm),
    profundidad_cm:     Number(g.profundidad_cm),
    posicion_en_tienda: g.posicion_en_tienda,
    orden:              g.orden,
    niveles:            g.niveles.map(mapNivelCompleto),
  };
}

function mapGondolaReducida(g) {
  return {
    nombre:             g.nombre,
    ancho_cm:           Number(g.ancho_cm),
    alto_cm:            Number(g.alto_cm),
    profundidad_cm:     Number(g.profundidad_cm),
    posicion_en_tienda: g.posicion_en_tienda,
    orden:              g.orden,
    niveles:            g.niveles.map(mapNivelReducido),
  };
}

// ─── obtenerDetalleCompleto ──────────────────────────────────────────────────

async function obtenerDetalleCompleto(id, { vistaImplementador }) {
  const version  = await db(TABLA_VERSION).where('id', id).first();
  const gondolas = await obtenerArbolCrudo(id, { vistaImplementador });

  return {
    id:           version.id,
    planogramaId: version.planograma_id,
    codigo:       version.codigo,
    tipo:         version.tipo,
    estado:       version.estado,
    notas:        version.notas,
    gondolas:     gondolas.map(mapGondolaCompleta),
    createdAt:    version.created_at,
  };
}

// ─── obtenerEstructuraPublicada ──────────────────────────────────────────────

async function obtenerEstructuraPublicada(id, { vistaImplementador }) {
  const version  = await db(TABLA_VERSION).where('id', id).first();
  const gondolas = await obtenerArbolCrudo(id, { vistaImplementador });

  return {
    versionId: version.id,
    codigo:    version.codigo,
    tipo:      version.tipo,
    gondolas:  gondolas.map(mapGondolaReducida),
  };
}

// ─── actualizarMetadatos ─────────────────────────────────────────────────────

async function actualizarMetadatos(id, cambios) {
  const campos = {};
  if (cambios.notas  !== undefined) campos.notas  = cambios.notas;
  if (cambios.codigo !== undefined) campos.codigo = cambios.codigo;
  if (Object.keys(campos).length === 0) return;

  campos.updated_at = db.fn.now();
  await db(TABLA_VERSION).where('id', id).update(campos);
}

// ─── actualizarEstado ────────────────────────────────────────────────────────

async function actualizarEstado(id, estado) {
  await db(TABLA_VERSION).where('id', id).update({ estado, updated_at: db.fn.now() });
}

// ─── buscarVersionEnEstado ───────────────────────────────────────────────────

async function buscarVersionEnEstado(planogramaId, tipo, estado, excluirId) {
  // La unicidad por estado solo aplica a la línea base — las versiones especiales
  // por tienda (version_base_id NOT NULL) quedan fuera de esta búsqueda.
  const query = db(TABLA_VERSION)
    .where('planograma_id', planogramaId)
    .where('tipo', tipo)
    .where('estado', estado)
    .whereNull('version_base_id');

  if (excluirId !== undefined) query.whereNot('id', excluirId);

  const row = await query.select('id', 'codigo', 'estado').first();
  return row ?? null;
}

// ─── existeCodigoEnPlanograma ────────────────────────────────────────────────

async function existeCodigoEnPlanograma(planogramaId, codigo, excluirId) {
  const query = db(TABLA_VERSION).where('planograma_id', planogramaId).where('codigo', codigo);
  if (excluirId !== undefined) query.whereNot('id', excluirId);

  const row = await query.select('id').first();
  return row !== undefined;
}

// ─── buscarTiendaPorId ───────────────────────────────────────────────────────

async function buscarTiendaPorId(tiendaId) {
  const row = await db(TABLA_TIENDA).where('id', tiendaId).select('id', 'codigo', 'nombre').first();
  return row ?? null;
}

// ─── tiendaTieneVersionEspecialDeBase ────────────────────────────────────────

async function tiendaTieneVersionEspecialDeBase(versionBaseId, tiendaId) {
  const row = await db(TABLA_VERSION)
    .join(TABLA_VERSION_TIENDA, `${TABLA_VERSION}.id`, `${TABLA_VERSION_TIENDA}.planograma_version_id`)
    .where(`${TABLA_VERSION}.version_base_id`, versionBaseId)
    .where(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaId)
    .select(`${TABLA_VERSION}.id`)
    .first();

  return row !== undefined;
}

// ─── listarTiendas ───────────────────────────────────────────────────────────

async function listarTiendas(id) {
  const asignadas = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .where(`${TABLA_VERSION_TIENDA}.planograma_version_id`, id)
    .select(
      `${TABLA_TIENDA}.id`,
      `${TABLA_TIENDA}.codigo`,
      `${TABLA_TIENDA}.nombre`,
      `${TABLA_TIENDA}.tipo`,
      `${TABLA_TIENDA}.Marca as marca`,
    );

  const asignadasIds = asignadas.map((t) => t.id);

  const disponiblesQuery = db(TABLA_TIENDA);
  if (asignadasIds.length > 0) disponiblesQuery.whereNotIn('id', asignadasIds);

  const disponibles = await disponiblesQuery.select('id', 'codigo', 'nombre', 'tipo', 'Marca as marca');

  return { asignadas, disponibles };
}

// ─── reemplazarTiendas ───────────────────────────────────────────────────────

// Para versiones publicadas o en piloto aplica la regla "una tienda monta una sola versión por
// planograma" (las tiendas agregadas desmontan la que tenían) y audita cada cambio. Para el
// resto de estados la lista de tiendas es solo informativa y se reemplaza tal cual.
async function reemplazarTiendas(id, tiendaIds, usuario) {
  let tiendasValidas = [];
  let ignorados       = [];

  if (tiendaIds.length > 0) {
    tiendasValidas = await db(TABLA_TIENDA)
      .whereIn('id', tiendaIds)
      .select('id', 'codigo', 'nombre');

    const validasIds = tiendasValidas.map((t) => t.id);
    ignorados = tiendaIds.filter((tid) => !validasIds.includes(tid));
  }

  await db.transaction(async (trx) => {
    const version = await trx(TABLA_VERSION).where('id', id).select('id', 'planograma_id', 'codigo', 'estado').first();

    if (!esMontable(version.estado)) {
      await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', id).delete();
      if (tiendasValidas.length > 0) {
        const filas = tiendasValidas.map((t) => ({ planograma_version_id: id, tienda_id: t.id }));
        await trx(TABLA_VERSION_TIENDA).insert(filas);
      }
      return;
    }

    const planogramaId = version.planograma_id;
    const esta         = { id: version.id, codigo: version.codigo, estado: version.estado };
    const nuevasIds    = tiendasValidas.map((t) => t.id);
    const actualesIds  = await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', id).pluck('tienda_id');
    const quitadas     = actualesIds.filter((t) => !nuevasIds.includes(t));
    const agregadas    = nuevasIds.filter((t) => !actualesIds.includes(t));
    const montadas     = await versionesMontadas(trx, planogramaId, agregadas);

    const operaciones = [];
    for (const tiendaId of quitadas) {
      await trx(TABLA_VERSION_TIENDA).where({ planograma_version_id: id, tienda_id: tiendaId }).delete();
      operaciones.push({ planogramaId, tiendaId, accion: calcularAccion(esta, null), anterior: esta, nueva: null });
    }
    for (const tiendaId of agregadas) {
      const anterior = montadas.find((m) => m.tiendaId === tiendaId) ?? null;
      await montar(trx, planogramaId, tiendaId, id);
      const accion = calcularAccion(anterior, esta);
      if (accion) operaciones.push({ planogramaId, tiendaId, accion, anterior, nueva: esta });
    }

    await registrarEdicion(trx, { usuario, motivo: `Tiendas asignadas a ${version.codigo}`, origen: ORIGENES.VERSION }, operaciones);
  });

  return { tiendas: tiendasValidas, ignorados };
}

// ─── promoverAPiloto ─────────────────────────────────────────────────────────
// Las tiendas piloto desmontan la versión que tenían del planograma y montan esta. Si se
// archiva una piloto anterior, sus tiendas que no siguen en el piloto nuevo vuelven a la
// versión publicada del mismo tipo (o quedan sin el planograma si no existe). Todo se audita.

async function promoverAPiloto(id, tiendaIds, usuario, motivo) {
  return db.transaction(async (trx) => {
    const version = await trx(TABLA_VERSION).where('id', id).select('planograma_id', 'tipo', 'version_base_id', 'codigo').first();
    const planogramaId = version.planograma_id;
    const esLineaBase  = version.version_base_id === null;

    // El archivado automático de la "anterior" es una regla de la línea base — las
    // versiones especiales por tienda no compiten por el estado con nadie.
    const anterior = esLineaBase
      ? await trx(TABLA_VERSION)
          .where('planograma_id', planogramaId)
          .where('tipo', version.tipo)
          .where('estado', ESTADOS.PILOTO)
          .whereNull('version_base_id')
          .whereNot('id', id)
          .select('id', 'codigo')
          .first()
      : undefined;

    const publicadaMismoTipo = esLineaBase
      ? await trx(TABLA_VERSION)
          .where('planograma_id', planogramaId)
          .where('tipo', version.tipo)
          .where('estado', ESTADOS.PUBLICADO)
          .whereNull('version_base_id')
          .select('id', 'codigo')
          .first()
      : undefined;

    const tiendasValidas = tiendaIds.length > 0
      ? await trx(TABLA_TIENDA).whereIn('id', tiendaIds).select('id', 'codigo', 'nombre')
      : [];
    const nuevasIds = tiendasValidas.map((t) => t.id);

    // Estado de cada tienda antes de mover nada, para auditar desde dónde viene.
    const montadasAntes   = await versionesMontadas(trx, planogramaId, nuevasIds);
    const testersAnterior = anterior
      ? await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', anterior.id).pluck('tienda_id')
      : [];
    const huerfanas = testersAnterior.filter((t) => !nuevasIds.includes(t));

    if (anterior) {
      await trx(TABLA_VERSION).where('id', anterior.id).update({ estado: ESTADOS.ARCHIVADO, updated_at: trx.fn.now() });
      await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', anterior.id).delete();
    }

    await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', id).delete();
    await trx(TABLA_VERSION).where('id', id).update({ estado: ESTADOS.PILOTO, updated_at: trx.fn.now() });

    const esta = { id, codigo: version.codigo, estado: ESTADOS.PILOTO };
    const operaciones = [];

    for (const tiendaId of nuevasIds) {
      const previa = montadasAntes.find((m) => m.tiendaId === tiendaId) ?? null;
      await montar(trx, planogramaId, tiendaId, id);
      const accion = calcularAccion(previa, esta);
      if (accion) operaciones.push({ planogramaId, tiendaId, accion, anterior: previa, nueva: esta });
    }

    for (const tiendaId of huerfanas) {
      const previa  = { id: anterior.id, codigo: anterior.codigo, estado: ESTADOS.PILOTO };
      const vuelta  = publicadaMismoTipo ? { ...publicadaMismoTipo, estado: ESTADOS.PUBLICADO } : null;
      if (vuelta) await montar(trx, planogramaId, tiendaId, vuelta.id);
      operaciones.push({ planogramaId, tiendaId, accion: calcularAccion(previa, vuelta), anterior: previa, nueva: vuelta });
    }

    await registrarEdicion(trx, { usuario, motivo: motivo || `Promoción a piloto de ${version.codigo}`, origen: ORIGENES.PILOTO }, operaciones);

    return { tiendas: tiendasValidas, versionAnteriorArchivada: anterior ?? null };
  });
}

// ─── Plan de publicación ─────────────────────────────────────────────────────
// Qué pasa al publicar una versión en piloto, sin escribir nada. Lo usan la publicación real
// (dentro de su transacción) y la simulación (GET /versiones/:id/publicacion/simular), así
// que las dos siempre coinciden. Resultado = tiendas del piloto ∪ tiendas de la publicada
// anterior, sin repetir (una tienda monta una sola versión por planograma).

async function calcularPlanPublicacion(conn, id) {
  const version = await conn(TABLA_VERSION).where('id', id).select('planograma_id', 'tipo', 'version_base_id', 'codigo', 'estado').first();

  // Ver nota en promoverAPiloto: solo la línea base archiva a su anterior.
  const anterior = version.version_base_id === null
    ? await conn(TABLA_VERSION)
        .where('planograma_id', version.planograma_id)
        .where('tipo', version.tipo)
        .where('estado', ESTADOS.PUBLICADO)
        .whereNull('version_base_id')
        .whereNot('id', id)
        .select('id', 'codigo')
        .first()
    : undefined;

  const testers   = await conn(TABLA_VERSION_TIENDA).where('planograma_version_id', id).pluck('tienda_id');
  const migrantes = anterior
    ? (await conn(TABLA_VERSION_TIENDA).where('planograma_version_id', anterior.id).pluck('tienda_id'))
        .filter((t) => !testers.includes(t))
    : [];

  return { version, anterior: anterior ?? null, testers, migrantes };
}

async function tiendasPorIds(ids) {
  if (ids.length === 0) return [];
  const rows = await db(TABLA_TIENDA)
    .whereIn('id', ids)
    .select('id', 'codigo', 'nombre', 'tipo', 'Marca as marca');
  return rows.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ─── simularPublicacion ──────────────────────────────────────────────────────

async function simularPublicacion(id) {
  const plan = await calcularPlanPublicacion(db, id);
  const [tiendasPiloto, tiendasMigran] = await Promise.all([tiendasPorIds(plan.testers), tiendasPorIds(plan.migrantes)]);
  return {
    versionAnterior: plan.anterior,
    tiendasPiloto,
    tiendasMigran,
    totalTiendas: tiendasPiloto.length + tiendasMigran.length,
  };
}

// ─── promoverAPublicado ──────────────────────────────────────────────────────
// Las tiendas que probaban esta versión en piloto quedan con ella publicada, y las que usaban
// la publicada anterior del mismo tipo (que se archiva) pasan a esta. Todo se audita.

async function promoverAPublicado(id, usuario, motivo) {
  return db.transaction(async (trx) => {
    const { version, anterior, testers, migrantes } = await calcularPlanPublicacion(trx, id);
    const planogramaId = version.planograma_id;

    if (anterior) {
      await trx(TABLA_VERSION).where('id', anterior.id).update({ estado: ESTADOS.ARCHIVADO, updated_at: trx.fn.now() });
      await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', anterior.id).delete();
    }

    await trx(TABLA_VERSION).where('id', id).update({ estado: ESTADOS.PUBLICADO, updated_at: trx.fn.now() });

    const antes = { id, codigo: version.codigo, estado: version.estado };
    const esta  = { id, codigo: version.codigo, estado: ESTADOS.PUBLICADO };
    const operaciones = testers.map((tiendaId) => ({
      planogramaId, tiendaId, accion: calcularAccion(antes, esta), anterior: antes, nueva: esta,
    }));

    for (const tiendaId of migrantes) {
      const previa = { id: anterior.id, codigo: anterior.codigo, estado: ESTADOS.PUBLICADO };
      await montar(trx, planogramaId, tiendaId, id);
      operaciones.push({ planogramaId, tiendaId, accion: calcularAccion(previa, esta), anterior: previa, nueva: esta });
    }

    await registrarEdicion(trx, { usuario, motivo: motivo || `Publicación de ${version.codigo}`, origen: ORIGENES.PUBLICACION }, operaciones);

    return { versionAnteriorArchivada: anterior };
  });
}

// ─── guardarComoEnDesarrollo ─────────────────────────────────────────────────

async function guardarComoEnDesarrollo(id) {
  return db.transaction(async (trx) => {
    const version = await trx(TABLA_VERSION).where('id', id).select('planograma_id', 'tipo', 'version_base_id').first();

    // Ver nota en promoverAPiloto: solo la línea base archiva a su anterior.
    const anterior = version.version_base_id === null
      ? await trx(TABLA_VERSION)
          .where('planograma_id', version.planograma_id)
          .where('tipo', version.tipo)
          .where('estado', ESTADOS.EN_DESARROLLO)
          .whereNull('version_base_id')
          .whereNot('id', id)
          .select('id', 'codigo')
          .first()
      : undefined;

    if (anterior) {
      await trx(TABLA_VERSION).where('id', anterior.id).update({ estado: ESTADOS.ARCHIVADO, updated_at: trx.fn.now() });
    }

    await trx(TABLA_VERSION).where('id', id).update({ estado: ESTADOS.EN_DESARROLLO, updated_at: trx.fn.now() });

    return { versionAnteriorArchivada: anterior ?? null };
  });
}

// ─── buscarErroresBloqueantes ────────────────────────────────────────────────

async function buscarErroresBloqueantes(id) {
  const rows = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, id)
    .whereRaw(`${TABLA_POSICION}.min_final > ${TABLA_POSICION}.max_final`)
    .select(
      `${TABLA_POSICION}.id as posicionId`,
      `${TABLA_POSICION}.sku as sku`,
      `${TABLA_POSICION}.min_final as minFinal`,
      `${TABLA_POSICION}.max_final as maxFinal`,
      `${TABLA_GONDOLA}.nombre as gondola`,
      `${TABLA_NIVEL}.orden as nivel`,
    );

  return rows.map((r) => ({
    posicionId: r.posicionId,
    sku:        r.sku,
    gondola:    r.gondola,
    nivel:      r.nivel,
    error:      `min_final (${r.minFinal}) > max_final (${r.maxFinal})`,
  }));
}

// ─── obtenerResumen ──────────────────────────────────────────────────────────
// Ficha de solo lectura de una versión (modal "Ver versión" de Estructura): datos de la
// versión y su planograma, conteos de estructura y tiendas que la montan. Los adjuntos se
// piden aparte a GET /versiones/:id/adjuntos.

const TABLA_PLANOGRAMA   = 'Planograma';
const TABLA_SUBCATEGORIA = 'PlanogramaSubcategoria';
const MODOS_POSICION     = ['PLANOGRAMA', 'CROSS', 'IMPULSO', 'PENDIENTE'];

async function contarEstructura(id) {
  // La góndola "Por ubicar" es temporal: no cuenta en góndolas, ancho ni niveles.
  const [gondolas] = await db(TABLA_GONDOLA)
    .where({ planograma_version_id: id, por_ubicar: false })
    .count('id as total')
    .sum('ancho_cm as anchoTotal');

  const [niveles] = await db(TABLA_NIVEL)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, id)
    .where(`${TABLA_GONDOLA}.por_ubicar`, false)
    .count(`${TABLA_NIVEL}.id as total`);

  const posicionesDeVersion = () => db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, id);

  const porModo = await posicionesDeVersion()
    .groupBy(`${TABLA_POSICION}.modo`)
    .select(`${TABLA_POSICION}.modo as modo`)
    .count(`${TABLA_POSICION}.id as total`);

  const [productos] = await posicionesDeVersion()
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .countDistinct(`${TABLA_POSICION}.sku as total`);

  const posicionesPorModo = Object.fromEntries(MODOS_POSICION.map((m) => [m, 0]));
  porModo.forEach((r) => { posicionesPorModo[r.modo] = Number(r.total); });

  return {
    gondolas:          Number(gondolas.total),
    niveles:           Number(niveles.total),
    posiciones:        Object.values(posicionesPorModo).reduce((a, b) => a + b, 0),
    productos:         Number(productos.total),
    metrosLineales:    Math.round(Number(gondolas.anchoTotal ?? 0)) / 100,
    posicionesPorModo,
  };
}

async function obtenerResumen(id) {
  const version = await db(TABLA_VERSION).where('id', id).first();

  const planograma = await db(TABLA_PLANOGRAMA)
    .where('id', version.planograma_id)
    .select('id', 'nombre', 'descripcion', 'departamento', 'estado')
    .first();
  const subcategorias = await db(TABLA_SUBCATEGORIA)
    .where('planograma_id', planograma.id)
    .pluck('subcategoria');

  const versionBase = version.version_base_id
    ? await db(TABLA_VERSION).where('id', version.version_base_id).select('id', 'codigo').first()
    : null;

  // La piloto de la línea base reemplazará, al publicarse, a la publicada del mismo tipo.
  const reemplazaA = version.estado === ESTADOS.PILOTO && version.version_base_id === null
    ? await db(TABLA_VERSION)
        .where('planograma_id', version.planograma_id)
        .where('tipo', version.tipo)
        .where('estado', ESTADOS.PUBLICADO)
        .whereNull('version_base_id')
        .select('id', 'codigo')
        .first()
    : null;

  const tiendas = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .where(`${TABLA_VERSION_TIENDA}.planograma_version_id`, id)
    .orderBy(`${TABLA_TIENDA}.nombre`, 'asc')
    .select(`${TABLA_TIENDA}.id`, `${TABLA_TIENDA}.codigo`, `${TABLA_TIENDA}.nombre`, `${TABLA_TIENDA}.tipo`);

  return {
    version: {
      ...mapVersion(version),
      versionBase: versionBase ?? null,
      reemplazaA:  reemplazaA ?? null,
    },
    planograma: { ...planograma, subcategorias },
    estructura: await contarEstructura(id),
    tiendas,
  };
}

// ─── Exportación ─────────────────────────────────────────────────────────────

// ─── contarPosicionesPorUbicar ────────────────────────────────────────────────

/** Posiciones que siguen en la góndola "Por ubicar" de la versión (importador de productos). */
async function contarPosicionesPorUbicar(versionId) {
  const [{ total }] = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, versionId)
    .where(`${TABLA_GONDOLA}.por_ubicar`, true)
    .count(`${TABLA_POSICION}.id as total`);
  return Number(total);
}

module.exports = {
  contarPosicionesPorUbicar,
  listarPorPlanograma,
  crearConGondolas,
  crearConClon,
  clonarEstructura,
  obtenerResumen,
  buscarPorId,
  obtenerDetalleCompleto,
  obtenerEstructuraPublicada,
  actualizarMetadatos,
  actualizarEstado,
  buscarVersionEnEstado,
  existeCodigoEnPlanograma,
  buscarTiendaPorId,
  tiendaTieneVersionEspecialDeBase,
  listarTiendas,
  reemplazarTiendas,
  promoverAPiloto,
  promoverAPublicado,
  simularPublicacion,
  guardarComoEnDesarrollo,
  buscarErroresBloqueantes,
};
