# Contrato: Eliminar Accesorio de Posición

**Método:** `DELETE`  
**Ruta:** `/api/v1/posiciones/{posicionId}/accesorios/{accesorioId}`  
**Actor:** Analista  

---

## Descripción

Quita un accesorio de montaje de una posición. El parámetro `accesorioId` es el ID del registro en `PosicionAccesorio` (no el ID del catálogo de accesorios).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `posicionId` | `integer` | Sí | ID de la posición. |
| `accesorioId` | `integer` | Sí | ID del registro `PosicionAccesorio`. |

---

## Reglas de negocio

1. El registro `PosicionAccesorio` debe pertenecer a la posición indicada.
2. Versión padre en modo editable.
3. No reajusta el `orden` de los accesorios restantes (el cliente maneja el orden visual).

---

## Response — 204 No Content

Sin body.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición, registro de accesorio no existen, o el accesorio no pertenece a esa posición. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — ID semántico]**  
> Aclarar en la documentación que `accesorioId` en la URL es el ID de `PosicionAccesorio`, no el de `Accesorio`. Considerar renombrar el segmento URL a `/posicion-accesorios/{id}` para mayor claridad.
