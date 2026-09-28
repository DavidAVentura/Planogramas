# Contrato: Descargar foto de evidencia

**Método:** `GET`  
**Ruta:** `/api/v1/evidencias/{id}/descargar`  
**Actor:** Implementador / Analista  
**Caso de uso:** CU-07-03  

---

## Descripción

Devuelve el binario de la foto en streaming desde Azure Blob, igual que
`GET /adjuntos/{id}/descargar`: `Content-Type` = `tipo_mime`, `Content-Disposition: inline`. El
front la pide con `httpClient.getBinario` (el contenedor es privado y hace falta el Bearer) y la
muestra como miniatura con un object URL.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | No existe la evidencia. |
| `503` | `SERVICE_UNAVAILABLE` | Azure Blob no disponible. |
