# Contrato: Eliminar Posición

**Método:** `DELETE`  
**Ruta:** `/api/v1/posiciones/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-04-06  

---

## Descripción

Elimina una posición del nivel, incluyendo todos sus accesorios de montaje. Reajusta el `orden_horizontal` de las posiciones que quedaban después de la eliminada.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

---

## Reglas de negocio

1. Elimina en cascada: `PosicionAccesorio` → `Posicion`.
2. Después de eliminar, decrementa `orden_horizontal` en 1 para todas las posiciones del mismo nivel con `orden_horizontal > eliminado`.
3. Versión padre en modo editable.

---

## Response — 204 No Content

Sin body.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición no existe. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Transacción]**  
> DELETE de accesorios + DELETE de posición + UPDATE de orden en una sola transacción.

> **[SOLID — SRP]**  
> El reajuste de orden es responsabilidad del `PosicionRepository.eliminarYReajustar(posicionId)`.
