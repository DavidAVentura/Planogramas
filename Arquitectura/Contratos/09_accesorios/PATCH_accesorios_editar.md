# Contrato: Editar Accesorio

**Método:** `PATCH`  
**Ruta:** `/api/v1/accesorios/{id}`  
**Actor:** Analista  

---

## Descripción

Partial update de un accesorio del catálogo. Los niveles y posiciones que lo usan lo referencian
por id, así que un cambio de código o nombre se refleja en todos ellos.

---

## Request

Cualquier subconjunto (al menos uno) de los campos de `POST_accesorios_crear.md`, con las mismas
reglas.

```json
{ "nombre": "Gancho sencillo 12 pulgadas (negro)" }
```

---

## Response — 200 OK

El accesorio actualizado.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo, body vacío o un campo no cumple su regla. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | El accesorio no existe. |
| `409` | `CONFLICT` | El código nuevo ya lo usa otro accesorio. |
