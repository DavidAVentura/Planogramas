# Contrato: Cambiar medida de sección

**Método:** `PATCH`  
**Ruta:** `/api/v1/secciones/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-10  

---

## Descripción

Cambia la medida de una sección (hoja o división) **en la dirección de su padre**: el ancho si el
padre reparte en columnas, el alto si reparte en franjas. La diferencia la absorbe la hermana
siguiente (o la anterior, si es la última).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `tam_cm` | `number` | Sí | Mayor a 0. |

---

## Reglas de negocio

1. La versión de la góndola debe estar en un estado editable.
2. La sección y su vecina deben quedar con al menos 10 cm cada una.
3. La sección principal (raíz) no tiene padre: su medida es la de la góndola y se cambia editando
   la góndola (`PATCH /gondolas/{id}`).
4. Para cambiar el ancho de una hoja que está dentro de una franja, el front envía el id del nodo
   que controla esa medida (el ancestro más cercano cuyo padre reparte en columnas).
5. `ancho_disponible_cm` de los niveles de las secciones afectadas se iguala al nuevo ancho.

---

## Request JSON

```json
{ "tam_cm": 40 }
```

---

## Response — 200 OK

La estructura completa actualizada (mismo cuerpo que `GET_secciones_obtener.md`).

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` inválido o `tam_cm` ausente / no positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La sección no existe. |
| `422` | `UNPROCESSABLE` | La versión no es editable. |
| `422` | `UNPROCESSABLE` | La sección o su vecina quedarían con menos de 10 cm (`details.maximoCm` = medida máxima permitida). |
| `422` | `UNPROCESSABLE` | Es la sección principal de la góndola. |
