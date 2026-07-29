# Contrato: Archivar Versión

**Método:** `POST`
**Ruta:** `/api/v1/versiones/{id}/archivar`
**Actor:** Analista
**Caso de uso:** CU-02-07

---

## Descripción

Marca la versión como `archivado` directamente, a pedido del Analista, sin esperar a que otra
versión la reemplace (a diferencia del archivado automático que ya ocurre como efecto colateral de
`POST /versiones/{id}/promover` y `PATCH /versiones/{id}/guardar` — ver
[[POST_versiones_promover]] y [[PATCH_versiones_guardar]]). Útil para retirar una versión que ya no
se va a seguir trabajando (ej. un borrador descartado) sin tener que promoverla primero.

No elimina datos: góndolas, niveles, posiciones y tiendas asignadas quedan intactos para consulta
histórica.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión a archivar. |

### Headers

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer {jwt}` | Sí |

### Body

Sin body (operación de acción/comando).

---

## Reglas de negocio

1. El estado actual debe ser `borrador`, `en_desarrollo` o `piloto` → `422` si no.
2. Una versión `publicado` **no** se puede archivar con este endpoint — solo se archiva
   automáticamente cuando otra versión del mismo `planograma_id + tipo` la reemplaza vía
   `/promover`. Esto evita que un Analista retire por error una versión que las tiendas puedan
   estar usando activamente.
3. Una versión ya `archivado` retorna `422` (no hay operación "desarchivar").
4. No reemplaza tiendas asignadas ni las desasigna — quedan como registro histórico, igual que en
   el archivado automático de `/promover`.
5. La unicidad "una versión por estado por planograma+tipo" (índices `UQ_Version_borrador`,
   `UQ_Version_en_desarrollo`, `UQ_Version_piloto`) libera el slot correspondiente, permitiendo
   crear o promover una nueva versión a ese estado inmediatamente después.

---

## Response — 200 OK

```json
{
  "id": 10,
  "planogramaId": 42,
  "tipo": "GRANDE",
  "codigo": "AUTOS 01-TG",
  "estado": "archivado",
  "notas": null,
  "versionBaseId": null,
  "createdAt": "2026-05-10T14:00:00.000Z",
  "updatedAt": "2026-07-21T09:30:00.000Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `id` no es un entero positivo. |
| `401 Unauthorized` | JWT ausente o inválido. |
| `403 Forbidden` | El usuario no tiene rol de Analista. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | El estado actual es `publicado` o `archivado`. |

```json
// 422 Unprocessable Entity
{
  "error": {
    "code": "UNPROCESSABLE",
    "message": "No se puede archivar una versión en estado 'publicado'"
  }
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — State Machine]**
> Reutiliza el mismo vocabulario de estados que `promover`/`guardar` en `version.entity.js`. La
> transición válida (`borrador`/`en_desarrollo`/`piloto` → `archivado`) se valida en la entidad, no
> en el controlador ni en el repositorio.

> **[CLEAN CODE — Sin duplicar mecanismos]**
> No introduce un nuevo mecanismo de archivado: reutiliza `versionRepo.actualizarEstado`, el mismo
> método que ya usan `guardarVersion` y las transiciones simples. El archivado en cascada de un
> planograma completo (`POST /planogramas/{id}/archivar`) sigue siendo un mecanismo aparte, a nivel
> del agregado Planograma.
