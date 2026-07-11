# Contrato: Guardar Borrador de Versión

**Método:** `PATCH`  
**Ruta:** `/api/v1/versiones/{id}/guardar`  
**Actor:** Analista  
**Caso de uso:** CU-06-01  

---

## Descripción

Acción de "guardar" en el editor. Si la versión estaba en `borrador`, la avanza a `en_desarrollo`. Si ya estaba en `en_desarrollo` o `piloto`, solo actualiza el timestamp. Versiones `publicadas` o `archivadas` rechazan la operación.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body

Sin body.

---

## Reglas de negocio

1. `borrador` → `en_desarrollo`: avanza estado + actualiza `updatedAt`.
2. `en_desarrollo` / `piloto` → sin cambio de estado, solo actualiza `updatedAt`.
3. `publicado` / `archivado` → `422`.

---

## Response — 200 OK

```json
{
  "id": 10,
  "estado": "en_desarrollo",
  "updatedAt": "2026-07-10T15:30:00Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | Versión publicada o archivada. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Acción semántica]**  
> Este endpoint existe porque "guardar" tiene semántica de negocio (no solo persistencia). El frontend llama a este endpoint explícitamente con el botón "Guardar", no automáticamente en cada mutación. Las mutaciones CRUD de CU-03/CU-04 ya persisten en tiempo real.

> **[SOLID — SRP]**  
> Separar `GuardarVersionUseCase` de `PromoverVersionUseCase`. Aunque ambos cambian el estado, sus reglas y efectos secundarios son distintos.
