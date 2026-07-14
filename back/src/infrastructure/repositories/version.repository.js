/**
 * version.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');
const { ESTADOS, ESTADOS_ACTIVOS } = require('../../domain/version/version.entity');

const TABLA_VERSION            = 'PlanogramaVersion';
const TABLA_VERSION_TIENDA     = 'VersionTienda';
const TABLA_GONDOLA            = 'Gondola';
const TABLA_NIVEL              = 'Nivel';
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

  const gondolaCounts = await db(TABLA_GONDOLA)
    .whereIn('planograma_version_id', ids)
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

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(version) {
  const [{ id }] = await db(TABLA_VERSION).insert(version).returning('id');
  return id;
}

// ─── crearConClon ────────────────────────────────────────────────────────────
// Copia góndolas → niveles → posiciones → accesorios de la versión base en una
// única transacción. El id nuevo de cada fila padre se usa inmediatamente como
// FK de sus hijos, sin necesidad de mantener un mapa oldId→newId en memoria.

async function crearConClon(version, versionBaseId, tiendaId) {
  return db.transaction(async (trx) => {
    const [{ id: nuevaVersionId }] = await trx(TABLA_VERSION).insert(version).returning('id');

    await trx(TABLA_VERSION_TIENDA).insert({ planograma_version_id: nuevaVersionId, tienda_id: tiendaId });

    const gondolas = await trx(TABLA_GONDOLA)
      .where('planograma_version_id', versionBaseId)
      .orderBy('orden', 'asc');

    for (const gondola of gondolas) {
      const { id: gondolaIdOriginal, planograma_version_id, ...gondolaDatos } = gondola;
      const [{ id: nuevaGondolaId }] = await trx(TABLA_GONDOLA)
        .insert({ ...gondolaDatos, planograma_version_id: nuevaVersionId })
        .returning('id');

      const niveles = await trx(TABLA_NIVEL)
        .where('gondola_id', gondolaIdOriginal)
        .orderBy('orden', 'asc');

      for (const nivel of niveles) {
        const { id: nivelIdOriginal, gondola_id, ...nivelDatos } = nivel;
        const [{ id: nuevoNivelId }] = await trx(TABLA_NIVEL)
          .insert({ ...nivelDatos, gondola_id: nuevaGondolaId })
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

// ─── buscarVersionActivaDeTipo ───────────────────────────────────────────────

async function buscarVersionActivaDeTipo(planogramaId, tipo, excluirId) {
  const query = db(TABLA_VERSION)
    .where('planograma_id', planogramaId)
    .where('tipo', tipo)
    .whereIn('estado', ESTADOS_ACTIVOS);

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

// ─── siguienteSecuencial ─────────────────────────────────────────────────────

async function siguienteSecuencial(planogramaId, tipo) {
  const [{ total }] = await db(TABLA_VERSION)
    .where('planograma_id', planogramaId)
    .where('tipo', tipo)
    .count('id as total');

  return Number(total) + 1;
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
  const version = await db(TABLA_VERSION).where('id', id).select('tipo').first();

  const asignadas = await db(TABLA_VERSION_TIENDA)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .where(`${TABLA_VERSION_TIENDA}.planograma_version_id`, id)
    .select(`${TABLA_TIENDA}.id`, `${TABLA_TIENDA}.codigo`, `${TABLA_TIENDA}.nombre`, `${TABLA_TIENDA}.tipo`);

  const asignadasIds = asignadas.map((t) => t.id);

  const disponiblesQuery = db(TABLA_TIENDA).where('tipo', version.tipo);
  if (asignadasIds.length > 0) disponiblesQuery.whereNotIn('id', asignadasIds);

  const disponibles = await disponiblesQuery.select('id', 'codigo', 'nombre', 'tipo');

  return { asignadas, disponibles };
}

// ─── reemplazarTiendas ───────────────────────────────────────────────────────

async function reemplazarTiendas(id, tiendaIds) {
  const version = await db(TABLA_VERSION).where('id', id).select('tipo').first();

  let tiendasValidas = [];
  let ignorados       = [];

  if (tiendaIds.length > 0) {
    tiendasValidas = await db(TABLA_TIENDA)
      .whereIn('id', tiendaIds)
      .where('tipo', version.tipo)
      .select('id', 'codigo', 'nombre');

    const validasIds = tiendasValidas.map((t) => t.id);
    ignorados = tiendaIds.filter((tid) => !validasIds.includes(tid));
  }

  await db.transaction(async (trx) => {
    await trx(TABLA_VERSION_TIENDA).where('planograma_version_id', id).delete();

    if (tiendasValidas.length > 0) {
      const filas = tiendasValidas.map((t) => ({ planograma_version_id: id, tienda_id: t.id }));
      await trx(TABLA_VERSION_TIENDA).insert(filas);
    }
  });

  return { tiendas: tiendasValidas, ignorados };
}

// ─── promoverAPiloto ─────────────────────────────────────────────────────────

async function promoverAPiloto(id, tiendaIds) {
  const { tiendas } = await reemplazarTiendas(id, tiendaIds);
  await db(TABLA_VERSION).where('id', id).update({ estado: ESTADOS.PILOTO, updated_at: db.fn.now() });
  return { tiendas };
}

// ─── promoverAPublicado ──────────────────────────────────────────────────────

async function promoverAPublicado(id) {
  return db.transaction(async (trx) => {
    const version = await trx(TABLA_VERSION).where('id', id).select('planograma_id', 'tipo').first();

    const anterior = await trx(TABLA_VERSION)
      .where('planograma_id', version.planograma_id)
      .where('tipo', version.tipo)
      .where('estado', ESTADOS.PUBLICADO)
      .whereNot('id', id)
      .select('id', 'codigo')
      .first();

    if (anterior) {
      await trx(TABLA_VERSION).where('id', anterior.id).update({ estado: ESTADOS.ARCHIVADO, updated_at: trx.fn.now() });
    }

    await trx(TABLA_VERSION).where('id', id).update({ estado: ESTADOS.PUBLICADO, updated_at: trx.fn.now() });

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

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listarPorPlanograma,
  crear,
  crearConClon,
  buscarPorId,
  obtenerDetalleCompleto,
  obtenerEstructuraPublicada,
  actualizarMetadatos,
  actualizarEstado,
  buscarVersionActivaDeTipo,
  existeCodigoEnPlanograma,
  siguienteSecuencial,
  tiendaTieneVersionEspecialDeBase,
  listarTiendas,
  reemplazarTiendas,
  promoverAPiloto,
  promoverAPublicado,
  buscarErroresBloqueantes,
};
