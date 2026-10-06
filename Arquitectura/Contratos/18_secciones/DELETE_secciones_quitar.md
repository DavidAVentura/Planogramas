# Contrato: Quitar sección

**Método:** `DELETE`  
**Ruta:** `/api/v1/secciones/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-11  

---

## Descripción

Quita una sección (hoja o división con todo lo que contiene) que **no tiene productos**. Sus
niveles, vacíos, se eliminan y su espacio pasa a la sección vecina.

---

## Parámetros de entrada

| Parámetro | Ubicación | Tipo | Requerido |
|-----------|-----------|------|-----------|
| `id` | path | `integer` | Sí |

---

## Reglas de negocio

1. La versión de la góndola debe estar en un estado editable.
2. Si algún nivel de la sección (o de sus sub-secciones) tiene posiciones — con SKU o pendientes —
   → `409 CONFLICT`. No hay `forzar`: los productos se quitan o se mueven primero.
3. El espacio pasa a la hermana anterior (o a la siguiente, si era la primera).
4. Si su padre queda con una sola hija, esa hija ocupa el lugar del padre. Si toda la góndola queda
   con una sola sección, vuelve a "sin dividir" (`dividida: false`, niveles con `seccion_id` null).
5. No se puede quitar la sección principal (raíz).

---

## Response — 200 OK

La estructura completa actualizada (mismo cuerpo que `GET_secciones_obtener.md`).

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La sección no existe. |
| `409` | `CONFLICT` | La sección tiene productos (`details.totalPosiciones`). |
| `422` | `UNPROCESSABLE` | La versión no es editable. |
| `422` | `UNPROCESSABLE` | Es la sección principal de la góndola. |
