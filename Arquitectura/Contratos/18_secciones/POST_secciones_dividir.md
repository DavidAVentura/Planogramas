# Contrato: Dividir sección

**Método:** `POST`  
**Ruta:** `/api/v1/gondolas/{gondolaId}/secciones/dividir`  
**Actor:** Analista  
**Caso de uso:** CU-03-09  

---

## Descripción

Parte en dos una sección final (hoja) — o la góndola completa, si todavía no está dividida — en
columnas (`COLUMNAS`) o en una parte de arriba y otra de abajo (`FILAS`).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `gondolaId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `seccion_id` | `integer` | Solo si la góndola ya está dividida | Debe ser una hoja de esta góndola. Se omite para dividir la góndola completa. |
| `direccion` | `string` | Sí | `COLUMNAS` o `FILAS`. |

---

## Reglas de negocio

1. La versión de la góndola debe estar en un estado editable.
2. La sección se parte por la mitad (la nueva mide `floor(total / 2)`); cada mitad debe medir al
   menos 10 cm.
3. **`COLUMNAS`**: la sección nueva queda a la **derecha**. Copia la estructura de niveles de la
   original (mismo `orden`, altura, tipo y accesorio), **vacíos** y con el ancho de la sección nueva.
   Los niveles originales se quedan en la izquierda con su ancho actualizado.
4. **`FILAS`**: la sección nueva queda **abajo** y se lleva la mitad inferior de los niveles de la
   original (por `orden`; la de arriba conserva la mitad superior, redondeando hacia arriba). Las
   posiciones viajan con su nivel.
5. Si el padre de la sección ya reparte en la misma dirección, la sección nueva se inserta como
   hermana a continuación; si no, se crea una división que contiene a la original y a la nueva.
6. Nunca se crean, mueven ni borran posiciones.

---

## Request JSON

```json
{ "seccion_id": 24, "direccion": "COLUMNAS" }
```

---

## Response — 201 Created

La estructura completa actualizada (mismo cuerpo que `GET_secciones_obtener.md`).

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `direccion` ausente o distinta de `COLUMNAS`/`FILAS`; `gondolaId` inválido. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La góndola no existe, o `seccion_id` no pertenece a la góndola (también si se envía en una góndola sin dividir). |
| `422` | `UNPROCESSABLE` | La versión no es editable. |
| `422` | `UNPROCESSABLE` | La góndola ya está dividida y no se envió `seccion_id`. |
| `422` | `UNPROCESSABLE` | `seccion_id` es una división, no una hoja. |
| `422` | `UNPROCESSABLE` | La sección mide menos de 20 cm en esa dirección (no alcanza para dos de 10 cm). |
