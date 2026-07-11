# Contrato: Reordenar Góndolas

**Método:** `PATCH`  
**Ruta:** `/api/v1/versiones/{versionId}/gondolas/orden`  
**Actor:** Analista  
**Caso de uso:** CU-03-03  

---

## Descripción

Reordena las góndolas de la versión. El cliente envía el array completo de IDs con su nuevo orden. La operación es atómica.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `orden` | `Array<{id: integer, orden: integer}>` | Sí | Lista completa con el nuevo orden de cada góndola. |

---

## Reglas de negocio

1. Todos los IDs del array deben pertenecer a la versión indicada.
2. Los valores de `orden` deben ser únicos dentro del array.
3. Se recomienda que el cliente envíe la lista completa (no solo los elementos movidos) para evitar colisiones de orden.
4. La versión debe estar en modo editable.

---

## Request JSON

```json
{
  "orden": [
    { "id": 2, "orden": 1 },
    { "id": 1, "orden": 2 },
    { "id": 3, "orden": 3 }
  ]
}
```

---

## Response — 200 OK

```json
{
  "gondolas": [
    { "id": 2, "orden": 1 },
    { "id": 1, "orden": 2 },
    { "id": 3, "orden": 3 }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Array vacío, IDs duplicados, o valores de orden no únicos. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe, o algún ID de góndola no pertenece a esta versión. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Optimistic Update]**  
> Este endpoint soporta optimistic update en el frontend (el UI reordena visualmente antes de la respuesta). El backend responde con el orden confirmado para sincronizar.

> **[CLEAN CODE — Bulk Update]**  
> Ejecutar el UPDATE de cada elemento en la misma transacción. Evitar N queries separadas sin transacción — si una falla a mitad, el estado quedaría inconsistente.

> **[SOLID — Validation]**  
> Validar que todos los IDs enviados pertenezcan a `versionId` en una sola query (`WHERE id IN (...) AND planograma_version_id = @versionId COUNT = @expected`) antes de ejecutar el UPDATE.
