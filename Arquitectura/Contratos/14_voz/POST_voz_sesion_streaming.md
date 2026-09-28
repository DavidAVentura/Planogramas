# Contrato: Crear Sesión de Streaming de Voz

**Método:** `POST`
**Ruta:** `/api/v1/voz/sesion-streaming`
**Actor:** Analista
**Caso de uso:** Modo voz del chat del Agente extractor (dictado *Streaming*)

---

## Descripción

Genera un **secreto efímero** (`ek_…`) de la Realtime API de OpenAI para que el navegador abra un WebSocket de transcripción directo contra OpenAI sin ver nunca la API key. El audio viaja continuo (PCM16 a 24 kHz) y el propio servidor de OpenAI detecta los 3 s de silencio que disparan el auto-envío del mensaje.

---

## Request Body

Sin body.

---

## Reglas de negocio

1. Sesión de tipo `transcription`, formato `audio/pcm` a 24 kHz, modelo `gpt-4o-mini-transcribe`, idioma `es`.
2. Detección de turno `server_vad` con `silence_duration_ms: 3000`.
3. El secreto **vence a los 60 s** de creado: solo sirve para abrir la conexión, que después sigue sin él. El front pide uno nuevo por cada activación del micrófono.
4. El navegador envía el secreto como subprotocolo del WebSocket (`openai-insecure-api-key.{ek}`) porque no puede mandar headers.
5. Comparte el rate limit del módulo `voz`: 30 req/min por IP.

---

## Response — 200 OK

```json
{
  "value": "ek_68af2c...",
  "expira_en": 1790396021
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `value` | `string` | Secreto efímero `ek_…`. |
| `expira_en` | `integer` | Epoch en segundos en que vence el secreto. |

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `429 Too Many Requests` | Se superó el rate limit del módulo (`RATE_LIMITED`). |
| `503 Service Unavailable` | OpenAI no pudo crear la sesión (`SERVICE_UNAVAILABLE`). |

---

## Anotaciones de arquitectura

> **[SEGURIDAD]**
> El front conecta directo a `wss://api.openai.com`: si en algún momento se define una CSP con `connect-src` para el front, hay que incluir ese origen. Pendiente: exigir autenticación.
