# Contrato: Editar Metadatos de Versión

**Método:** `PATCH`  
**Ruta:** `/api/v1/versiones/{id}`  
**Actor:** Analista  

---

## Descripción

Modifica los metadatos editables de una versión: notas y código personalizado. No cambia el estado ni la estructura. Partial update — solo los campos enviados se modifican.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

### Body (JSON) — todos opcionales

| Campo | Tipo | Validación |
|-------|------|------------|
| `notas` | `string \| null` | Máximo 500 chars. `null` limpia el campo. |
| `codigo` | `string` | Máximo 50 chars. Único por planograma. |

---

## Reglas de negocio

1. Una versión `archivada` no puede editarse → `422`.
2. El `codigo` debe ser único entre las versiones del mismo planograma.
3. El `tipo` y el `estado` no se pueden cambiar con este endpoint.
4. Si no se envía ningún campo, retorna `400`.

---

## Request JSON

```json
{
  "notas": "Ajustado para inauguración Majadas"
}
```

---

## Response — 200 OK

```json
{
  "id": 10,
  "codigo": "AUTOS 01-TG",
  "estado": "en_desarrollo",
  "notas": "Ajustado para inauguración Majadas"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Body vacío o campos inválidos. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `409 Conflict` | El `codigo` ya existe en otra versión del mismo planograma. |
| `422 Unprocessable Entity` | Versión archivada. |

---

## Anotaciones de arquitectura

> **[SOLID — SRP]**  
> Este PATCH solo actualiza metadatos. Los cambios de estado (guardar, promover, publicar) tienen sus propios endpoints de acción. No mezclar ambas responsabilidades en un solo PATCH genérico.

> **[CLEAN CODE]**  
> Validar en el Application Service que al menos un campo esté presente antes de llamar al repositorio.
