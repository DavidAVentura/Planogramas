/**
 * agenteExtractor.js
 * Agente Extractor del Planograma: conversa con el analista para recolectar, mensaje a
 * mensaje, una lista ordenada de acciones a aplicar al planograma abierto en el editor —
 * agregar productos y/o crear niveles nuevos. Sin persistencia — el historial y el borrador
 * acumulado viajan completos en cada request (ver agenteExtractor.controller.js), este módulo
 * solo orquesta la conversación con OpenAI y normaliza el resultado.
 */

const { TIPOS_ACCESORIO } = require('../../domain/nivel/nivel.entity');

// Mismos valores por defecto que usa "Elegir producto" desde catálogo
// (ver front/src/components/dominio/modales/ElegirProductoModal/ElegirProductoModal.tsx).
const DEFAULTS = {
  ancho_asignado_cm: 1,
  capacidad_maxima: 1,
  facings_horizontal: 1,
  cantidad_apilable: 1,
  unidades_por_facing: 1,
  perfil_redondeo: 'MRP',
  modo: 'PLANOGRAMA',
  decision: 'ACTIVO',
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
 * los demás campos aplican (los del otro tipo van en null). Se mantiene plano (sin anyOf/unión
 * discriminada) porque OpenAI Structured Outputs en modo strict exige que cada rama de un anyOf
 * declare igual `required`/`additionalProperties:false`, así que no ahorra código frente a esto,
 * y la normalización de más abajo necesita el mismo switch por tipo de cualquier forma.
 */
const ACCION_SCHEMA = {
  type: 'object',
  properties: {
    tipo_accion: { type: 'string', enum: ['agregar_nivel', 'agregar_producto'] },
    // Campos de "agregar_nivel" (null si tipo_accion === 'agregar_producto').
    // nivel_orden se comparte entre ambos tipos: para agregar_nivel es el orden del nivel a
    // crear; para agregar_producto es el orden del nivel destino donde insertar el producto.
    nivel_orden: { type: ['integer', 'null'] },
    altura_desde_piso_cm: { type: ['number', 'null'] },
    tipo_accesorio: { type: ['string', 'null'], enum: [...TIPOS_ACCESORIO, null] },
    codigo_accesorio_id: { type: ['integer', 'null'] },
    tamano_accesorio_pulgadas: { type: ['number', 'null'] },
    ancho_disponible_cm: { type: ['number', 'null'] },
    notas: { type: ['string', 'null'] },
    // Campos de "agregar_producto" (null si tipo_accion === 'agregar_nivel').
    sku: { type: ['string', 'null'] },
    espacio_orden: { type: ['integer', 'null'] },
    facings_horizontal: { type: ['integer', 'null'] },
    cantidad_apilable: { type: ['integer', 'null'] },
    unidades_por_facing: { type: ['integer', 'null'] },
    perfil_redondeo: { type: ['string', 'null'], enum: ['MRP', 'ZSRE', null] },
    modo: { type: ['string', 'null'], enum: ['PLANOGRAMA', 'CROSS', null] },
    decision: { type: ['string', 'null'], enum: ['ACTIVO', 'INACTIVO', null] },
  },
  required: [
    'tipo_accion', 'nivel_orden', 'altura_desde_piso_cm', 'tipo_accesorio', 'codigo_accesorio_id',
    'tamano_accesorio_pulgadas', 'ancho_disponible_cm', 'notas', 'sku', 'espacio_orden',
    'facings_horizontal', 'cantidad_apilable', 'unidades_por_facing', 'perfil_redondeo', 'modo',
    'decision',
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

function construirPromptSistema(contexto) {
  const niveles = contexto?.niveles ?? [];
  const subcategorias = contexto?.subcategorias ?? [];
  const nivelesTexto = niveles.length > 0
    ? niveles.map((n) => `nivel ${n.orden}${n.nombre ? ` (${n.nombre})` : ''}`).join(', ')
    : 'sin niveles registrados todavía';
  const subcategoriasTexto = subcategorias.length > 0 ? subcategorias.join(', ') : 'sin subcategorías definidas';
  const tiposAccesorioTexto = TIPOS_ACCESORIO.join(', ');

  return `Eres el "Agente Extractor del Planograma" de Cemaco. Conversas con un analista para
recolectar, mensaje a mensaje, la lista de acciones que quiere aplicar al planograma que tiene
abierto en el editor.

Cada acción del borrador tiene un tipo (tipo_accion):
- "agregar_producto": agrega un producto (por SKU) a un nivel de la góndola.
- "agregar_nivel": crea un nivel nuevo en la góndola (por ejemplo cuando hace falta un nivel que
  todavía no existe para poder insertarle productos).

El array "borrador" representa el ORDEN REAL en que se van a ejecutar las acciones. Si hace falta
insertar productos en un nivel que no existe todavía (ni está en la lista de niveles disponibles ni
en una acción "agregar_nivel" que ya hayas puesto antes en este mismo borrador), primero agrega la
acción "agregar_nivel" para ese nivel, y recién después las acciones "agregar_producto" que lo
referencian — siempre en ese orden dentro del array, nunca al revés.

Reglas para "agregar_producto":
- Cada producto necesita un SKU válido. Si el usuario no da un SKU exacto sino una descripción
  (nombre, marca), usa la herramienta buscar_producto para resolverlo; si hay varios candidatos,
  pregúntale cuál es antes de darlo por confirmado. Nunca inventes un SKU.
- Si el usuario da un SKU pero no da atributos (facings, apilable, unidades por facing, perfil de
  redondeo, modo, decisión), pregúntale en tu mensaje si quiere usar los valores por defecto (1
  facing, 1 apilable, 1 unidad por facing, perfil MRP, modo PLANOGRAMA, decisión ACTIVO — los
  mismos que usa "Elegir producto" desde catálogo). Si en su siguiente respuesta no da valores
  distintos, asume que sí quiere los valores por defecto.
- Si el usuario da nivel y/o espacio para un producto, guárdalos en nivel_orden/espacio_orden. Si
  no los da, déjalos en null — se completan automáticamente con el nivel 1 y el siguiente espacio
  libre al momento de confirmar.

Reglas para "agregar_nivel":
- altura_desde_piso_cm, tipo_accesorio (uno de: ${tiposAccesorioTexto}) y ancho_disponible_cm son
  obligatorios y NO tienen un valor por defecto razonable — son medidas físicas del mueble real. Si
  el usuario no te los da explícitamente, PREGÚNTASELOS antes de dar la acción por completa; nunca
  los inventes ni asumas un valor por defecto para estos tres campos.
- codigo_accesorio_id, tamano_accesorio_pulgadas y notas son opcionales — dejalos en null si no
  aplican o el usuario no los mencionó.
- Si el usuario no especifica en qué posición (nivel_orden) va el nivel nuevo, no hace falta que se
  lo preguntes: dejalo en null y el sistema lo coloca automáticamente al final.

Reglas generales:
- El borrador se acumula: en cada respuesta debes incluir TODAS las acciones ya recolectadas en la
  conversación (las de antes + las nuevas o corregidas en este mensaje), no solo las nuevas.
- Pregunta explícitamente si el usuario quiere seguir agregando acciones o si ya quiere confirmar la
  lista. Marca listo_para_confirmar=true únicamente cuando el usuario diga explícitamente que ya
  terminó.
- Niveles disponibles en la góndola activa: ${nivelesTexto}.
- Subcategorías de referencia de este planograma: ${subcategoriasTexto}.
- Responde siempre en español, en tono breve y directo.`;
}

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
 * se corre en paralelo para todas las acciones de producto antes de la fase de orden. */
async function resolverDatosProducto(item, previoPorSku, catiClient) {
  if (!item.sku) return { nombre: null, marca: null };

  const previo = previoPorSku.get(item.sku);
  if (previo) return { nombre: previo.nombre ?? null, marca: previo.marca ?? null };

  const detalle = await catiClient.obtenerProducto(item.sku).catch(() => null);
  return { nombre: detalle?.nombre ?? null, marca: detalle?.marca ?? null };
}

/** Contexto mutable de la fase 2 (síncrona, en orden) de normalización: rastrea qué órdenes de
 * nivel van a existir a medida que se procesan las acciones "agregar_nivel" del borrador, para
 * poder validar las acciones "agregar_producto" que las referencian. */
function crearContextoNormalizacion(contexto) {
  const niveles = contexto?.niveles ?? [];
  return {
    ordenesDisponibles: new Set(niveles.map((n) => n.orden)),
    ordenesReservadas: new Set(),
    proximoOrdenNivel: niveles.length,
  };
}

/** Normaliza una acción "agregar_nivel": resuelve el orden final (si no vino dado, el siguiente
 * disponible) y valida que tenga los datos obligatorios para poder crearse — sin default posible
 * para altura/tipo de accesorio/ancho, a diferencia de los atributos de producto. */
function normalizarAccionNivel(item, ctx) {
  const advertencias = [];

  let orden = item.nivel_orden;
  if (orden == null) {
    orden = ctx.proximoOrdenNivel + 1;
  } else if (ctx.ordenesReservadas.has(orden)) {
    advertencias.push(`Ya hay otra acción para crear un nivel en el orden ${orden} en este borrador.`);
  }

  ctx.ordenesReservadas.add(orden);
  ctx.proximoOrdenNivel = Math.max(ctx.proximoOrdenNivel, orden);

  if (item.altura_desde_piso_cm == null || item.tipo_accesorio == null || item.ancho_disponible_cm == null) {
    advertencias.push(
      'Faltan datos para crear este nivel (altura, tipo de accesorio y/o ancho disponible) — hay que preguntárselos al usuario.',
    );
  }

  if (advertencias.length === 0) ctx.ordenesDisponibles.add(orden);

  const normalizado = {
    tipo_accion: 'agregar_nivel',
    orden,
    altura_desde_piso_cm: item.altura_desde_piso_cm ?? null,
    tipo_accesorio: item.tipo_accesorio ?? null,
    codigo_accesorio_id: item.codigo_accesorio_id ?? null,
    tamano_accesorio_pulgadas: item.tamano_accesorio_pulgadas ?? null,
    ancho_disponible_cm: item.ancho_disponible_cm ?? null,
    notas: item.notas ?? null,
  };
  if (advertencias.length > 0) normalizado.advertencia = advertencias.join(' ');
  return normalizado;
}

/** Normaliza una acción "agregar_producto": aplica los defaults de siempre y valida que el nivel
 * que referencia (si lo hace) ya exista o vaya a existir por una acción previa en el borrador. */
function normalizarAccionProducto(item, datosProducto, ctx) {
  const advertencias = [];

  if (!item.sku) {
    advertencias.push('Falta el SKU para esta acción de producto.');
  } else if (datosProducto.nombre == null) {
    advertencias.push('SKU no encontrado en el catálogo.');
  }

  if (item.nivel_orden != null && !ctx.ordenesDisponibles.has(item.nivel_orden)) {
    advertencias.push(`El nivel ${item.nivel_orden} no existe todavía y no hay una acción previa para crearlo.`);
  }

  const normalizado = {
    tipo_accion: 'agregar_producto',
    sku: item.sku ?? '',
    nombre: datosProducto.nombre,
    marca: datosProducto.marca,
    nivel_orden: item.nivel_orden ?? undefined,
    espacio_orden: item.espacio_orden ?? undefined,
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

/**
 * @param {object} entrada
 * @param {string} entrada.mensaje
 * @param {Array<{rol: 'user'|'assistant', contenido: string}>} entrada.historial
 * @param {Array<object>} entrada.borradorActual
 * @param {{subcategorias?: string[], niveles?: Array<{id:number, orden:number, nombre?:string}>}} entrada.contexto
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

  // Fase 1 (paralela, I/O): resolver nombre/marca contra CATI solo para las acciones de producto.
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

  // Fase 2 (síncrona, en el orden del array): normaliza acumulando qué niveles van a existir.
  const ctx = crearContextoNormalizacion(contexto);
  const borrador = accionesCrudas.map((item, indice) => (
    item.tipo_accion === 'agregar_nivel'
      ? normalizarAccionNivel(item, ctx)
      : normalizarAccionProducto(item, datosProductoPorIndice[indice], ctx)
  ));

  return {
    mensajeAsistente: resultado.mensaje,
    borrador,
    listoParaConfirmar: Boolean(resultado.listo_para_confirmar),
  };
}

module.exports = { procesarMensaje };
