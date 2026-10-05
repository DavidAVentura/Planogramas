# Contrato: Solicitar Subida de Adjunto (URL SAS)

**Método:** `POST`
**Rutas:**
- `/api/v1/versiones/{id}/adjuntos/subida` — para un adjunto nuevo (`{id}` = versión).
- `/api/v1/adjuntos/{id}/subida` — para reemplazar el archivo de un adjunto (`{id}` = adjunto).

**Actor:** Analista
**Caso de uso:** CU-09-01 / CU-09-03 (paso 1 de 3)

---

## Descripción

Primer paso de la subida de un adjunto. El archivo (hasta **40MB**) **no pasa por el backend**:

1. El front llama a este endpoint con el nombre, tipo y tamaño del archivo. El backend los valida y devuelve una **URL SAS** que solo permite crear o escribir un blob nuevo de la versión.
2. El navegador sube el archivo directo a Azure Blob con esa URL (`PUT` con `x-ms-blob-type: BlockBlob` y `x-ms-blob-content-type: {tipoMime}`).
3. El front confirma con `POST /versiones/{id}/adjuntos` (agregar) o `PUT /adjuntos/{id}` (reemplazar) enviando el `blobPath`. Recién ahí se crea o actualiza la fila en la BD.

La URL SAS está limitada a ese único blob, solo tiene permiso de creación y escritura (`cw`), y vence a los **30 minutos**, tiempo suficiente para 40MB en una conexión lenta. La firma usa la clave de la cuenta incluida en `AZURE_STORAGE_CONNECTION_STRING`. El backend crea el contenedor si no existe.

Para que el navegador pueda hacer el `PUT`, la cuenta de storage debe tener **CORS** habilitado para el origen del front (ver `Arquitectura/DESPLIEGUE_AZURE.md`, sección 6).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | Id de la versión (adjunto nuevo) o del adjunto (reemplazo). |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre_original` | `string` | Sí | 1–255 chars. Nombre del archivo tal como lo ve el usuario. |
| `tipo_mime` | `string` | Sí | Uno de: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.ms-excel` (.xls), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx). |
| `tamano_bytes` | `integer` | Sí | Tamaño del archivo, ≥ 1 y ≤ 40MB (41 943 040 bytes). |

---

## Reglas de negocio

1. La versión (o el adjunto, en el reemplazo) debe existir; si no, `404`. No se valida el estado de la versión: los adjuntos se admiten en cualquier estado.
2. `tipo_mime` y `tamano_bytes` se validan contra la lista blanca y el tope de 40MB (`validarArchivo` en `adjunto.entity.js`). El tamaño declarado aquí es solo un aviso temprano: la confirmación vuelve a medir el blob real en Azure.
3. `blobPath` lo genera el backend (`versiones/{versionId}/{uuid}-{nombre sanitizado}`); el cliente no lo elige.
4. Si el usuario nunca confirma, el blob subido queda huérfano en el contenedor (no hay fila que lo referencie).

---

## Request JSON

```json
{
  "nombre_original": "Surtido Autos Q4.xlsx",
  "tipo_mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "tamano_bytes": 31457280
}
```

---

## Response — 200 OK

```json
{
  "blobPath": "versiones/10/3f2a1c9e-...-Surtido_Autos_Q4.xlsx",
  "urlSubida": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/3f2a1c9e-...-Surtido_Autos_Q4.xlsx?sv=...&sp=cw&se=...&sig=...",
  "expiraEn": "2026-10-05T15:30:00.000Z",
  "tipoMime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tipo_mime` no permitido, `tamano_bytes` mayor a 40MB, o campos ausentes o mal formados. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | La versión o el adjunto no existe. |
| `503 Service Unavailable` | Azure Blob Storage no respondió al crear el contenedor o al firmar la URL. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> La firma SAS vive en el adaptador `infrastructure/storage/blobClient.js#generarUrlSubida`. El dominio solo pide "una URL de subida para este `blobPath`" a través del puerto `blobStorage` que recibe por inyección.

> **[SEGURIDAD]**
> La URL no permite leer, listar ni borrar, y solo sirve para un blob cuyo nombre lleva un UUID. Lo que se sube con ella no se considera adjunto hasta que la confirmación verifica la ruta, el tipo y el tamaño reales.
