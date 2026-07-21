# Contrato: Guardar Borrador de Versión

**Método:** `PATCH`  
**Ruta:** `/api/v1/versiones/{id}/guardar`  
**Actor:** Analista  
**Caso de uso:** CU-06-01  

---

## Descripción

Acción de "guardar" en el editor. Si la versión estaba en `borrador`, la avanza a `en_desarrollo`. Si ya estaba en `en_desarrollo` o `piloto`, solo actualiza el timestamp. Versiones `publicadas` o `archivadas` rechazan la operación.

Al avanzar de `borrador` a `en_desarrollo`, archiva automáticamente la versión que ya estuviera en `en_desarrollo` del mismo `planograma_id` + `tipo` (si existe). Mismo mecanismo que ya usa la promoción a `publicado` (ver `POST_versiones_promover.md`).

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

1. `borrador` → `en_desarrollo`: avanza estado + actualiza `updatedAt`. Archiva, en la misma transacción, la versión en `en_desarrollo` anterior del mismo `planograma_id` + `tipo` (si existe).
2. `en_desarrollo` / `piloto` → sin cambio de estado, solo actualiza `updatedAt`.
3. `publicado` / `archivado` → `422`.

---

## Response — 200 OK

```json
{
  "id": 10,
  "estado": "en_desarrollo",
  "updatedAt": "2026-07-10T15:30:00Z",
  "versionAnteriorArchivada": { "id": 8, "codigo": "AUTOS 01-TG" }
}
```

`versionAnteriorArchivada` es `null` cuando no había ninguna versión en `en_desarrollo` que archivar (incluye el caso en que la versión ya estaba en `en_desarrollo`/`piloto` y solo se refrescó el timestamp).

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
