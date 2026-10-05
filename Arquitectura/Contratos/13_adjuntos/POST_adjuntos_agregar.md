# Contrato: Agregar Adjunto a una Versión (confirmar subida)

**Método:** `POST`
**Ruta:** `/api/v1/versiones/{id}/adjuntos`
**Actor:** Analista
**Caso de uso:** CU-09-01 (paso 3 de 3)

---

## Descripción

Registra como adjunto de la versión un archivo que el navegador **ya subió directo a Azure Blob** con la URL SAS de `POST /versiones/{id}/adjuntos/subida` (ver `POST_adjuntos_solicitar_subida.md`). El archivo no viaja en este request; solo se envía su `blob_path`.

Antes de crear la fila, el backend verifica en Azure que el blob exista y que su tipo y tamaño reales estén permitidos. Si no cumplen, **borra el blob** y responde con error.

La operación se permite en cualquier estado de la versión (`borrador`, `en_desarrollo`, `piloto`, `publicado` o `archivado`). Los adjuntos son material de apoyo del analista y no forman parte del contenido versionado del planograma, así que el analista siempre puede agregarlos, reemplazarlos o eliminarlos.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre_original` | `string` | Sí | 1–255 chars. Nombre del archivo tal como lo ve el usuario. |
| `tipo_mime` | `string` | Sí | Uno de: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.ms-excel` (.xls), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx). |
| `blob_path` | `string` | Sí | El `blobPath` que devolvió la solicitud de subida. Máximo 500 chars. |

---

## Reglas de negocio

1. La versión debe existir; si no, `404`. No se valida su estado: se admite en cualquier estado, incluidos `publicado` y `archivado`.
2. `blob_path` debe empezar con `versiones/{id}/` (una ruta generada para esta versión); si no, `400`. Esto impide registrar un blob ajeno.
3. `blob_path` no puede estar ya registrado en otro adjunto; si lo está, `409`.
4. El blob debe existir en Azure; si no, `422` (la subida no terminó o falló).
5. El tamaño real del blob no puede superar **40MB**, y su `Content-Type` debe ser igual a `tipo_mime` y estar en la lista blanca. Si alguna de estas condiciones falla, se borra el blob y se responde `400`.
6. `tamano_bytes` se toma del blob real en Azure, no de lo que declaró el cliente.
7. `subido_por` se completa en el backend con el usuario del JWT de CAO; el cliente no lo envía.

---

## Request JSON

```json
{
  "nombre_original": "Surtido Autos Q4.xlsx",
  "tipo_mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "blob_path": "versiones/10/3f2a1c9e-...-Surtido_Autos_Q4.xlsx"
}
```

---

## Response — 201 Created

```json
{
  "id": 5,
  "versionId": 10,
  "nombreOriginal": "Surtido Autos Q4.xlsx",
  "tipoMime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "tamanoBytes": 31457280,
  "blobContainer": "adjuntos",
  "blobPath": "versiones/10/3f2a1c9e-...-Surtido_Autos_Q4.xlsx",
  "blobUrl": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/3f2a1c9e-...-Surtido_Autos_Q4.xlsx",
  "subidoPor": "usuario@cemaco.com",
  "createdAt": "2026-10-05T15:02:00.000Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `blob_path` no pertenece a la versión; el tipo o tamaño real del blob no está permitido (el blob se borra); o campos ausentes o mal formados. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | La versión no existe. |
| `409 Conflict` | `blob_path` ya está registrado como adjunto. |
| `422 Unprocessable Entity` | El blob no existe en Azure: la subida no terminó. |
| `503 Service Unavailable` | Azure Blob Storage no respondió a la consulta. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> `agregarAdjunto(adjuntoRepo, versionRepo, blobStorage, versionId, datos, userId)` usa el puerto `blobStorage.obtenerPropiedades` para medir el blob. El dominio no importa el SDK de Azure.

> **[CLEAN CODE]**
> La fila se crea solo después de verificar el blob. Así no quedan filas apuntando a un archivo inexistente ni a uno que no cumple las reglas.
