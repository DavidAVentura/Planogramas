# Contrato: Eliminar foto de evidencia

**Método:** `DELETE`  
**Ruta:** `/api/v1/evidencias/{id}`  
**Actor:** Implementador  
**Caso de uso:** CU-07-03  

---

## Descripción

Borra una foto de evidencia (fila + blob). Solo la puede borrar quien la subió: la evidencia ya
reportada por otra persona no se borra desde la tienda.

---

## Reglas de negocio

1. Si `subido_por` no coincide con el usuario del JWT → `403 FORBIDDEN`.
2. Se borra primero la fila y luego el blob; si el borrado del blob falla, se registra en el log y
   se responde igual `204` (el blob huérfano no afecta a la vista).

---

## Response — 204 No Content

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `403` | `FORBIDDEN` | La foto la subió otro usuario. |
| `404` | `NOT_FOUND` | No existe la evidencia. |
