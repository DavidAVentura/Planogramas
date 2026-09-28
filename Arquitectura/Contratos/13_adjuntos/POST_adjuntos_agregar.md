# Contrato: Agregar Adjunto a una Versión

**Método:** `POST`
**Ruta:** `/api/v1/versiones/{id}/adjuntos`
**Actor:** Analista
**Caso de uso:** CU-09-01

---

## Descripción

Sube un archivo (imagen o PDF) y lo asocia a una versión de planograma. El archivo viaja en el body como base64 (mismo patrón que el Agente Extractor de Imagen Numerada) — no se usa `multipart/form-data`.

El binario se sube a Azure Blob Storage (contenedor privado) antes de crear la fila en BD; si la subida falla, no se crea el registro. La ruta del blob (`blob_path`) se genera en el backend (UUID + nombre sanitizado) — el cliente no la controla ni la conoce de antemano.

La operación se permite en cualquier estado de la versión (`borrador`, `en_desarrollo`, `piloto`, `publicado` o `archivado`): los adjuntos son material de apoyo del analista, no parte del contenido versionado del planograma, así que el analista siempre puede agregarlos, reemplazarlos o eliminarlos.

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
| `tipo_mime` | `string` | Sí | Uno de: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. |
| `archivo_base64` | `string` | Sí | Contenido del archivo codificado en base64 (sin el prefijo `data:...;base64,`). |

---

## Reglas de negocio

1. La versión debe existir — `404` si no. No se valida su estado: se admite en cualquier estado, incluidos `publicado` y `archivado`.
2. `tipo_mime` debe estar en la lista blanca — cualquier otro valor retorna `400`, incluso si Joi ya lo valida contra el enum (doble chequeo: Joi en el controller, `validarArchivo` en el dominio).
3. El tamaño decodificado del archivo no puede superar 5MB — el límite global del body JSON es 8mb (`app.js`) y el base64 agrega ~33% de overhead sobre el binario, así que 5MB de binario deja margen suficiente.
4. `subido_por` se completa en el backend, no lo envía el cliente — hoy es siempre `'sistema'` porque no existe autenticación de usuario real (pendiente JWT vía CAO).

---

## Request JSON

```json
{
  "nombre_original": "foto-rack-frontal.jpg",
  "tipo_mime": "image/jpeg",
  "archivo_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

---

## Response — 201 Created

```json
{
  "id": 5,
  "versionId": 10,
  "nombreOriginal": "foto-rack-frontal.jpg",
  "tipoMime": "image/jpeg",
  "tamanoBytes": 842311,
  "blobContainer": "adjuntos",
  "blobPath": "versiones/10/3f2a1c9e-foto-rack-frontal.jpg",
  "blobUrl": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/3f2a1c9e-foto-rack-frontal.jpg",
  "subidoPor": "sistema",
  "createdAt": "2026-09-16T14:32:00.000Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tipo_mime` no permitido, archivo excede el tamaño máximo, o campos ausentes/mal formados. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `503 Service Unavailable` | Azure Blob Storage no respondió a la subida. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> `AgregarAdjuntoUseCase` recibe `(adjuntoRepo, versionRepo, blobStorage, versionId, datos, userId)` — `blobStorage` es un puerto inyectado igual que los repositorios; el dominio no importa el SDK de Azure directamente.

> **[SOLID — SRP]**
> La generación de `blob_path` es responsabilidad del dominio (`adjunto.entity.js#generarBlobPath`), no del cliente de Storage ni del controller.

> **[CLEAN CODE]**
> El orden de operaciones (subir blob → recién entonces insertar fila) evita filas huérfanas apuntando a un blob que nunca se creó.
