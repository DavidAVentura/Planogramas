# Contrato: Sintetizar Voz (TTS)

**Método:** `POST`
**Ruta:** `/api/v1/voz/tts`
**Actor:** Analista
**Caso de uso:** Modo voz del chat del Agente extractor (lectura de respuestas)

---

## Descripción

Convierte a audio mp3 el texto de una respuesta del agente para leerla en voz alta. La usan el botón ▶ de cada mensaje y la autolectura del modo manos libres (cuando el mensaje del usuario se envió por voz).

---

## Request Body

```json
{
  "texto": "Agregué el SKU 10012345 con 3 facings en el nivel 2.",
  "voz": "fable",
  "velocidad": 1.7
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `texto` | `string` | Sí | Texto a leer. Se recorta a 4000 caracteres. |
| `voz` | `string` | No | `fable` \| `alloy` \| `echo`. Default `fable`. |
| `velocidad` | `number` | No | Entre `1` y `2`. Default `1.7`. |

---

## Reglas de negocio

1. Whitelist de voces y rango de velocidad **idénticos** a los del front (`front/src/config/preferenciasVoz.ts`).
2. Modelo `gpt-4o-mini-tts`, formato mp3, timeout 20 s, sin reintentos (el usuario puede reintentar con ▶).
3. Comparte el rate limit del módulo `voz`: 30 req/min por IP.

---

## Response — 200 OK

Body **binario** con `Content-Type: audio/mpeg` (no JSON). Los errores sí llegan como JSON estándar.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Falta `texto`, `voz` fuera de la whitelist o `velocidad` fuera de 1–2. |
| `429 Too Many Requests` | Se superó el rate limit del módulo (`RATE_LIMITED`). |
| `503 Service Unavailable` | OpenAI no pudo generar el audio (`SERVICE_UNAVAILABLE`). |

```json
// 400
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": ["\"voz\" must be one of [fable, alloy, echo]"]
  }
}
```

---

## Anotaciones de arquitectura

> **[COSTO]**
> Cobra por carácter: el tope de 4000 caracteres evita respuestas largas costosas. Pendiente: exigir autenticación.
