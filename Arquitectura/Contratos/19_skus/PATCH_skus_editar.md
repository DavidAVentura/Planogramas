# Contrato: Editar mín./máx. de un SKU

**Método:** `PATCH`  
**Ruta:** `/api/v1/versiones/{versionId}/skus/{sku}`  
**Actor:** Analista  
**Caso de uso:** CU-04-17  

---

## Descripción

Aplica `min_final` y/o `max_final` a **todas las posiciones** de ese SKU en la versión, para que el
analista los defina una sola vez aunque el producto ocupe varias ubicaciones.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |
| `sku` | `string` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `min_final` | `integer \| null` | No* | Mayor o igual a 0. `null` lo limpia. |
| `max_final` | `integer \| null` | No* | Mayor o igual a 0. `null` lo limpia. |

\* Al menos uno de los dos.

---

## Reglas de negocio

1. La versión debe estar en un estado editable (`borrador`, `en_desarrollo` o `piloto`).
2. El SKU debe tener al menos una posición en la versión.
3. Se valida con los valores resultantes: si solo viene `min_final`, se compara contra el
   `max_final` común actual. `min_final > max_final` → `422`.
4. "Máx. supera capacidad" **no** bloquea: solo aparece como alerta en la respuesta.

---

## Request JSON

```json
{ "max_final": 20 }
```

---

## Response — 200 OK

El SKU actualizado, con la misma forma que cada elemento de `skus` en `GET_skus_listar.md`.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Body vacío, valores negativos o no enteros; `versionId` inválido. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La versión no existe, o el SKU no está en la versión. |
| `422` | `UNPROCESSABLE` | La versión no es editable. |
| `422` | `UNPROCESSABLE` | `min_final` resultante mayor que `max_final`. |
