# Contrato: Eliminar Accesorio

**Método:** `DELETE`  
**Ruta:** `/api/v1/accesorios/{id}`  
**Actor:** Analista  

---

## Descripción

Elimina un accesorio del catálogo que **ningún nivel** (`Nivel.codigo_accesorio_id`) **ni posición**
(`PosicionAccesorio`) usa. No hay `forzar`: primero se quita de donde esté asignado.

---

## Response — 204 No Content

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | El accesorio no existe. |
| `409` | `CONFLICT` | El accesorio está en uso (`details: { niveles, posiciones }` con los conteos). |
