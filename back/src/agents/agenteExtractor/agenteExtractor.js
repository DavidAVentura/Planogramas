/**
 * agenteExtractor.js
 * Agente Extractor del Planograma: conversa con el analista para recolectar, mensaje a
 * mensaje, la lista de productos que quiere añadir al planograma abierto en el editor. Sin
 * persistencia — el historial y el borrador acumulado viajan completos en cada request (ver
 * agenteExtractor.controller.js), este módulo solo orquesta la conversación con OpenAI y
 * normaliza el resultado.
 */

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

const ITEM_BORRADOR_SCHEMA = {
  type: 'object',
  properties: {
    sku: { type: 'string' },
    nivel_orden: { type: ['integer', 'null'] },
    espacio_orden: { type: ['integer', 'null'] },
    facings_horizontal: { type: ['integer', 'null'] },
    cantidad_apilable: { type: ['integer', 'null'] },
    unidades_por_facing: { type: ['integer', 'null'] },
    perfil_redondeo: { type: ['string', 'null'], enum: ['MRP', 'ZSRE', null] },
    modo: { type: ['string', 'null'], enum: ['PLANOGRAMA', 'CROSS', null] },
    decision: { type: ['string', 'null'], enum: ['ACTIVO', 'INACTIVO', null] },
  },
  required: [
    'sku', 'nivel_orden', 'espacio_orden', 'facings_horizontal', 'cantidad_apilable',
    'unidades_por_facing', 'perfil_redondeo', 'modo', 'decision',
  ],
  additionalProperties: false,
};

const SCHEMA_RESPUESTA = {
  name: 'respuesta_agente_extractor',
  schema: {
    type: 'object',
    properties: {
      mensaje: { type: 'string' },
      borrador: { type: 'array', items: ITEM_BORRADOR_SCHEMA },
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

  return `Eres el "Agente Extractor del Planograma" de Cemaco. Conversas con un analista para
recolectar, mensaje a mensaje, la lista de productos que quiere añadir al planograma que tiene
abierto en el editor.

Reglas:
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
- El borrador se acumula: en cada respuesta debes incluir TODOS los productos ya recolectados en la
  conversación (los de antes + los nuevos o corregidos en este mensaje), no solo los nuevos.
- Pregunta explícitamente si el usuario quiere seguir añadiendo productos o si ya quiere confirmar
  la lista. Marca listo_para_confirmar=true únicamente cuando el usuario diga explícitamente que ya
  terminó de añadir productos.
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

/** Reutiliza la validación ya hecha en un turno anterior para el mismo SKU (evita golpear CATI
 * de nuevo por cada item en cada turno, ya que el borrador se reenvía completo siempre). */
async function normalizarItemBorrador(item, previoPorSku, catiClient) {
  const previo = previoPorSku.get(item.sku);
  let nombre = previo?.nombre ?? null;
  let marca = previo?.marca ?? null;
  let advertencia = previo?.advertencia;

  if (!previo) {
    const detalle = await catiClient.obtenerProducto(item.sku).catch(() => null);
    nombre = detalle?.nombre ?? null;
    marca = detalle?.marca ?? null;
    advertencia = detalle ? undefined : 'SKU no encontrado en el catálogo';
  }

  const normalizado = {
    sku: item.sku,
    nombre,
    marca,
    nivel_orden: item.nivel_orden ?? undefined,
    espacio_orden: item.espacio_orden ?? undefined,
    facings_horizontal: item.facings_horizontal ?? DEFAULTS.facings_horizontal,
    cantidad_apilable: item.cantidad_apilable ?? DEFAULTS.cantidad_apilable,
    unidades_por_facing: item.unidades_por_facing ?? DEFAULTS.unidades_por_facing,
    perfil_redondeo: item.perfil_redondeo ?? DEFAULTS.perfil_redondeo,
    modo: item.modo ?? DEFAULTS.modo,
    decision: item.decision ?? DEFAULTS.decision,
  };
  if (advertencia) normalizado.advertencia = advertencia;
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

  const previoPorSku = new Map(borradorActual.map((item) => [item.sku, item]));
  const borrador = await Promise.all(
    (resultado.borrador ?? []).map((item) => normalizarItemBorrador(item, previoPorSku, catiClient)),
  );

  return {
    mensajeAsistente: resultado.mensaje,
    borrador,
    listoParaConfirmar: Boolean(resultado.listo_para_confirmar),
  };
}

module.exports = { procesarMensaje };
