# Contrato: Reemplazar Tiendas Asignadas a una Versión

**Método:** `PUT`  
**Ruta:** `/api/v1/versiones/{id}/tiendas`  
**Actor:** Analista  
**Caso de uso:** CU-02-05  

---

## Descripción

Reemplaza el listado completo de tiendas asignadas a la versión. Hace DELETE de todas las asignaciones actuales e INSERT de las nuevas en una transacción. Una versión archivada no puede modificarse.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tiendaIds` | `integer[]` | Sí | IDs de tiendas a asignar. Array vacío desasigna todas. |

---

## Reglas de negocio

1. Versión archivada → `422`.
2. Las tiendas deben ser del mismo `tipo` que la versión.
3. IDs inexistentes son ignorados silenciosamente (o retornan advertencia — a decisión de implementación; se recomienda retornar advertencia).
4. La operación es idempotente: llamar dos veces con los mismos IDs produce el mismo resultado.

---

## Request JSON

```json
{
  "tiendaIds": [1, 3, 7]
}
```

---

## Response — 200 OK

```json
{
  "versionId": 10,
  "tiendas": [
    { "id": 1, "codigo": "GTM-PRA", "nombre": "Cemaco Pradera" },
    { "id": 3, "codigo": "GTM-MIR", "nombre": "Cemaco Miraflores" }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tiendaIds` no es un array o contiene valores no enteros. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | Versión archivada. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — PUT semántico]**  
> PUT implica reemplazo total. Documentar explícitamente que enviar `tiendaIds: []` desasigna todas las tiendas — es un comportamiento esperado, no un bug.

> **[CLEAN CODE — Transacción]**  
> DELETE + INSERT en la misma transacción. Si algún INSERT falla, el DELETE no debe persistir.

> **[SOLID — Tell Don't Ask]**  
> La versión debe exponer `puedeModificarTiendas(): boolean` basado en su estado, en lugar de que el servicio consulte el estado y decida.
