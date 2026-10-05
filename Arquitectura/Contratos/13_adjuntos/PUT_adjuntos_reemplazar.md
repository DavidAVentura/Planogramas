# Contrato: Reemplazar Archivo de un Adjunto

**Método:** `PUT`
**Ruta:** `/api/v1/adjuntos/{id}`
**Actor:** Analista
**Caso de uso:** CU-09-03 (paso 3 de 3)

---

## Descripción

Reemplaza el contenido de un adjunto existente por un archivo nuevo, **conservando el mismo id** — no se versiona el archivo en sí, solo queda el último que se subió.

El archivo nuevo **no viaja en este request**. Antes, el front pide una URL SAS con `POST /adjuntos/{id}/subida` (ver `POST_adjuntos_solicitar_subida.md`) y el navegador sube el archivo directo a Azure. Este endpoint solo confirma ese blob.

Orden de operaciones:
1. Verifica el blob nuevo en Azure (ruta, tipo y tamaño reales).
2. Actualiza la fila en la BD para que apunte al blob nuevo.
3. Recién entonces borra el blob viejo.

Si el paso 2 fallara, el blob viejo sigue intacto y el archivo no se pierde.

Mismas reglas de validación que `POST /versiones/{id}/adjuntos` (ver ese contrato). La única diferencia es el path: `{id}` es el id del adjunto, no de la versión, y `blob_path` debe pertenecer a la versión de ese adjunto.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí — id del adjunto. |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre_original` | `string` | Sí | 1–255 chars. |
| `tipo_mime` | `string` | Sí | Uno de: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.ms-excel` (.xls), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx). |
| `blob_path` | `string` | Sí | El `blobPath` que devolvió `POST /adjuntos/{id}/subida`. Máximo 500 chars. |

---

## Reglas de negocio

1. El adjunto debe existir — `404` si no.
2. No se valida el estado de la versión a la que pertenece el adjunto: se admite en cualquier estado, incluidos `publicado` y `archivado`.
3. Mismas validaciones que al agregar: `blob_path` de la versión del adjunto y no registrado (`400` / `409`); el blob debe existir (`422`); tipo y tamaño reales permitidos, hasta 40MB (si no, se borra el blob nuevo y se responde `400`).
4. `subido_por` se actualiza al usuario que hizo el reemplazo (JWT de CAO).
5. El blob viejo se borra **después** de confirmar la actualización de la fila — nunca antes.

---

## Request JSON

```json
{
  "nombre_original": "foto-rack-frontal-v2.jpg",
  "tipo_mime": "image/jpeg",
  "blob_path": "versiones/10/9c7b4e21-...-foto-rack-frontal-v2.jpg"
}
```

---

## Response — 200 OK

```json
{
  "id": 5,
  "versionId": 10,
  "nombreOriginal": "foto-rack-frontal-v2.jpg",
  "tipoMime": "image/jpeg",
  "tamanoBytes": 915204,
  "blobContainer": "adjuntos",
  "blobPath": "versiones/10/9c7b4e21-foto-rack-frontal-v2.jpg",
  "blobUrl": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/9c7b4e21-foto-rack-frontal-v2.jpg",
  "subidoPor": "sistema",
  "createdAt": "2026-09-16T14:32:00.000Z"
}
```

El `id` no cambia respecto al adjunto reemplazado; `blobPath`/`blobUrl` sí, porque apuntan al blob nuevo.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `blob_path` no pertenece a la versión del adjunto; el tipo o tamaño real del blob no está permitido; o campos ausentes o mal formados. |
| `409 Conflict` | `blob_path` ya está registrado como adjunto. |
| `422 Unprocessable Entity` | El blob nuevo no existe en Azure: la subida no terminó. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Adjunto no existe. |
| `503 Service Unavailable` | Azure Blob Storage no respondió a la consulta del blob nuevo o al borrado del viejo. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**
> El orden subir-nuevo → actualizar-fila → borrar-viejo es intencional: prioriza no perder el archivo del usuario por sobre no dejar un blob huérfano temporal en Storage (que se puede limpiar después; un archivo perdido, no).
