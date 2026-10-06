/**
 * openaiClient.js
 * Wrapper compartido sobre el SDK de OpenAI para todos los agentes de esta carpeta.
 * Corre el loop de tool calling: si el modelo pide ejecutar una tool, la ejecuta y le devuelve
 * el resultado, hasta que el modelo entrega un mensaje final que cumple el json_schema pedido.
 */

const OpenAI = require('openai');
const env = require('../config/env');

let cliente = null;

function obtenerCliente() {
  if (!cliente) cliente = new OpenAI({ apiKey: env.openai.apiKey });
  return cliente;
}

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

/**
 * @param {object} opciones
 * @param {Array<{role: string, content: string}>} opciones.mensajes
 * @param {Array<object>} [opciones.tools] - definiciones de tools en formato OpenAI (function calling)
 * @param {(nombre: string, args: object) => Promise<object>} [opciones.ejecutarTool]
 * @param {{name: string, schema: object}} opciones.jsonSchema - schema strict de la respuesta final
 * @param {number} [opciones.maxVueltas]
 * @returns {Promise<object>} - objeto ya parseado que cumple jsonSchema
 */
async function completarConTools({ mensajes, tools = [], ejecutarTool, jsonSchema, maxVueltas = 5 }) {
  const openai = obtenerCliente();
  const historial = [...mensajes];

  for (let vuelta = 0; vuelta < maxVueltas; vuelta += 1) {
    let respuesta;
    try {
      respuesta = await openai.chat.completions.create({
        model: env.openai.model,
        messages: historial,
        ...(tools.length > 0 && { tools }),
        response_format: {
          type: 'json_schema',
          json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
        },
      });
    } catch (err) {
      throw errorServicioNoDisponible('No se pudo conectar con OpenAI', err);
    }

    const mensaje = respuesta.choices?.[0]?.message;
    if (!mensaje) throw errorServicioNoDisponible('OpenAI no devolvió ninguna respuesta');

    const toolCalls = mensaje.tool_calls ?? [];
    if (toolCalls.length === 0) {
      try {
        return JSON.parse(mensaje.content);
      } catch (err) {
        throw errorServicioNoDisponible('OpenAI devolvió una respuesta que no es JSON válido', err);
      }
    }

    historial.push(mensaje);
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments || '{}');
      const resultado = await ejecutarTool(toolCall.function.name, args);
      historial.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(resultado ?? null),
      });
    }
  }

  throw errorServicioNoDisponible('El agente no llegó a una respuesta final tras varias vueltas de herramientas');
}

/**
 * Llamada de una sola vuelta con una imagen (visión) — sin loop de tools, para agentes que solo
 * necesitan interpretar una imagen y devolver un JSON que cumpla `jsonSchema`.
 * @param {object} opciones
 * @param {string} opciones.instrucciones - prompt de sistema
 * @param {string} opciones.imagenBase64 - imagen en base64 puro (sin el prefijo data:...;base64,)
 * @param {string} opciones.mimeType - ej. 'image/jpeg'
 * @param {{name: string, schema: object}} opciones.jsonSchema - schema strict de la respuesta final
 * @returns {Promise<object>} - objeto ya parseado que cumple jsonSchema
 */
async function completarConImagen({ instrucciones, imagenBase64, mimeType, jsonSchema }) {
  const openai = obtenerCliente();

  let respuesta;
  try {
    respuesta = await openai.chat.completions.create({
      model: env.openai.model,
      messages: [
        { role: 'system', content: instrucciones },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza esta foto del mueble y devuelve el resumen en el formato pedido.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imagenBase64}`, detail: 'high' } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
      },
    });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con OpenAI', err);
  }

  const mensaje = respuesta.choices?.[0]?.message;
  if (!mensaje?.content) throw errorServicioNoDisponible('OpenAI no devolvió ninguna respuesta');

  try {
    return JSON.parse(mensaje.content);
  } catch (err) {
    throw errorServicioNoDisponible('OpenAI devolvió una respuesta que no es JSON válido', err);
  }
}

/** Los modelos de razonamiento (gpt-5 / o-series) aceptan `reasoning_effort`; el resto lo rechaza. */
function soportaRazonamiento(modelo) {
  return /^(gpt-5|o\d)/.test(modelo);
}

/**
 * Llamada de una sola vuelta con un archivo adjunto (ej. un PDF) — el modelo recibe el texto y
 * la imagen de cada página. Usa su propio modelo (`modelo`), normalmente uno más grande que el
 * del chat, porque leer un layout completo exige más capacidad visual.
 * @param {object} opciones
 * @param {string} opciones.instrucciones - prompt de sistema
 * @param {string} opciones.texto - instrucción del mensaje de usuario que acompaña al archivo
 * @param {string} opciones.archivoBase64 - archivo en base64 puro (sin el prefijo data:...;base64,)
 * @param {string} opciones.nombreArchivo
 * @param {string} opciones.mimeType - ej. 'application/pdf'
 * @param {{name: string, schema: object}} opciones.jsonSchema - schema strict de la respuesta final
 * @param {string} opciones.modelo
 * @param {string} [opciones.razonamiento] - reasoning_effort, solo si el modelo lo soporta
 * @returns {Promise<object>} - objeto ya parseado que cumple jsonSchema
 */
async function completarConArchivo({ instrucciones, texto, archivoBase64, nombreArchivo, mimeType, jsonSchema, modelo, razonamiento }) {
  const openai = obtenerCliente();

  let respuesta;
  try {
    respuesta = await openai.chat.completions.create({
      model: modelo,
      ...(razonamiento && soportaRazonamiento(modelo) && { reasoning_effort: razonamiento }),
      messages: [
        { role: 'system', content: instrucciones },
        {
          role: 'user',
          content: [
            { type: 'text', text: texto },
            { type: 'file', file: { filename: nombreArchivo, file_data: `data:${mimeType};base64,${archivoBase64}` } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
      },
    });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con OpenAI', err);
  }

  const mensaje = respuesta.choices?.[0]?.message;
  if (mensaje?.refusal) throw errorServicioNoDisponible(`OpenAI rechazó analizar el archivo: ${mensaje.refusal}`);
  if (!mensaje?.content) throw errorServicioNoDisponible('OpenAI no devolvió ninguna respuesta');

  try {
    return JSON.parse(mensaje.content);
  } catch (err) {
    throw errorServicioNoDisponible('OpenAI devolvió una respuesta que no es JSON válido', err);
  }
}

module.exports = { completarConTools, completarConImagen, completarConArchivo, obtenerCliente, errorServicioNoDisponible };
