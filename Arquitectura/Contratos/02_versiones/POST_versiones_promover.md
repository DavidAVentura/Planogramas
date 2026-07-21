# Contrato: Promover Estado de Versión

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{id}/promover`  
**Actor:** Analista  
**Casos de uso:** CU-02-03 (→ piloto) / CU-02-04 (→ publicado)  

---

## Descripción

Avanza el estado de la versión al siguiente en el ciclo de vida: `en_desarrollo → piloto` o `piloto → publicado`. El body determina el estado destino y, cuando aplica, las tiendas piloto.

El archivado automático de la "anterior" descrito abajo solo aplica cuando la versión promovida es de la **línea base** (sin `versionBaseId`) — las versiones especiales por tienda nunca archivan ninguna anterior, ni compiten por el estado con otras especiales ni con la base.

Cuando pasa a `piloto`:
- Si es línea base, archiva automáticamente la versión base en `piloto` anterior del mismo planograma + tipo (mismo mecanismo que el archivado al publicar).

Cuando pasa a `publicado`:
- Si es línea base, archiva automáticamente la versión base publicada anterior del mismo planograma + tipo.
- Valida errores bloqueantes antes de proceder.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión a promover. |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `estadoDestino` | `string` | Sí | `piloto` o `publicado`. |
| `tiendaIds` | `integer[]` | Condicional | Requerido cuando `estadoDestino = "piloto"`. Mínimo 1 tienda. |

---

## Reglas de negocio — promover a piloto

1. El estado actual debe ser `en_desarrollo` → `422` si no.
2. `tiendaIds` requerido, al menos 1 tienda.
3. Las tiendas deben ser del mismo `tipo` que la versión.
4. Reemplaza el listado completo de tiendas asignadas en la operación.
5. Si la versión es de línea base, archiva la versión base `piloto` anterior del mismo `planograma_id + tipo` (si existe). Las versiones especiales por tienda no archivan ninguna anterior. Operación atómica (transacción).

## Reglas de negocio — promover a publicado

1. El estado actual debe ser `piloto` → `422` si no.
2. Valida errores bloqueantes: posiciones con `min_final > max_final`. Si hay errores, retorna `422` con el detalle.
3. Si la versión es de línea base, archiva la versión base `publicado` anterior del mismo `planograma_id + tipo` (si existe). Las versiones especiales por tienda no archivan ninguna anterior.
4. Operación atómica (transacción).

---

## Request JSON — promover a piloto

```json
{
  "estadoDestino": "piloto",
  "tiendaIds": [1, 3, 7]
}
```

## Request JSON — promover a publicado

```json
{
  "estadoDestino": "publicado"
}
```

---

## Response — 200 OK (a piloto)

```json
{
  "id": 10,
  "estado": "piloto",
  "tiendas": [
    { "id": 1, "nombre": "Cemaco Pradera" },
    { "id": 3, "nombre": "Cemaco Miraflores" }
  ],
  "versionAnteriorArchivada": { "id": 9, "codigo": "AUTOS 01-TG" }
}
```

`versionAnteriorArchivada` es `null` cuando no había ninguna versión en `piloto` que archivar.

## Response — 200 OK (a publicado)

```json
{
  "id": 10,
  "estado": "publicado",
  "versionAnteriorArchivada": { "id": 8, "codigo": "AUTOS 01-TG" }
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `estadoDestino` inválido, `tiendaIds` vacío para piloto. |
| `401 Unauthorized` | JWT ausente. |
| `403 Forbidden` | Usuario sin rol Analista. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | Estado actual incorrecto, o hay errores bloqueantes al publicar. |

```json
// 422 — errores bloqueantes al publicar
{
  "error": "Existen errores bloqueantes que impiden publicar",
  "erroresBloqueantes": [
    {
      "posicionId": 15,
      "sku": "10012345",
      "gondola": "Góndola A",
      "nivel": 2,
      "error": "min_final (5) > max_final (4)"
    }
  ]
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Patrón State Machine]**  
> El ciclo `borrador → en_desarrollo → piloto → publicado → archivado` es una máquina de estados. Modelarlo explícitamente en la entidad `PlanogramaVersion` con un método `promover(estadoDestino)` que lanza `TransicionInvalidaException` si la transición no es permitida.

> **[SOLID — SRP]**  
> La validación de errores bloqueantes es responsabilidad de un `ValidadorPublicacion` separado. No mezclarla con la lógica de transición de estado.

> **[CLEAN CODE — Transacción crítica]**  
> El archivado de la versión anterior y la promoción de la nueva deben ocurrir en la misma transacción. Si una falla, ninguna debe persistir.

> **[SOLID — OCP]**  
> Si en el futuro se agregan nuevas validaciones bloqueantes, deben agregarse como nuevos `IValidadorPublicacion` sin modificar el caso de uso principal (lista de validadores inyectable).
