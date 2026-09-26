# Contrato: Crear Tienda

**Método:** `POST`  
**Ruta:** `/api/v1/tiendas`  
**Actor:** Analista  
**Caso de uso:** CU-02-05  

---

## Descripción

Da de alta una tienda de la cadena. La tienda se crea siempre en estado `activo`, sin planogramas asignados. Usado desde la vista de administración de tiendas (`/tiendas` en el front).

---

## Parámetros de entrada

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |
| `Content-Type` | `application/json` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `codigo` | `string` | Sí | Máximo 20 chars. Se normaliza a mayúsculas; solo letras, dígitos y `-` (ej. `T0PC`, `TJQM`). |
| `nombre` | `string` | Sí | 1 a 200 chars. |
| `tipo` | `string` | Sí | `GRANDE`, `MEDIANA` o `EXPRESS`. |
| `marca` | `string \| null` | No | `Cemaco`, `Jugueton`, `Bebé Jugueton` o `null` (sin marca). |
| `region` | `string \| null` | No | Máximo 200 chars. |

---

## Reglas de negocio

1. El `codigo` es único en toda la cadena (una misma ubicación física puede tener códigos distintos por marca, ej. `T0QM` / `TJQM`).
2. El `estado` inicial es siempre `activo`; no se acepta en el body.
3. `marca` y `region` omitidos se guardan como `null`.

---

## Request JSON (ejemplo)

```json
{
  "codigo": "T0PC",
  "nombre": "Cemaco Pradera",
  "tipo": "GRANDE",
  "marca": "Cemaco",
  "region": "Guatemala Metropolitana"
}
```

---

## Response — 201 Created

```json
{
  "id": 46,
  "codigo": "T0PC",
  "nombre": "Cemaco Pradera",
  "tipo": "GRANDE",
  "region": "Guatemala Metropolitana",
  "marca": "Cemaco",
  "estado": "activo",
  "planogramas": 0
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Falta un campo requerido, o un campo tiene un valor inválido (`tipo`, `marca`, formato de `codigo`, largo). |
| `401 Unauthorized` | JWT ausente. *(No implementado aún.)* |
| `409 Conflict` | Ya existe una tienda con ese `codigo`. |

```json
// 409 Conflict
{
  "error": {
    "code": "CONFLICT",
    "message": "Ya existe una tienda con el código T0PC"
  }
}
```

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Guard Clauses]**  
> La unicidad del código se verifica en el caso de uso (`crearTienda`) antes de insertar, para responder `409` con un mensaje claro en vez de propagar la violación del índice único de la BD.
