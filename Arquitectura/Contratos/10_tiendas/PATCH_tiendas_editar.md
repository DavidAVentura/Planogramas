# Contrato: Editar Tienda

**Método:** `PATCH`  
**Ruta:** `/api/v1/tiendas/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-02-05  

---

## Descripción

Modifica los datos de una tienda (partial update) y también la activa o desactiva mediante `estado`. Solo cambia los campos enviados.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la tienda. |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |
| `Content-Type` | `application/json` | Sí |

### Body (JSON): todos opcionales, al menos uno requerido

| Campo | Tipo | Validación |
|-------|------|------------|
| `codigo` | `string` | Mismas reglas que en `POST /tiendas`. |
| `nombre` | `string` | 1 a 200 chars. |
| `tipo` | `string` | `GRANDE`, `MEDIANA` o `EXPRESS`. |
| `marca` | `string \| null` | `Cemaco`, `Jugueton`, `Bebé Jugueton` o `null`. |
| `region` | `string \| null` | Máximo 200 chars. |
| `estado` | `string` | `activo` o `inactivo`. |

---

## Reglas de negocio

1. Si se cambia el `codigo`, se valida que no lo use otra tienda (`409`). Enviar el mismo código que ya tiene no es conflicto.
2. Desactivar (`estado: "inactivo"`) no borra ni modifica sus asignaciones a versiones (`VersionTienda`). La tienda deja de aparecer en `GET /tiendas` sin filtro de estado, que es el que usan los selectores de asignación.
3. No hay eliminación física: una tienda con historial de asignaciones se desactiva, no se borra.
4. Los campos no enviados permanecen sin cambios.

---

## Request JSON (ejemplos)

```json
{ "nombre": "Cemaco Pradera Concepción", "region": "Guatemala Metropolitana" }
```

```json
{ "estado": "inactivo" }
```

---

## Response — 200 OK

Mismo formato que `POST /tiendas`, con los datos ya actualizados:

```json
{
  "id": 1,
  "codigo": "T0PC",
  "nombre": "Cemaco Pradera Concepción",
  "tipo": "GRANDE",
  "region": "Guatemala Metropolitana",
  "marca": "Cemaco",
  "estado": "activo",
  "versionesPublicadas": 12
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `id` no es un entero positivo, body vacío, o un campo con valor inválido. |
| `401 Unauthorized` | JWT ausente. *(No implementado aún.)* |
| `404 Not Found` | La tienda no existe. |
| `409 Conflict` | El nuevo `codigo` ya lo usa otra tienda. |
