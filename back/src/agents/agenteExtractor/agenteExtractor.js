/**
 * agenteExtractor.js
 * Agente Extractor del Planograma: conversa con el analista para recolectar, mensaje a
 * mensaje, una lista ordenada de acciones a aplicar sobre toda la versión abierta en el editor
 * (góndolas, niveles, posiciones, accesorios de montaje y medidas de producto) — no solo agregar
 * productos/niveles. Sin persistencia — el historial y el borrador acumulado viajan completos en
 * cada request (ver agenteExtractor.controller.js), este módulo solo orquesta la conversación con
 * OpenAI y normaliza el resultado.
 */

const { TIPOS_ACCESORIO } = require('../../domain/nivel/nivel.entity');
const { PERFILES_REDONDEO, MODOS, DECISIONES } = require('../../domain/posicion/posicion.entity');

// Mismos valores por defecto que usa "Elegir producto" desde catálogo
// (ver front/src/components/dominio/modales/ElegirProductoModal/ElegirProductoModal.tsx).
const DEFAULTS = {
  facings_horizontal: 1,
  cantidad_apilable: 1,
  unidades_por_facing: 1,
  perfil_redondeo: 'MRP',
  modo: 'PLANOGRAMA',
  decision: 'ACTIVO',
  // Mismos valores por defecto de góndola/nivel que usan GondolaModal/NivelModal en el frontend
  // (ver front/src/constants/valoresPorDefecto.ts — misma fuente de verdad, duplicada acá porque
  // el backend no puede importar del frontend).
  gondola_ancho_cm: 200,
  gondola_alto_cm: 230,
  gondola_profundidad_cm: 50,
  nivel_altura_desde_piso_cm: 5,
  nivel_tipo_accesorio: 'BANDEJA',
};

const TOOL_BUSCAR_PRODUCTO = {
  type: 'function',
  function: {
    name: 'buscar_producto',
    description:
      'Busca un producto del catálogo por SKU exacto o por texto (nombre/marca). Úsala para ' +
      'validar que un SKU existe o para resolver un producto que el usuario describió sin dar el SKU.',
    parameters: {
      type: 'object',
      properties: {
        termino: { type: 'string', description: 'SKU exacto o texto de búsqueda (nombre, marca).' },
      },
      required: ['termino'],
      additionalProperties: false,
    },
  },
};

/**
 * Schema plano de una acción del borrador: el discriminador `tipo_accion` determina cuáles de
 * los demás campos aplican (los del resto van en null). Se mantiene plano (sin anyOf/unión
 * discriminada) porque OpenAI Structured Outputs en modo strict exige que cada rama de un anyOf
 * declare igual `required`/`additionalProperties:false`, así que no ahorra código frente a esto,
 * y la normalización de más abajo necesita el mismo switch por tipo de cualquier forma. Varios
 * campos se comparten entre tipos con significado distinto según `tipo_accion` (ej. `ancho_cm`
 * es de la góndola en `crear_gondola`/`editar_gondola` y del producto en
 * `actualizar_medidas_producto`) — mismo criterio ya usado para `nivel_orden` antes de esta
 * ampliación.
 */
const ACCION_SCHEMA = {
  type: 'object',
  properties: {
    tipo_accion: {
      type: 'string',
      enum: [
        'crear_gondola', 'editar_gondola', 'eliminar_gondola', 'reordenar_gondolas',
        'agregar_nivel', 'editar_nivel', 'eliminar_nivel', 'reordenar_niveles',
        'agregar_producto', 'editar_producto', 'mover_producto', 'duplicar_producto', 'eliminar_producto',
        'agregar_accesorio_posicion', 'quitar_accesorio_posicion',
        'actualizar_medidas_producto', 'validar_dimensiones_producto',
      ],
    },
    // Góndola.
    gondola_orden:         { type: ['integer', 'null'] },
    gondola_orden_destino: { type: ['integer', 'null'] },
    nombre:                { type: ['string', 'null'] },
    ancho_cm:              { type: ['number', 'null'] },
    alto_cm:               { type: ['number', 'null'] },
    profundidad_cm:        { type: ['number', 'null'] },
    posicion_en_tienda:    { type: ['string', 'null'] },
    orden_gondolas:        { type: ['array', 'null'], items: { type: 'integer' } },
    // Nivel.
    nivel_orden:               { type: ['integer', 'null'] },
    nivel_orden_destino:       { type: ['integer', 'null'] },
    altura_desde_piso_cm:      { type: ['number', 'null'] },
    tipo_accesorio:            { type: ['string', 'null'], enum: [...TIPOS_ACCESORIO, null] },
    codigo_accesorio_id:       { type: ['integer', 'null'] },
    tamano_accesorio_pulgadas: { type: ['number', 'null'] },
    ancho_disponible_cm:       { type: ['number', 'null'] },
    notas:                     { type: ['string', 'null'] },
    orden_niveles:             { type: ['array', 'null'], items: { type: 'integer' } },
    // Producto / posición ("espacio").
    sku:                  { type: ['string', 'null'] },
    espacio_orden:        { type: ['integer', 'null'] },
    espacio_orden_destino: { type: ['integer', 'null'] },
    facings_horizontal:   { type: ['integer', 'null'] },
    cantidad_apilable:    { type: ['integer', 'null'] },
    unidades_por_facing:  { type: ['integer', 'null'] },
    perfil_redondeo:      { type: ['string', 'null'], enum: [...PERFILES_REDONDEO, null] },
    modo:                 { type: ['string', 'null'], enum: [...MODOS, null] },
    decision:             { type: ['string', 'null'], enum: [...DECISIONES, null] },
    min_final:            { type: ['number', 'null'] },
    max_final:            { type: ['number', 'null'] },
    cross_externo:        { type: ['boolean', 'null'] },
    montar_en_display:    { type: ['boolean', 'null'] },
    desborda_gondola:     { type: ['boolean', 'null'] },
    nota_desborde:        { type: ['string', 'null'] },
    observaciones:        { type: ['string', 'null'] },
    // Accesorios de montaje de una posición.
    accesorio_codigo: { type: ['string', 'null'] },
    nota_libre:       { type: ['string', 'null'] },
  },
  required: [
    'tipo_accion',
    'gondola_orden', 'gondola_orden_destino', 'nombre', 'ancho_cm', 'alto_cm', 'profundidad_cm',
    'posicion_en_tienda', 'orden_gondolas',
    'nivel_orden', 'nivel_orden_destino', 'altura_desde_piso_cm', 'tipo_accesorio',
    'codigo_accesorio_id', 'tamano_accesorio_pulgadas', 'ancho_disponible_cm', 'notas', 'orden_niveles',
    'sku', 'espacio_orden', 'espacio_orden_destino', 'facings_horizontal', 'cantidad_apilable',
    'unidades_por_facing', 'perfil_redondeo', 'modo', 'decision', 'min_final', 'max_final',
    'cross_externo', 'montar_en_display', 'desborda_gondola', 'nota_desborde', 'observaciones',
    'accesorio_codigo', 'nota_libre',
  ],
  additionalProperties: false,
};

const SCHEMA_RESPUESTA = {
  name: 'respuesta_agente_extractor',
  schema: {
    type: 'object',
    properties: {
      mensaje: { type: 'string' },
      borrador: { type: 'array', items: ACCION_SCHEMA },
      listo_para_confirmar: { type: 'boolean' },
    },
    required: ['mensaje', 'borrador', 'listo_para_confirmar'],
    additionalProperties: false,
  },
};

// ─── Prompt de sistema ───────────────────────────────────────────────────────

function construirPromptSistema(contexto) {
  const gondolas = contexto?.gondolas ?? [];
  const niveles = contexto?.niveles ?? [];
  const posiciones = contexto?.posiciones ?? [];
  const accesorios = contexto?.accesorios ?? [];
  const subcategorias = contexto?.subcategorias ?? [];

  const gondolasTexto = gondolas.length > 0
    ? gondolas.map((g) => `góndola ${g.gondola_orden} "${g.nombre}" (${g.total_niveles} nivel(es), ${g.ancho_cm} cm de ancho)`).join('; ')
    : 'sin góndolas registradas todavía';

  const nivelesTexto = niveles.length > 0
    ? niveles.map((n) => `nivel ${n.nivel_orden} de góndola ${n.gondola_orden} (${n.tipo_accesorio})`).join('; ')
    : 'sin niveles registrados todavía';

  const posicionesTexto = posiciones.length > 0
    ? posiciones
        .map((p) => `góndola ${p.gondola_orden}/nivel ${p.nivel_orden}/espacio ${p.espacio_orden}: SKU ${p.sku}${p.nombre ? ` (${p.nombre})` : ''}`)
        .join('; ')
    : 'sin posiciones registradas todavía';

  const accesoriosTexto = accesorios.length > 0
    ? accesorios.map((a) => `${a.codigo} (${a.nombre}, ${a.tipo})`).join('; ')
    : 'sin accesorios en el catálogo';

  const subcategoriasTexto = subcategorias.length > 0 ? subcategorias.join(', ') : 'sin subcategorías definidas';
  const tiposAccesorioTexto = TIPOS_ACCESORIO.join(', ');

  return `Eres el "Agente Extractor del Planograma" de Cemaco. Conversas con un analista para
recolectar, mensaje a mensaje, la lista ordenada de acciones que quiere aplicar al planograma que
tiene abierto en el editor — sobre toda la versión (todas sus góndolas), no solo una góndola.

## Direccionamiento

Nunca uses ids internos de base de datos — no los conoces. Referencia todo por coordenadas legibles:
- Góndola: \`gondola_orden\`.
- Nivel: \`nivel_orden\` (dentro de su góndola).
- Posición/espacio: \`espacio_orden\` (dentro de su nivel).
- Producto: \`sku\`.
- Accesorio: \`accesorio_codigo\` (contra el catálogo de accesorios listado abajo).

Cuando creas un elemento nuevo (góndola o nivel) y en el MISMO mensaje vas a referenciarlo después
(ej. crear un nivel y agregarle un producto en la misma respuesta), asigna vos mismo el
\`gondola_orden\`/\`nivel_orden\` que va a tener: es la cantidad de elementos que ya existen en su
padre (contando también los que ya pusiste antes en este mismo borrador) más 1. Ejemplo: si la
góndola ya tiene 2 niveles y este es el primer nivel nuevo que agregas en este borrador, su
nivel_orden es 3 — usa ese mismo número en la acción que crea el nivel y en las que lo referencian
después, en ese mismo array.

## Acciones disponibles (tipo_accion)

Góndola:
- "crear_gondola": nombre (obligatorio, sin default — pregúntalo siempre si falta), ancho_cm,
  alto_cm, profundidad_cm y posicion_en_tienda opcional. Las medidas tienen default de Cemaco
  (${DEFAULTS.gondola_ancho_cm}×${DEFAULTS.gondola_alto_cm}×${DEFAULTS.gondola_profundidad_cm} cm,
  ancho×alto×profundidad) — si el usuario no las da, asumilas y avisale en tu respuesta que usaste
  esos valores por si quiere cambiarlos.
- "editar_gondola": gondola_orden (la góndola a editar) + cualquiera de los campos de arriba (parcial).
- "eliminar_gondola": gondola_orden. Borra en cascada sus niveles y posiciones — es irreversible.
  Nunca la agregues al borrador sin que el usuario haya confirmado explícitamente que quiere
  eliminarla; si no lo dijo, pregúntaselo primero.
- "reordenar_gondolas": orden_gondolas = lista de gondola_orden ya existentes, en la secuencia nueva
  deseada.

Nivel (dentro de una góndola):
- "agregar_nivel": gondola_orden (opcional — si falta, cae en la primera góndola de la versión),
  nivel_orden (opcional — si falta, va al final de la góndola). altura_desde_piso_cm, tipo_accesorio
  (uno de: ${tiposAccesorioTexto}) y ancho_disponible_cm tienen default de Cemaco: altura
  ${DEFAULTS.nivel_altura_desde_piso_cm} cm, tipo_accesorio "${DEFAULTS.nivel_tipo_accesorio}", y
  ancho_disponible_cm = el ancho de la góndola que lo contiene (ver "cm de ancho" de cada góndola
  más abajo) — si el usuario no los da, asumilos y avisale en tu respuesta que usaste esos valores
  por si quiere cambiarlos. codigo_accesorio_id, tamano_accesorio_pulgadas y notas son opcionales.
- "editar_nivel": gondola_orden + nivel_orden (el nivel a editar) + cualquiera de los campos de
  arriba (parcial).
- "eliminar_nivel": gondola_orden + nivel_orden. Borra en cascada sus posiciones — irreversible,
  igual criterio que eliminar_gondola: pide confirmación explícita antes de agregarla.
- "reordenar_niveles": gondola_orden + orden_niveles = lista de nivel_orden ya existentes en esa
  góndola, en la secuencia nueva deseada.

Producto / posición ("espacio", dentro de un nivel):
- "agregar_producto": sku obligatorio (nunca lo inventes — si el usuario da una descripción en vez
  de un SKU exacto, usa buscar_producto). gondola_orden/nivel_orden/espacio_orden opcionales (si
  faltan: primera góndola, nivel 1, siguiente espacio libre). Si el usuario da el SKU pero no los
  atributos (facings, apilable, unidades por facing, perfil, modo, decisión), pregúntale si quiere
  los valores por defecto (1 facing, 1 apilable, 1 unidad por facing, perfil MRP, modo PLANOGRAMA,
  decisión ACTIVO — los mismos que usa "Elegir producto" desde catálogo); si no responde con
  valores distintos, asume que sí los quiere.
- "editar_producto": gondola_orden + nivel_orden + espacio_orden (la posición a editar, siempre
  obligatorios y explícitos — nunca asumas cuál) + cualquiera de: facings_horizontal,
  cantidad_apilable, unidades_por_facing, perfil_redondeo, min_final, max_final, modo, decision,
  cross_externo, montar_en_display, observaciones, desborda_gondola (si es true, nota_desborde es
  obligatoria).
- "mover_producto" / "duplicar_producto": gondola_orden + nivel_orden + espacio_orden de origen (la
  posición ya existente, siempre obligatorios) + gondola_orden_destino + nivel_orden_destino
  (obligatorios) + espacio_orden_destino (opcional — siguiente libre si falta). "mover_producto"
  saca el producto de su posición actual; "duplicar_producto" deja el original y crea una copia en
  el destino.
- "eliminar_producto": gondola_orden + nivel_orden + espacio_orden. Irreversible — pide
  confirmación explícita antes de agregarla.

Nunca calculas capacidad_maxima ni min_estetico — el sistema los deriva siempre de facings ×
apilable × unidades_por_facing, igual que en el editor.

Accesorios de montaje de una posición:
- "agregar_accesorio_posicion": gondola_orden + nivel_orden + espacio_orden (la posición) +
  accesorio_codigo (contra el catálogo listado abajo) + nota_libre opcional.
- "quitar_accesorio_posicion": gondola_orden + nivel_orden + espacio_orden + accesorio_codigo (el
  que ya tiene asignado esa posición).

Catálogo de producto (medidas físicas del SKU — no de una posición puntual):
- "actualizar_medidas_producto": sku + ancho_cm/alto_cm/profundidad_cm (las tres, sin default —
  pregúntalas si faltan).
- "validar_dimensiones_producto": sku (confirma que las medidas ya guardadas están bien, sin
  cambiarlas).

## Orden de ejecución

El array "borrador" representa el ORDEN REAL en que se van a ejecutar las acciones. Regla general:
una acción que crea o necesita un elemento (góndola/nivel/producto) siempre va, en el array, ANTES
que cualquier acción que lo referencia — nunca al revés. Ejemplo típico: góndola nueva → nivel
nuevo en ella → producto en ese nivel → accesorio en esa posición, en ese orden dentro del array.

## Reglas generales

- El borrador se acumula: en cada respuesta incluye TODAS las acciones ya recolectadas en la
  conversación (las de antes + las nuevas o corregidas en este mensaje), no solo las nuevas.
- "eliminar_gondola", "eliminar_nivel" y "eliminar_producto" son irreversibles (incluyen cascada
  en los dos primeros casos). Nunca las agregues al borrador sin que el usuario haya confirmado
  explícitamente en la conversación que quiere eliminar ese elemento puntual — si no lo dijo,
  pregúntaselo primero, no lo des por sentado.
- Pregunta explícitamente si el usuario quiere seguir agregando acciones o si ya quiere confirmar
  la lista. Marca listo_para_confirmar=true únicamente cuando el usuario diga explícitamente que ya
  terminó.
- Góndolas de esta versión: ${gondolasTexto}.
- Niveles existentes: ${nivelesTexto}.
- Posiciones existentes: ${posicionesTexto}.
- Catálogo de accesorios disponibles: ${accesoriosTexto}.
- Subcategorías de referencia de este planograma: ${subcategoriasTexto}.
- Responde siempre en español, en tono breve y directo.`;
}

// ─── Tool buscar_producto ─────────────────────────────────────────────────────

async function ejecutarBuscarProducto(catiClient, termino) {
  const detalle = await catiClient.obtenerProducto(termino).catch(() => null);
  if (detalle) {
    return {
      encontrado: true,
      candidatos: [{
        sku: detalle.sku, nombre: detalle.nombre, marca: detalle.marca, subcategoria: detalle.subcategoria,
      }],
    };
  }

  const candidatos = await catiClient.buscarProductos({ q: termino, page: 1, pageSize: 10 });
  return {
    encontrado: candidatos.length > 0,
    candidatos: candidatos.map((p) => ({ sku: p.sku, nombre: p.nombre, marca: p.marca, subcategoria: p.subcategoria })),
  };
}

/** Resuelve nombre/marca por SKU contra CATI (reutiliza la validación ya hecha en un turno
 * anterior para el mismo SKU, evitando golpear CATI de nuevo por cada item en cada turno, ya que
 * el borrador se reenvía completo siempre). Es la única parte de la normalización que hace I/O —
 * se corre en paralelo para todas las acciones "agregar_producto" antes de la fase de orden. */
async function resolverDatosProducto(item, previoPorSku, catiClient) {
  if (!item.sku) return { nombre: null, marca: null };

  const previo = previoPorSku.get(item.sku);
  if (previo) return { nombre: previo.nombre ?? null, marca: previo.marca ?? null };

  const detalle = await catiClient.obtenerProducto(item.sku).catch(() => null);
  return { nombre: detalle?.nombre ?? null, marca: detalle?.marca ?? null };
}

// ─── Normalización: contexto de coordenadas (góndola → nivel → posición) ──────

/** Contexto mutable de la fase 2 (síncrona, en orden) de normalización: rastrea qué góndolas,
 * niveles y posiciones van a existir a medida que se procesan las acciones de creación del
 * borrador, para poder validar las acciones que las referencian más adelante en el mismo array —
 * mismo mecanismo que ya existía para niveles, extendido a góndolas y posiciones. */
function crearContextoNormalizacion(contexto) {
  const gondolas = contexto?.gondolas ?? [];
  const niveles = contexto?.niveles ?? [];
  const posiciones = contexto?.posiciones ?? [];
  const accesorios = contexto?.accesorios ?? [];

  const gondolaCtx = {
    ordenesDisponibles: new Set(gondolas.map((g) => g.gondola_orden)),
    ordenesReservadas: new Set(),
    proximoOrden: gondolas.length,
  };

  const nivelCtxPorGondola = new Map();
  function obtenerNivelCtx(gondolaOrden) {
    if (!nivelCtxPorGondola.has(gondolaOrden)) {
      const existentes = niveles.filter((n) => n.gondola_orden === gondolaOrden);
      nivelCtxPorGondola.set(gondolaOrden, {
        ordenesDisponibles: new Set(existentes.map((n) => n.nivel_orden)),
        ordenesReservadas: new Set(),
        proximoOrden: existentes.length,
      });
    }
    return nivelCtxPorGondola.get(gondolaOrden);
  }

  const posicionCtxPorNivel = new Map();
  function obtenerPosicionCtx(gondolaOrden, nivelOrden) {
    const clave = `${gondolaOrden}:${nivelOrden}`;
    if (!posicionCtxPorNivel.has(clave)) {
      const existentes = posiciones.filter((p) => p.gondola_orden === gondolaOrden && p.nivel_orden === nivelOrden);
      posicionCtxPorNivel.set(clave, {
        ordenesDisponibles: new Set(existentes.map((p) => p.espacio_orden)),
        proximoOrden: existentes.length,
      });
    }
    return posicionCtxPorNivel.get(clave);
  }

  return {
    gondolaCtx,
    obtenerNivelCtx,
    obtenerPosicionCtx,
    accesoriosDisponibles: new Set(accesorios.map((a) => a.codigo)),
    gondolaPrimeraOrden: gondolas[0]?.gondola_orden ?? null,
    // Ancho de cada góndola (existente o creada en este mismo borrador) — default de
    // ancho_disponible_cm para los niveles que no lo especifiquen (ver normalizarAgregarNivel).
    anchoCmPorGondola: new Map(gondolas.map((g) => [g.gondola_orden, g.ancho_cm])),
  };
}

function resolverGondolaExistente(gondolaOrden, ctx) {
  if (gondolaOrden == null || !ctx.gondolaCtx.ordenesDisponibles.has(gondolaOrden)) {
    return { valido: false, mensaje: `La góndola ${gondolaOrden ?? '(sin especificar)'} no existe todavía y no hay una acción previa para crearla.` };
  }
  return { valido: true };
}

function resolverNivelExistente(gondolaOrden, nivelOrden, ctx) {
  const gondola = resolverGondolaExistente(gondolaOrden, ctx);
  if (!gondola.valido) return gondola;

  const nivelCtx = ctx.obtenerNivelCtx(gondolaOrden);
  if (nivelOrden == null || !nivelCtx.ordenesDisponibles.has(nivelOrden)) {
    return { valido: false, mensaje: `El nivel ${nivelOrden ?? '(sin especificar)'} no existe todavía en la góndola ${gondolaOrden} y no hay una acción previa para crearlo.` };
  }
  return { valido: true, nivelCtx };
}

function resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx) {
  const nivel = resolverNivelExistente(gondolaOrden, nivelOrden, ctx);
  if (!nivel.valido) return nivel;

  const posicionCtx = ctx.obtenerPosicionCtx(gondolaOrden, nivelOrden);
  if (espacioOrden == null || !posicionCtx.ordenesDisponibles.has(espacioOrden)) {
    return { valido: false, mensaje: `El espacio ${espacioOrden ?? '(sin especificar)'} no existe todavía en el nivel ${nivelOrden} de la góndola ${gondolaOrden}.` };
  }
  return { valido: true, posicionCtx };
}

/** Resuelve y reserva el destino de mover_producto/duplicar_producto: valida góndola+nivel
 * destino ya existentes, y asigna (si falta) el siguiente espacio libre del nivel destino —
 * mismo criterio de default que ya se usaba para el espacio de agregar_producto. */
function resolverDestino(item, ctx) {
  const gondolaDestino = item.gondola_orden_destino ?? null;
  const gondola = resolverGondolaExistente(gondolaDestino, ctx);
  if (!gondola.valido) {
    return { advertencias: [gondola.mensaje], gondolaDestino, nivelDestino: item.nivel_orden_destino ?? null, espacioDestino: item.espacio_orden_destino ?? null };
  }

  const nivelDestino = item.nivel_orden_destino ?? null;
  const nivelCtxDestino = ctx.obtenerNivelCtx(gondolaDestino);
  if (nivelDestino == null || !nivelCtxDestino.ordenesDisponibles.has(nivelDestino)) {
    return {
      advertencias: [`El nivel destino ${nivelDestino ?? '(sin especificar)'} no existe todavía en la góndola ${gondolaDestino}.`],
      gondolaDestino, nivelDestino, espacioDestino: item.espacio_orden_destino ?? null,
    };
  }

  const posicionCtxDestino = ctx.obtenerPosicionCtx(gondolaDestino, nivelDestino);
  let espacioDestino = item.espacio_orden_destino ?? null;
  if (espacioDestino == null) espacioDestino = posicionCtxDestino.proximoOrden + 1;
  posicionCtxDestino.proximoOrden = Math.max(posicionCtxDestino.proximoOrden, espacioDestino);
  posicionCtxDestino.ordenesDisponibles.add(espacioDestino);

  return { advertencias: [], gondolaDestino, nivelDestino, espacioDestino };
}

// ─── Normalización por tipo de acción ─────────────────────────────────────────

function normalizarCrearGondola(item, ctx) {
  const advertencias = [];

  let orden = item.gondola_orden;
  if (orden == null) {
    orden = ctx.gondolaCtx.proximoOrden + 1;
  } else if (ctx.gondolaCtx.ordenesReservadas.has(orden)) {
    advertencias.push(`Ya hay otra acción para crear una góndola en el orden ${orden} en este borrador.`);
  }
  ctx.gondolaCtx.ordenesReservadas.add(orden);
  ctx.gondolaCtx.proximoOrden = Math.max(ctx.gondolaCtx.proximoOrden, orden);

  if (!item.nombre || !String(item.nombre).trim()) {
    advertencias.push('Falta el nombre de la góndola.');
  }

  const anchoCm = item.ancho_cm ?? DEFAULTS.gondola_ancho_cm;

  if (advertencias.length === 0) {
    ctx.gondolaCtx.ordenesDisponibles.add(orden);
    ctx.obtenerNivelCtx(orden);
    ctx.anchoCmPorGondola.set(orden, anchoCm);
    if (ctx.gondolaPrimeraOrden == null) ctx.gondolaPrimeraOrden = orden;
  }

  const normalizado = {
    tipo_accion: 'crear_gondola',
    gondola_orden: orden,
    nombre: item.nombre ?? null,
    ancho_cm: anchoCm,
    alto_cm: item.alto_cm ?? DEFAULTS.gondola_alto_cm,
    profundidad_cm: item.profundidad_cm ?? DEFAULTS.gondola_profundidad_cm,
    posicion_en_tienda: item.posicion_en_tienda ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarEditarGondola(item, ctx) {
  const check = resolverGondolaExistente(item.gondola_orden ?? null, ctx);
  const normalizado = {
    tipo_accion: 'editar_gondola',
    gondola_orden: item.gondola_orden ?? null,
    nombre: item.nombre ?? null,
    ancho_cm: item.ancho_cm ?? null,
    alto_cm: item.alto_cm ?? null,
    profundidad_cm: item.profundidad_cm ?? null,
    posicion_en_tienda: item.posicion_en_tienda ?? null,
  };
  if (!check.valido) normalizado.advertencia = check.mensaje;
  return normalizado;
}

function normalizarEliminarGondola(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const check = resolverGondolaExistente(gondolaOrden, ctx);
  if (check.valido) ctx.gondolaCtx.ordenesDisponibles.delete(gondolaOrden);

  const normalizado = { tipo_accion: 'eliminar_gondola', gondola_orden: gondolaOrden };
  if (!check.valido) normalizado.advertencia = check.mensaje;
  return normalizado;
}

function normalizarReordenarGondolas(item, ctx) {
  const advertencias = [];
  const ordenGondolas = Array.isArray(item.orden_gondolas) ? item.orden_gondolas : [];

  if (ordenGondolas.length === 0) {
    advertencias.push('Falta la lista de góndolas en el nuevo orden deseado.');
  } else {
    const desconocidas = ordenGondolas.filter((o) => !ctx.gondolaCtx.ordenesDisponibles.has(o));
    if (desconocidas.length > 0) {
      advertencias.push(`Las góndolas ${desconocidas.join(', ')} no existen todavía en este borrador.`);
    }
  }

  const normalizado = { tipo_accion: 'reordenar_gondolas', orden_gondolas: ordenGondolas };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarAgregarNivel(item, ctx) {
  const advertencias = [];

  let gondolaOrden = item.gondola_orden ?? null;
  if (gondolaOrden == null) gondolaOrden = ctx.gondolaPrimeraOrden;
  const gondola = resolverGondolaExistente(gondolaOrden, ctx);
  if (!gondola.valido) advertencias.push(gondola.mensaje);

  const nivelCtx = gondola.valido ? ctx.obtenerNivelCtx(gondolaOrden) : null;
  let orden = item.nivel_orden ?? null;
  if (nivelCtx) {
    if (orden == null) {
      orden = nivelCtx.proximoOrden + 1;
    } else if (nivelCtx.ordenesReservadas.has(orden)) {
      advertencias.push(`Ya hay otra acción para crear un nivel en el orden ${orden} de esta góndola en este borrador.`);
    }
    nivelCtx.ordenesReservadas.add(orden);
    nivelCtx.proximoOrden = Math.max(nivelCtx.proximoOrden, orden);
  }

  if (advertencias.length === 0 && nivelCtx) {
    nivelCtx.ordenesDisponibles.add(orden);
    ctx.obtenerPosicionCtx(gondolaOrden, orden);
  }

  // Default de ancho_disponible_cm: el ancho de la góndola que contiene este nivel (ver
  // ctx.anchoCmPorGondola en crearContextoNormalizacion) — si por algo no se pudo resolver la
  // góndola, cae al default general de Cemaco.
  const anchoDisponibleCm = item.ancho_disponible_cm
    ?? (gondola.valido ? ctx.anchoCmPorGondola.get(gondolaOrden) : undefined)
    ?? DEFAULTS.gondola_ancho_cm;

  const normalizado = {
    tipo_accion: 'agregar_nivel',
    gondola_orden: gondolaOrden,
    nivel_orden: orden,
    altura_desde_piso_cm: item.altura_desde_piso_cm ?? DEFAULTS.nivel_altura_desde_piso_cm,
    tipo_accesorio: item.tipo_accesorio ?? DEFAULTS.nivel_tipo_accesorio,
    codigo_accesorio_id: item.codigo_accesorio_id ?? null,
    tamano_accesorio_pulgadas: item.tamano_accesorio_pulgadas ?? null,
    ancho_disponible_cm: anchoDisponibleCm,
    notas: item.notas ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarEditarNivel(item, ctx) {
  const check = resolverNivelExistente(item.gondola_orden ?? null, item.nivel_orden ?? null, ctx);
  const normalizado = {
    tipo_accion: 'editar_nivel',
    gondola_orden: item.gondola_orden ?? null,
    nivel_orden: item.nivel_orden ?? null,
    altura_desde_piso_cm: item.altura_desde_piso_cm ?? null,
    tipo_accesorio: item.tipo_accesorio ?? null,
    codigo_accesorio_id: item.codigo_accesorio_id ?? null,
    tamano_accesorio_pulgadas: item.tamano_accesorio_pulgadas ?? null,
    ancho_disponible_cm: item.ancho_disponible_cm ?? null,
    notas: item.notas ?? null,
  };
  if (!check.valido) normalizado.advertencia = check.mensaje;
  return normalizado;
}

function normalizarEliminarNivel(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const check = resolverNivelExistente(gondolaOrden, nivelOrden, ctx);
  if (check.valido) check.nivelCtx.ordenesDisponibles.delete(nivelOrden);

  const normalizado = { tipo_accion: 'eliminar_nivel', gondola_orden: gondolaOrden, nivel_orden: nivelOrden };
  if (!check.valido) normalizado.advertencia = check.mensaje;
  return normalizado;
}

function normalizarReordenarNiveles(item, ctx) {
  const advertencias = [];
  const gondolaOrden = item.gondola_orden ?? null;
  const gondola = resolverGondolaExistente(gondolaOrden, ctx);
  if (!gondola.valido) advertencias.push(gondola.mensaje);

  const ordenNiveles = Array.isArray(item.orden_niveles) ? item.orden_niveles : [];
  if (ordenNiveles.length === 0) {
    advertencias.push('Falta la lista de niveles en el nuevo orden deseado.');
  } else if (gondola.valido) {
    const nivelCtx = ctx.obtenerNivelCtx(gondolaOrden);
    const desconocidos = ordenNiveles.filter((o) => !nivelCtx.ordenesDisponibles.has(o));
    if (desconocidos.length > 0) advertencias.push(`Los niveles ${desconocidos.join(', ')} no existen todavía en esta góndola.`);
  }

  const normalizado = { tipo_accion: 'reordenar_niveles', gondola_orden: gondolaOrden, orden_niveles: ordenNiveles };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

/** Normaliza "agregar_producto": aplica los defaults de siempre y resuelve — con default
 * incluido, a diferencia del resto de las acciones de producto — góndola (primera de la
 * versión), nivel (1) y espacio (siguiente libre) cuando el usuario no los da. */
function normalizarAgregarProducto(item, datosProducto, ctx) {
  const advertencias = [];

  if (!item.sku) {
    advertencias.push('Falta el SKU para esta acción de producto.');
  } else if (datosProducto.nombre == null) {
    advertencias.push('SKU no encontrado en el catálogo.');
  }

  let gondolaOrden = item.gondola_orden ?? null;
  if (gondolaOrden == null) gondolaOrden = ctx.gondolaPrimeraOrden;
  const gondola = resolverGondolaExistente(gondolaOrden, ctx);
  if (!gondola.valido) advertencias.push(gondola.mensaje);

  let nivelOrden = item.nivel_orden ?? null;
  if (nivelOrden == null) nivelOrden = 1;
  const nivelCtx = gondola.valido ? ctx.obtenerNivelCtx(gondolaOrden) : null;
  if (nivelCtx && !nivelCtx.ordenesDisponibles.has(nivelOrden)) {
    advertencias.push(`El nivel ${nivelOrden} no existe todavía en la góndola ${gondolaOrden} y no hay una acción previa para crearlo.`);
  }

  let espacioOrden = item.espacio_orden ?? null;
  const posicionCtx = nivelCtx && nivelCtx.ordenesDisponibles.has(nivelOrden) ? ctx.obtenerPosicionCtx(gondolaOrden, nivelOrden) : null;
  if (posicionCtx) {
    if (espacioOrden == null) espacioOrden = posicionCtx.proximoOrden + 1;
    posicionCtx.proximoOrden = Math.max(posicionCtx.proximoOrden, espacioOrden);
    posicionCtx.ordenesDisponibles.add(espacioOrden);
  }

  const normalizado = {
    tipo_accion: 'agregar_producto',
    sku: item.sku ?? '',
    nombre: datosProducto.nombre,
    marca: datosProducto.marca,
    gondola_orden: gondolaOrden,
    nivel_orden: nivelOrden,
    espacio_orden: espacioOrden,
    facings_horizontal: item.facings_horizontal ?? DEFAULTS.facings_horizontal,
    cantidad_apilable: item.cantidad_apilable ?? DEFAULTS.cantidad_apilable,
    unidades_por_facing: item.unidades_por_facing ?? DEFAULTS.unidades_por_facing,
    perfil_redondeo: item.perfil_redondeo ?? DEFAULTS.perfil_redondeo,
    modo: item.modo ?? DEFAULTS.modo,
    decision: item.decision ?? DEFAULTS.decision,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarEditarProducto(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const espacioOrden = item.espacio_orden ?? null;
  const check = resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx);

  const advertencias = [];
  if (!check.valido) advertencias.push(check.mensaje);
  if (item.desborda_gondola === true && !item.nota_desborde) {
    advertencias.push('Si el producto desborda la góndola hace falta una nota de desborde.');
  }

  const normalizado = {
    tipo_accion: 'editar_producto',
    gondola_orden: gondolaOrden,
    nivel_orden: nivelOrden,
    espacio_orden: espacioOrden,
    facings_horizontal: item.facings_horizontal ?? null,
    cantidad_apilable: item.cantidad_apilable ?? null,
    unidades_por_facing: item.unidades_por_facing ?? null,
    perfil_redondeo: item.perfil_redondeo ?? null,
    min_final: item.min_final ?? null,
    max_final: item.max_final ?? null,
    modo: item.modo ?? null,
    decision: item.decision ?? null,
    cross_externo: item.cross_externo ?? null,
    montar_en_display: item.montar_en_display ?? null,
    observaciones: item.observaciones ?? null,
    desborda_gondola: item.desborda_gondola ?? null,
    nota_desborde: item.nota_desborde ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarMoverProducto(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const espacioOrden = item.espacio_orden ?? null;
  const origen = resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx);
  const destino = resolverDestino(item, ctx);

  const advertencias = [...(origen.valido ? [] : [origen.mensaje]), ...destino.advertencias];
  if (origen.valido && destino.advertencias.length === 0) {
    origen.posicionCtx.ordenesDisponibles.delete(espacioOrden);
  }

  const normalizado = {
    tipo_accion: 'mover_producto',
    gondola_orden: gondolaOrden,
    nivel_orden: nivelOrden,
    espacio_orden: espacioOrden,
    gondola_orden_destino: destino.gondolaDestino,
    nivel_orden_destino: destino.nivelDestino,
    espacio_orden_destino: destino.espacioDestino,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarDuplicarProducto(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const espacioOrden = item.espacio_orden ?? null;
  const origen = resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx);
  const destino = resolverDestino(item, ctx);

  const advertencias = [...(origen.valido ? [] : [origen.mensaje]), ...destino.advertencias];

  const normalizado = {
    tipo_accion: 'duplicar_producto',
    gondola_orden: gondolaOrden,
    nivel_orden: nivelOrden,
    espacio_orden: espacioOrden,
    gondola_orden_destino: destino.gondolaDestino,
    nivel_orden_destino: destino.nivelDestino,
    espacio_orden_destino: destino.espacioDestino,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarEliminarProducto(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const espacioOrden = item.espacio_orden ?? null;
  const check = resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx);
  if (check.valido) check.posicionCtx.ordenesDisponibles.delete(espacioOrden);

  const normalizado = { tipo_accion: 'eliminar_producto', gondola_orden: gondolaOrden, nivel_orden: nivelOrden, espacio_orden: espacioOrden };
  if (!check.valido) normalizado.advertencia = check.mensaje;
  return normalizado;
}

function normalizarAgregarAccesorioPosicion(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const espacioOrden = item.espacio_orden ?? null;
  const check = resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx);

  const advertencias = [];
  if (!check.valido) advertencias.push(check.mensaje);
  if (!item.accesorio_codigo) advertencias.push('Falta el código del accesorio a agregar.');
  else if (!ctx.accesoriosDisponibles.has(item.accesorio_codigo)) advertencias.push(`El accesorio '${item.accesorio_codigo}' no existe en el catálogo.`);

  const normalizado = {
    tipo_accion: 'agregar_accesorio_posicion',
    gondola_orden: gondolaOrden,
    nivel_orden: nivelOrden,
    espacio_orden: espacioOrden,
    accesorio_codigo: item.accesorio_codigo ?? null,
    nota_libre: item.nota_libre ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarQuitarAccesorioPosicion(item, ctx) {
  const gondolaOrden = item.gondola_orden ?? null;
  const nivelOrden = item.nivel_orden ?? null;
  const espacioOrden = item.espacio_orden ?? null;
  const check = resolverPosicionExistente(gondolaOrden, nivelOrden, espacioOrden, ctx);

  const advertencias = [];
  if (!check.valido) advertencias.push(check.mensaje);
  if (!item.accesorio_codigo) advertencias.push('Falta el código del accesorio a quitar.');

  const normalizado = {
    tipo_accion: 'quitar_accesorio_posicion',
    gondola_orden: gondolaOrden,
    nivel_orden: nivelOrden,
    espacio_orden: espacioOrden,
    accesorio_codigo: item.accesorio_codigo ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarActualizarMedidasProducto(item) {
  const advertencias = [];
  if (!item.sku) advertencias.push('Falta el SKU del producto.');
  if (item.ancho_cm == null || item.alto_cm == null || item.profundidad_cm == null) {
    advertencias.push('Faltan medidas del producto (ancho, alto y/o profundidad) — hay que preguntárselas al usuario.');
  }

  const normalizado = {
    tipo_accion: 'actualizar_medidas_producto',
    sku: item.sku ?? '',
    ancho_cm: item.ancho_cm ?? null,
    alto_cm: item.alto_cm ?? null,
    profundidad_cm: item.profundidad_cm ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

function normalizarValidarDimensionesProducto(item) {
  const normalizado = { tipo_accion: 'validar_dimensiones_producto', sku: item.sku ?? '' };
  if (!item.sku) normalizado.advertencia = 'Falta el SKU del producto.';
  return normalizado;
}

/** Despacha cada acción cruda del borrador a su normalizador según `tipo_accion`. Mantiene el
 * mismo criterio ya usado antes de esta ampliación: nunca rechaza una acción por completo, solo
 * le agrega `advertencia` cuando algo falta o referencia algo que no existe — la fila queda
 * marcada como inválida en la UI de revisión y se excluye de la ejecución. */
function normalizarAccion(item, datosProducto, ctx) {
  switch (item.tipo_accion) {
    case 'crear_gondola':                 return normalizarCrearGondola(item, ctx);
    case 'editar_gondola':                return normalizarEditarGondola(item, ctx);
    case 'eliminar_gondola':              return normalizarEliminarGondola(item, ctx);
    case 'reordenar_gondolas':            return normalizarReordenarGondolas(item, ctx);
    case 'agregar_nivel':                 return normalizarAgregarNivel(item, ctx);
    case 'editar_nivel':                  return normalizarEditarNivel(item, ctx);
    case 'eliminar_nivel':                return normalizarEliminarNivel(item, ctx);
    case 'reordenar_niveles':             return normalizarReordenarNiveles(item, ctx);
    case 'agregar_producto':              return normalizarAgregarProducto(item, datosProducto, ctx);
    case 'editar_producto':               return normalizarEditarProducto(item, ctx);
    case 'mover_producto':                return normalizarMoverProducto(item, ctx);
    case 'duplicar_producto':             return normalizarDuplicarProducto(item, ctx);
    case 'eliminar_producto':             return normalizarEliminarProducto(item, ctx);
    case 'agregar_accesorio_posicion':    return normalizarAgregarAccesorioPosicion(item, ctx);
    case 'quitar_accesorio_posicion':     return normalizarQuitarAccesorioPosicion(item, ctx);
    case 'actualizar_medidas_producto':   return normalizarActualizarMedidasProducto(item);
    case 'validar_dimensiones_producto':  return normalizarValidarDimensionesProducto(item);
    default:                              return { tipo_accion: item.tipo_accion, advertencia: `Tipo de acción desconocido: ${item.tipo_accion}` };
  }
}

/**
 * @param {object} entrada
 * @param {string} entrada.mensaje
 * @param {Array<{rol: 'user'|'assistant', contenido: string}>} entrada.historial
 * @param {Array<object>} entrada.borradorActual
 * @param {{
 *   subcategorias?: string[],
 *   gondolas?: Array<{gondola_orden:number, nombre:string, total_niveles:number, ancho_cm:number}>,
 *   niveles?: Array<{gondola_orden:number, nivel_orden:number, tipo_accesorio:string}>,
 *   posiciones?: Array<{gondola_orden:number, nivel_orden:number, espacio_orden:number, sku:string, nombre:string|null}>,
 *   accesorios?: Array<{codigo:string, nombre:string, tipo:string}>,
 * }} entrada.contexto
 * @param {{openaiClient: object, catiClient: object}} dependencias
 */
async function procesarMensaje({ mensaje, historial = [], borradorActual = [], contexto = {} }, { openaiClient, catiClient }) {
  const mensajes = [
    { role: 'system', content: construirPromptSistema(contexto) },
    ...historial.map((m) => ({ role: m.rol === 'assistant' ? 'assistant' : 'user', content: m.contenido })),
  ];

  if (borradorActual.length > 0) {
    mensajes.push({ role: 'system', content: `Borrador acumulado hasta ahora: ${JSON.stringify(borradorActual)}` });
  }

  mensajes.push({ role: 'user', content: mensaje });

  const resultado = await openaiClient.completarConTools({
    mensajes,
    tools: [TOOL_BUSCAR_PRODUCTO],
    ejecutarTool: async (nombre, args) => {
      if (nombre !== 'buscar_producto') return { error: `Tool desconocida: ${nombre}` };
      return ejecutarBuscarProducto(catiClient, args.termino);
    },
    jsonSchema: SCHEMA_RESPUESTA,
  });

  const accionesCrudas = resultado.borrador ?? [];

  // Fase 1 (paralela, I/O): resolver nombre/marca contra CATI solo para las acciones "agregar_producto".
  const previoPorSku = new Map(
    borradorActual
      .filter((item) => item.tipo_accion === 'agregar_producto')
      .map((item) => [item.sku, item]),
  );
  const datosProductoPorIndice = await Promise.all(
    accionesCrudas.map((item) => (
      item.tipo_accion === 'agregar_producto' ? resolverDatosProducto(item, previoPorSku, catiClient) : null
    )),
  );

  // Fase 2 (síncrona, en el orden del array): normaliza acumulando qué góndolas/niveles/espacios
  // van a existir, y valida que cada acción referencie algo que ya existe o que se cree antes.
  const ctx = crearContextoNormalizacion(contexto);
  const borrador = accionesCrudas.map((item, indice) => normalizarAccion(item, datosProductoPorIndice[indice], ctx));

  return {
    mensajeAsistente: resultado.mensaje,
    borrador,
    listoParaConfirmar: Boolean(resultado.listo_para_confirmar),
  };
}

module.exports = { procesarMensaje };
