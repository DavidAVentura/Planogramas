# PLAN: Modo voz en el chat del Agente extractor

> Estado: **implementado (2026-09-25)**, falta la prueba manual en navegador con micrófono y la autenticación.
> Basado en `guia-modo-voz-openai.md`.
>
> Desvíos respecto al plan original:
> - No hay chequeo propio de 8 MB ni código `PAYLOAD_TOO_LARGE`: `express.json({ limit: '8mb' })` corta antes
>   (413 genérico). El 429 lo responde directamente el handler del limiter; no se tocó `STATUS_MAP`.
> - Los errores de voz y de lectura se muestran con `mostrarToast`, como el resto del chat.
> - El colapso del panel desmonta `AgenteExtractorChat`, así que el cleanup de los hooks ya detiene mic y lectura;
>   solo "Reestablecer" llama a `detenerLectura()` explícitamente.
> - Tocar el mic mientras se lee una respuesta corta la lectura y empieza a dictar.
> - El modo voz solo se muestra en el **Lienzo** (`LienzoPlanograma`): prop `modoVoz` en `AgenteExtractorBubble`
>   → `AgenteExtractorChat`, por defecto `false`. El Editor usa el mismo chat sin micrófono ni botón ▶.
> - **Narración separada del mensaje**: el agente devuelve `narracion_asistente` (1–2 oraciones habladas) además
>   de `mensaje_asistente`. El TTS (autolectura y ▶) lee la narración; los mensajes guardados sin ella caen a
>   `markdownATexto(contenido)`. Se agregó al prompt la regla "nunca anuncies una tabla que no incluyes"
>   (gpt-4o-mini a veces decía "aquí están los detalles" sin tabla, también antes de este cambio).
> Este archivo es solo documentación: se commitea aparte de los cambios de código (convención de `CLAUDE.md`).

## Contexto

El chat del **Agente extractor del planograma** (`front/src/components/dominio/editor/AgenteExtractorChat/`)
hoy solo acepta texto. El analista trabaja frente al mueble con las manos ocupadas, así que se quiere
el modo voz de la guía `guia-modo-voz-openai.md` (lumiere):

- botón de micrófono con dictado en vivo y **auto-envío tras 3 s de silencio**;
- **lectura en voz alta** de la respuesta del agente y **reactivación automática del mic** (manos libres);
- botón ▶/■ por mensaje del asistente;
- modal de ajustes: dictado *Segmentado/Streaming*, lectura *OpenAI/Navegador*, voz `fable|alloy|echo`,
  velocidad 1.0–2.0x, persistido en `localStorage`.

La guía se adapta a lo que ya existe en el repo, no se copia literal:

| La guía asume | En este repo hay | Decisión |
|---|---|---|
| axios | `fetch` en `front/src/services/httpClient.ts` (siempre JSON) | Extender `httpClient` con `postBinario` (respuesta Blob). No se agrega axios |
| zod | Joi, validado dentro del controller (`validarBody`) | Joi |
| multer + multipart | Los archivos viajan en base64 dentro de JSON (`express.json({limit:'8mb'})`) | `/voz/transcribir` recibe `{ audio_base64 }` y **sí** se validan los magic bytes. No se agrega multer |
| `{ ok, data }` / `{ ok:false, message, code }` | `{ error: { code, message, details? } }` y el `errorHandler` existente | Se usa el formato del repo. Las respuestas OK son objetos planos, como en `agente-extractor` |
| `requireAuth` | No hay middleware de auth (JWT/CAO es futuro) | Queda igual que el resto de la API. Se agrega **rate limit** propio (`express-rate-limit`) para limitar el gasto. Riesgo anotado: exigir auth cuando exista CAO |
| `OPENAI_API_KEY` en config nueva | `env.openai.apiKey` (lee `OPENIA_TOKEN`) en `back/src/config/env.js` | Se reutiliza. El SDK `openai ^6.48` ya trae `realtime.clientSecrets` y `audio.speech` |
| Mensajes con `id` | `MensajeChat { rol, contenido }` sin id, `key={i}` | El id de lectura es el índice del mensaje (`String(i)`) |
| Tokens `--accent`, `--code-bg`… | `front/src/styles/tokens.css` (`--cemaco-indigo`, `--bg-sunken`, `--border`, `--fg-*`) | Mapear a tokens Cemaco y usar BEM (lo exige stylelint) |

---

## 1. Backend (`back/`)

Módulo `voz` con el mismo patrón que `agente-extractor`: cliente OpenAI en `agents/`, controller en
`application/`, rutas en `infrastructure/http/routes/`. No lleva dominio ni repositorio porque no toca la BD.

1. **`back/package.json`**: agregar `express-rate-limit` ^8.
2. **`back/src/agents/voz/vozClient.js`** (servicio, sección 3.5 de la guía, adaptado):
   - Usa el mismo patrón de cliente perezoso que `back/src/agents/openaiClient.js` (`obtenerCliente`,
     `errorServicioNoDisponible` → 503 `SERVICE_UNAVAILABLE`). Conviene exportar esos dos helpers desde
     `openaiClient.js` en vez de duplicarlos.
   - `transcribir({ buffer })`: si el buffer está vacío o `detectarTipoReal` devuelve null → 400
     `VALIDATION_ERROR`. Llama `toFile` + `audio.transcriptions.create` con `gpt-4o-mini-transcribe`,
     `language:'es'`, `timeout 8s`, `maxRetries 0`.
   - `crearSesionStreaming()`: `realtime.clientSecrets.create` con `type:'transcription'`, PCM 24 kHz,
     `server_vad` de 3000 ms y expiración de 60 s. Devuelve `{ value, expira_en }`.
   - `sintetizar({ texto, voz, velocidad })`: `audio.speech.create` con `gpt-4o-mini-tts`, mp3, un tope
     de 4000 caracteres y defaults `fable` / `1.7`.
   - Constantes de modelos al inicio del archivo. Si se quieren configurables, van en `env.openai`
     (`transcribeModel`, `ttsModel`) y **nunca** se lee `process.env` fuera de `env.js`.
3. **`back/src/application/voz/voz.controller.js`**:
   - Esquemas Joi:
     - `transcribir`: `{ audio_base64: string requerido }`.
     - `tts`: `{ texto: string min 1, voz: valid('fable','alloy','echo') opcional, velocidad: number 1–2 opcional }`.
   - `transcribir` decodifica con `Buffer.from(b64,'base64')`, rechaza más de 8 MB con 413
     `PAYLOAD_TOO_LARGE` y responde `{ texto }`.
   - `sesionStreaming` responde `{ value, expira_en }`.
   - `tts` responde `res.set('Content-Type','audio/mpeg').send(buffer)`.
   - Todos los errores pasan por `next(err)`.
4. **`back/src/infrastructure/http/middlewares/rateLimit.js`**: `vozLimiter` de 30 req/min por IP. El
   límite de 30 cubre el dictado segmentado, que hace una petición cada 2.75 s. Es exclusivo de `/voz`.
5. **`back/src/infrastructure/http/routes/voz.routes.js`**: `POST /transcribir`,
   `POST /sesion-streaming` y `POST /tts`, todos con `vozLimiter`. Montar en `routes/index.js` con
   `router.use('/voz', require('./voz.routes'))`.
6. **`back/src/infrastructure/http/middlewares/errorHandler.js`**: agregar `PAYLOAD_TOO_LARGE: 413` a
   `STATUS_MAP` si hace falta, y un 429 `RATE_LIMITED` con la forma `{ error }` (handler del limiter).
7. **Contrato**: `Arquitectura/Contratos/14_voz/` con un `.md` por endpoint, con el formato de los
   demás. Es un cambio de documentación: va en commit aparte o se avisa.
8. **Postman**: carpeta `voz` en `postman/planogramas-import.postman_collection.json` según
   `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`:
   - `transcribir`: éxito con un webm/wav pequeño en base64, 400 sin body, 400 con base64 que no es audio.
   - `tts`: éxito (status 200 y `Content-Type audio/mpeg`), 400 con voz inválida y 400 con velocidad 3.
   - `sesion-streaming`: éxito, valida que `value` empiece con `ek_`.
   - Validar el JSON de la colección antes de terminar.

## 2. Frontend (`front/`, TypeScript)

1. **`front/src/services/httpClient.ts`**: agregar `postBinario(path, body): Promise<Blob>`. Hace el
   mismo fetch JSON pero devuelve `response.blob()`. Si falla, parsea el JSON de error y lanza `ApiError`.
2. **`front/src/services/voz.service.ts`**:
   - `transcribir(blob)`: convierte el blob a base64 con `FileReader` y hace `httpClient.post('/voz/transcribir')`.
   - `crearSesionStreaming()`.
   - `sintetizar({ texto, voz, velocidad })`: usa `postBinario('/voz/tts')`.
3. **`front/src/config/preferenciasVoz.ts`**: guía 4.2 tal cual. Claves con prefijo `agenteExtractor.`
   (`metodoVoz`, `metodoTts`, `vozTts`, `velocidadTts`) y validadores que caen al default.
4. **`front/src/hooks/useVozATexto.ts`**: guía 4.3. Cambia `api.post` por `voz.service`. Se mantienen
   `sesionIdRef`, el corte sin envío cuando `disabled` y el cambio de método a mitad de sesión.
5. **`front/src/hooks/useTextoAVoz.ts`**: guía 4.4 con `voz.service.sintetizar`. Se mantiene la regla
   de `onFin` (solo se llama si la lectura termina naturalmente).
6. **Componentes** en `front/src/components/dominio/editor/` (o `ui/` si se reutilizan), cada uno en su
   carpeta con `.tsx` + `.css` y clases BEM:
   - `BotonTextoAVoz/`: ▶/■/spinner (guía 4.5).
   - `OndaVoz/`: la `VoiceWaveform` de la guía 4.6, con CSS normal en BEM en vez de CSS module.
   - `AjustesVozModal/`: guía 4.7, con `createPortal`. Revisar si ya existe un modal base en
     `components/ui/` y reutilizarlo.
   - Colores: `--cemaco-indigo` como acento, `--bg-sunken` en lugar de `--code-bg`, `--fg-1`/`--fg-3`
     para texto y `--border`.
7. **Integración en `AgenteExtractorChat.tsx`** (guía sección 5, adaptada):
   - Grupo mic + flechita junto al botón Enviar, en `agente-extractor-chat__input-fila`.
   - Con el mic activo, `OndaVoz` reemplaza al textarea.
   - `onTextoParcial` concatena al estado `texto`. `onSilencioFinal` limpia el campo, marca
     `ultimoEnvioPorVozRef = true` y llama a `onEnviar`. `enviarTexto()` manual pone la marca en `false`.
   - `disabled: enviando`, así que el mic se corta sin enviar mientras el agente piensa.
   - Efecto de autolectura: exactamente +1 mensaje nuevo con `rol === 'assistant'` y marca de voz →
     `reproducir(String(i), contenido, () => toggleVoz())`. La regla del +1 evita que se lea el
     historial que se restaura desde `localStorage`.
   - `BotonTextoAVoz` en cada burbuja `assistant`.
   - Llamar `detenerLectura()` al colapsar el panel (`onColapsar`) y al reestablecer, para que el mic no
     se reactive con el chat cerrado.
   - `vozError` se muestra como aviso bajo el input. Si el proyecto ya usa `mostrarToast`, se prefiere eso.
   - El foco automático al textarea (`useEffect` sobre `enviando`) no debe ejecutarse mientras el mic
     esté activo.

## 3. Riesgos y notas

- **Sin auth**: los tres endpoints consumen créditos de OpenAI y quedan públicos, igual que el resto
  de la API. El rate limit mitiga pero no reemplaza la auth. Queda como pendiente para cuando llegue
  CAO (ver la memoria del proyecto sobre auth CAO).
- **HTTPS**: `getUserMedia` exige HTTPS o localhost. Probar en el despliegue de Azure/DO, no por IP en la LAN.
- **CSP de helmet**: el WebSocket va a `wss://api.openai.com` desde el navegador. Si el front define
  un `connect-src`, hay que agregarlo.
- **Safari**: puede bloquear el autoplay tras el `await`. El botón ▶ sigue funcionando.
- Whitelist de voces y rango de velocidad **idénticos** en Joi, `preferenciasVoz.ts` y el modal.

## 4. Verificación

1. `cd back && npm install && npm run dev`, luego correr la carpeta `voz` de Postman (éxito y errores).
2. `cd front && npm run lint && npm run build`: oxlint, stylelint (BEM) y `tsc` deben pasar sin errores.
3. `npm run dev` en `front`, abrir el editor en `http://localhost:5173` y abrir la burbuja del agente:
   - Streaming: tocar 🎤, dictar "añade el SKU 10012345 con 3 facings en el nivel 2" y callar 3 s →
     se envía solo, se lee la respuesta y el mic se reactiva.
   - Repetir en Segmentado.
   - Cambiar a lectura por Navegador y comprobar que se ocultan voz y velocidad.
   - ▶/■ manual en un mensaje viejo. Colapsar el panel durante la lectura → el mic no se reactiva.
   - Recargar la página y verificar que las preferencias persisten. Recargar con historial → no se
     lee nada automáticamente.
4. Probar en Chrome y Firefox. Safari si hay equipo disponible.
