/**
 * extractorImagenNumerada.js
 * Agente Extractor de Imagen Numerada: recibe una foto de un mueble/rack ya montado en tienda,
 * donde cada posición física está marcada con un número de gancho (impreso en la góndola real) y
 * el SKU correspondiente, y la convierte en una estructura de niveles → productos → facings
 * horizontales. Solo interpreta la imagen — no resuelve SKUs contra el catálogo ni decide
 * acciones sobre el planograma; ese trabajo lo hace el Agente Extractor de texto
 * (back/src/agents/agenteExtractor) cuando reciba el resumen como mensaje de chat.
 */

const SCHEMA_RESPUESTA = {
  name: 'respuesta_extractor_imagen_numerada',
  schema: {
    type: 'object',
    properties: {
      niveles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nivel_orden: { type: 'integer' },
            productos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  ganchos: { type: 'array', items: { type: 'integer' } },
                  facings_horizontal: { type: 'integer' },
                },
                required: ['sku', 'ganchos', 'facings_horizontal'],
                additionalProperties: false,
              },
            },
          },
          required: ['nivel_orden', 'productos'],
          additionalProperties: false,
        },
      },
      advertencias: { type: 'array', items: { type: 'string' } },
    },
    required: ['niveles', 'advertencias'],
    additionalProperties: false,
  },
};

const PROMPT_SISTEMA = `Eres el "Agente Extractor de Imagen Numerada" de Cemaco. Recibes una foto de un
mueble/rack de tienda ya montado, donde cada posición física tiene impreso un número de gancho y
un SKU (código de producto), y tu única tarea es convertir lo que ves en una estructura de datos.

## Reglas del dominio

- El número de gancho es único en TODA la góndola de la foto — nunca se repite entre niveles, a
  diferencia de la posición dentro de un nivel en otros sistemas. No lo confundas con un orden
  local al nivel.
- Cuando un producto ocupa varios facings horizontales, cada facing tiene SU PROPIO número de
  gancho, todos mostrando el mismo SKU. Agrupa los ganchos consecutivos que muestran el mismo SKU
  dentro de la misma fila/nivel en un solo producto: \`facings_horizontal\` = cantidad de ganchos
  agrupados, y \`ganchos\` = la lista de esos números (en el orden en que aparecen, de izquierda a
  derecha).
- Agrupa los ganchos en niveles usando su posición vertical en la foto (las filas/rieles físicos
  de la góndola — apóyate en líneas de la estructura, en la regla de altura si es visible, o en
  cualquier separación visual clara entre filas).
- Numera \`nivel_orden\` de ABAJO hacia ARRIBA empezando en 1 (el nivel más bajo de la foto es el
  nivel 1, el siguiente hacia arriba el nivel 2, y así sucesivamente) — es la misma convención que
  ya usa el sistema para los niveles de una góndola.
- Dentro de cada nivel, ordena \`productos\` de izquierda a derecha según sus números de gancho.
- Si un gancho no tiene un SKU legible, o hay una ambigüedad que no puedas resolver con confianza
  (ej. no queda claro si dos ganchos son el mismo producto o dos productos distintos), NO inventes
  el dato — omite ese gancho del resultado y describe el problema en \`advertencias\` (ej. "el
  gancho 12 no tiene SKU legible").
- No calcules ni asumas nada sobre facings verticales (apilado), tipo de accesorio, medidas físicas
  ni ningún otro atributo — tu única salida es niveles, SKUs por nivel y facings horizontales.`;

/**
 * @param {object} entrada
 * @param {string} entrada.imagenBase64 - imagen en base64 puro (sin el prefijo data:...;base64,)
 * @param {string} entrada.mimeType - ej. 'image/jpeg'
 * @param {{openaiClient: object}} dependencias
 */
async function procesarImagen({ imagenBase64, mimeType }, { openaiClient }) {
  const resultado = await openaiClient.completarConImagen({
    instrucciones: PROMPT_SISTEMA,
    imagenBase64,
    mimeType,
    jsonSchema: SCHEMA_RESPUESTA,
  });

  const niveles = (resultado.niveles ?? []).map((nivel) => ({
    nivel_orden: nivel.nivel_orden,
    productos: (nivel.productos ?? []).map((producto) => ({
      sku: producto.sku,
      ganchos: producto.ganchos ?? [],
      facings_horizontal: producto.facings_horizontal ?? (producto.ganchos ?? []).length,
    })),
  }));

  return { niveles, advertencias: resultado.advertencias ?? [] };
}

module.exports = { procesarImagen };
