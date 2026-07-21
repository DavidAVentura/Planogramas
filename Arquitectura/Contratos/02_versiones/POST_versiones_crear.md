# Contrato: Crear Versión de Planograma

**Método:** `POST`  
**Ruta:** `/api/v1/planogramas/{id}/versiones`  
**Actor:** Analista  
**Casos de uso:** CU-02-01 / CU-02-02  

---

## Descripción

Crea una nueva versión de planograma. Si se incluye `versionBaseId`, crea una **versión especial por tienda** copiando toda la estructura (góndolas, niveles, posiciones, accesorios) de la versión base. Sin `versionBaseId`, crea una versión vacía.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del planograma padre. |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tipo` | `string` | Sí | Tipo de tienda objetivo. Valores: `GRANDE`, `MEDIANA`, `EXPRESS`. |
| `notas` | `string` | No | Notas internas. Máximo 500 chars. |
| `versionBaseId` | `integer` | No | Si se envía: copia la estructura de esa versión (CU-02-02). |
| `tiendaId` | `integer` | Condicional | Requerido si se envía `versionBaseId`. Tienda a la que aplica esta versión especial. |

---

## Reglas de negocio

1. No se pueden crear versiones en un planograma `archivado` → `422`.
2. Solo puede existir **una versión en `borrador`** del mismo `tipo` por planograma. Si ya existe, retorna `409`. Sí puede coexistir con versiones del mismo `tipo` en `en_desarrollo`, `piloto` o `publicado` — cada estado admite como máximo una versión por `tipo`, y avanzar una versión de estado archiva automáticamente a la que ocupaba el estado destino (ver `PATCH_versiones_guardar.md` y `POST_versiones_promover.md`).
3. El `codigo` se genera automáticamente con el patrón: `{NOMBRE_PLANOGRAMA}-T{INICIAL_TIPO}` para una versión vacía, y `{NOMBRE_PLANOGRAMA}-T{INICIAL_TIPO}-{CODIGO_TIENDA}` para una versión especial por tienda. Ej: `AUTOS 01-TG` y `AUTOS 01-TG-T010`.
4. Si se envía `versionBaseId`:
   - La versión base debe existir y pertenecer al mismo planograma.
   - Se copia toda la estructura en una transacción única.
   - La tienda (`tiendaId`) no debe tener ya una versión especial derivada de esa base.
5. La nueva versión inicia en estado `borrador`.

---

## Request JSON — versión nueva vacía (CU-02-01)

```json
{
  "tipo": "GRANDE",
  "notas": "Rediseño Q3 2026"
}
```

## Request JSON — versión especial por tienda (CU-02-02)

```json
{
  "tipo": "GRANDE",
  "versionBaseId": 10,
  "tiendaId": 5,
  "notas": "Versión especial Cemaco Majadas"
}
```

---

## Response — 201 Created (versión vacía)

```json
{
  "id": 12,
  "planogramaId": 42,
  "tipo": "GRANDE",
  "codigo": "AUTOS 01-TG",
  "estado": "borrador",
  "notas": "Rediseño Q3 2026",
  "versionBaseId": null,
  "createdAt": "2026-07-10T14:00:00Z"
}
```

## Response — 201 Created (versión especial)

```json
{
  "id": 13,
  "planogramaId": 42,
  "tipo": "GRANDE",
  "codigo": "AUTOS 01-TG-T010",
  "estado": "borrador",
  "notas": "Versión especial Cemaco Majadas",
  "versionBaseId": 10,
  "tiendaAsignada": { "id": 5, "codigo": "T010", "nombre": "Cemaco Majadas" },
  "createdAt": "2026-07-10T14:01:00Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tipo` inválido, `tiendaId` ausente cuando se envía `versionBaseId`, o campos con valores fuera de rango. |
| `401 Unauthorized` | JWT ausente o inválido. |
| `403 Forbidden` | Usuario sin rol de Analista. |
| `404 Not Found` | Planograma o `versionBaseId` no encontrado. |
| `409 Conflict` | Ya existe una versión en borrador del mismo tipo. |
| `422 Unprocessable Entity` | El planograma está archivado. |

```json
// 409 Conflict
{
  "error": "Ya existe una versión en borrador de tipo GRANDE. Archívala o promuévela antes de crear una nueva.",
  "versionActiva": { "id": 11, "codigo": "AUTOS 01-TG", "estado": "borrador" }
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Caso de uso bifurcado]**  
> Considerar dos casos de uso separados: `CrearVersionVaciaUseCase` y `CrearVersionEspecialUseCase` en lugar de un único caso de uso con lógica condicional. El controlador determina cuál invocar según la presencia de `versionBaseId`. Esto aplica **SRP**.

> **[CLEAN CODE — Deep Copy]**  
> La copia de estructura (góndolas → niveles → posiciones → accesorios) debe implementarse como un método `Planograma.clonarVersionEspecial(versionBaseId, tiendaId)` o similar, no como lógica dispersa en el servicio. El ID mapping (oldId → newId) se gestiona en memoria antes de los INSERTs.

> **[SOLID — OCP]**  
> Si en el futuro se necesita clonar parcialmente (solo algunas góndolas), el mecanismo de copia debe ser extensible sin modificar el caso de uso base.

> **[CLEAN CODE — Generación de código]**  
> El patrón `{NOMBRE_PLANOGRAMA}-T{INICIAL}[-{CODIGO_TIENDA}]` debe encapsularse en un `CodigoVersionGenerator` (estrategia), no hardcodeado en el repositorio.
