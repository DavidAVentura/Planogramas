# Contrato: Transcribir Audio

**Método:** `POST`
**Ruta:** `/api/v1/voz/transcribir`
**Actor:** Analista
**Caso de uso:** Modo voz del chat del Agente extractor (dictado *Segmentado*)

---

## Descripción

Transcribe a texto un segmento corto de audio (~2.75 s) grabado con `MediaRecorder` en el navegador. Lo usa el dictado *Segmentado*: el front graba tramos encadenados y llama a este endpoint por cada uno. Sin persistencia.

---

## Request Body

```json
{
  "audio_base64": "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYEC..."
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `audio_base64` | `string` | Sí | Audio en base64 puro (sin el prefijo `data:...;base64,`). Formatos aceptados: webm, ogg, wav, mp4. |

---

## Reglas de negocio

1. El tipo de audio se valida por los **magic bytes** del contenido decodificado, no por lo que declare el cliente. Si no es webm/ogg/wav/mp4 → `400`.
2. El tamaño lo limita el tope global del body JSON (`express.json({ limit: '8mb' })`).
3. Modelo `gpt-4o-mini-transcribe`, idioma `es`, timeout 8 s, **sin reintentos**: perder un segmento no se nota y un backoff frenaría el dictado en vivo.
4. Comparte el rate limit del módulo `voz`: 30 req/min por IP.

---

## Response — 200 OK

```json
{ "texto": "añade el SKU 10012345 con tres facings" }
```

`texto` puede venir vacío si el segmento no tenía voz.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Falta `audio_base64`, no es base64, o el contenido no es un audio reconocible. |
| `413 Payload Too Large` | El body supera 8 MB (lo corta `express.json`). |
| `429 Too Many Requests` | Se superó el rate limit del módulo (`RATE_LIMITED`). |
| `503 Service Unavailable` | OpenAI no respondió o rechazó el audio (`SERVICE_UNAVAILABLE`). |

```json
// 400
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El archivo no es un audio reconocible"
  }
}
```

---

## Anotaciones de arquitectura

> **[SEGURIDAD]**
> La API key de OpenAI nunca sale del backend. Pendiente: exigir autenticación (el endpoint consume créditos de OpenAI).
