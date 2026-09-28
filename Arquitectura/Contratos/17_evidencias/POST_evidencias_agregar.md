# Contrato: Subir foto de evidencia

**Método:** `POST`  
**Ruta:** `/api/v1/tiendas/{tiendaId}/versiones/{versionId}/evidencias`  
**Actor:** Implementador  
**Caso de uso:** CU-07-03  

---

## Descripción

Sube una foto de una góndola montada. Mismo formato de carga que `POST /versiones/{id}/adjuntos`
(JSON con el archivo en base64), para reutilizar la validación y el `blobClient`.

---

## Request body

```json
{
  "gondola_id": 101,
  "nombre_original": "gondola1.jpg",
  "tipo_mime": "image/jpeg",
  "archivo_base64": "/9j/4AAQSkZJRgABAQ..."
}
```

| Campo | Tipo | Requerido | Regla |
|-------|------|-----------|-------|
| `gondola_id` | integer | Sí | Góndola de la versión. |
| `nombre_original` | string | Sí | 1–255 caracteres. |
| `tipo_mime` | string | Sí | `image/jpeg`, `image/png` o `image/webp`. |
| `archivo_base64` | string | Sí | Base64 sin prefijo `data:`; tamaño decodificado ≤ al límite de Adjuntos. |

---

## Reglas de negocio

1. Reglas comunes del módulo (ver `README.md`).
2. `subido_por` = usuario del JWT. `blob_path` = `evidencias/{tiendaCodigo}/{versionId}/{uuid}-{nombre}`.
3. Si falla el guardado en BD después de subir el blob, se borra el blob (sin huérfanos).

---

## Response — 201 Created

```json
{
  "id": 8,
  "gondolaId": 101,
  "nombre_original": "gondola1.jpg",
  "tipo_mime": "image/jpeg",
  "tamano_bytes": 482133,
  "subido_por": "jlopez",
  "created_at": "2026-09-26T15:10:00.000Z",
  "puedeEliminar": true
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Body inválido, tipo no permitido o archivo vacío / demasiado grande. |
| `400` | `VALIDATION_ERROR` | La góndola no es de esa versión. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La tienda no existe o está inactiva. |
| `404` | `NOT_FOUND` | La versión no es publicada/piloto o no está asignada a la tienda. |
| `503` | `SERVICE_UNAVAILABLE` | Azure Blob no disponible. |
