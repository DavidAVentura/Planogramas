# Contrato: Promover Estado de Versión

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{id}/promover`  
**Actor:** Analista  
**Casos de uso:** CU-02-03 (→ piloto) / CU-02-04 (→ publicado)  

---

## Descripción

Avanza el estado de la versión al siguiente en el ciclo de vida: `en_desarrollo → piloto` o `piloto → publicado`. El body determina el estado destino y, cuando aplica, las tiendas piloto y el motivo que queda en la auditoría.

El archivado automático de la "anterior" descrito abajo solo aplica cuando la versión promovida es de la **línea base** (sin `versionBaseId`) — las versiones especiales por tienda nunca archivan ninguna anterior, ni compiten por el estado con otras especiales ni con la base.

Cuando pasa a `piloto`:
- Si es línea base, archiva automáticamente la versión base en `piloto` anterior del mismo planograma + tipo (mismo mecanismo que el archivado al publicar).

Cuando pasa a `publicado`:
- Si es línea base, archiva automáticamente la versión base publicada anterior del mismo planograma + tipo.
- Valida errores bloqueantes y que el piloto tenga tiendas antes de proceder.

**Desde dónde se llama en el front:**
- **A piloto:** desde **Estructura** en modo promoción (`/estructura?planogramaId={pid}&versionId={id}&modo=promover`). El Analista pinta en la matriz las tiendas del piloto y, al guardar, el front envía este request con esas tiendas y el motivo del resumen. Durante la promoción solo se edita esa versión, así el guardado es una sola llamada atómica.
- **A publicado:** desde el modal "Publicar" del detalle del planograma, que antes muestra el impacto con [GET_versiones_publicacion_simular.md](GET_versiones_publicacion_simular.md).

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
| `tiendaIds` | `integer[]` | Condicional | Requerido cuando `estadoDestino = "piloto"`. Mínimo 1 tienda. Se ignora al publicar. |
| `motivo` | `string \| null` | No | Motivo de la edición auditada (máx. 500). Si falta o viene vacío se usa uno por defecto: "Promoción a piloto de {codigo}" / "Publicación de {codigo}". |

---

## Reglas de negocio — promover a piloto

1. El estado actual debe ser `en_desarrollo` → `422` si no.
2. `tiendaIds` requerido, al menos 1 tienda.
3. Las tiendas **pueden ser de cualquier tipo**: no se valida que coincidan con el `tipo` de la versión. El front avisa cuando una tienda es de otro tipo ("versión distinta al tipo de tienda") para que se verifique el espacio del mueble.
4. Reemplaza el listado completo de tiendas asignadas en la operación. Los ids que no existen se ignoran.
5. Si la versión es de línea base, archiva la versión base `piloto` anterior del mismo `planograma_id + tipo` (si existe). Las versiones especiales por tienda no archivan ninguna anterior. Operación atómica (transacción).
6. Una tienda monta una sola versión por planograma: cada tienda piloto **desmonta** la versión publicada o piloto que tuviera de ese planograma y monta esta.
7. Las tiendas de la piloto anterior archivada que no siguen en el piloto nuevo vuelven a la versión publicada del mismo tipo (o quedan sin el planograma si no existe).
8. Cada movimiento de tienda se audita en una edición con `origen = PILOTO` y el `motivo` recibido (ver `15_asignaciones/`).

## Reglas de negocio — promover a publicado

1. El estado actual debe ser `piloto` → `422` si no.
2. Valida errores bloqueantes: posiciones con `min_final > max_final`. Si hay errores, retorna `422` con el detalle en `error.details`.
3. La versión en piloto debe tener **al menos una tienda** → `422` si no (si nadie la probó, el piloto no aportó nada).
4. Si la versión es de línea base, archiva la versión base `publicado` anterior del mismo `planograma_id + tipo` (si existe). Las versiones especiales por tienda no archivan ninguna anterior.
5. **Resultado = tiendas del piloto ∪ tiendas de la publicada anterior, sin repetir.** Las tiendas que probaban esta versión en piloto la quedan publicada (`PILOTO_PUBLICADO`); las tiendas que hoy montan la publicada anterior que se archiva pasan a esta (`CAMBIO`). Como una tienda monta una sola versión por planograma, una tienda del piloto nunca cuenta también como de la anterior. Ej.: anterior en 10 tiendas y piloto en 3 tiendas distintas → queda en 13; si el piloto corrió en 3 de esas 10, la anterior hoy monta 7 y queda en 10.
6. Todo se audita en una edición con `origen = PUBLICACION`, el usuario de la sesión y el `motivo` recibido.
7. Operación atómica (transacción). El cálculo de qué tiendas quedan (paso 5) es el mismo que usa la simulación (`calcularPlanPublicacion`), así que el modal del front y la publicación real siempre coinciden.

---

## Request JSON — promover a piloto

```json
{
  "estadoDestino": "piloto",
  "tiendaIds": [1, 3, 7],
  "motivo": "Piloto en tiendas remodeladas"
}
```

## Request JSON — promover a publicado

```json
{
  "estadoDestino": "publicado",
  "motivo": "Piloto aprobado en Pradera y Oakland"
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

En ambos casos la respuesta trae además los demás campos de la versión (`planogramaId`, `tipo`, `codigo`, `versionBaseId`, `notas`, fechas).

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `estadoDestino` inválido, `tiendaIds` vacío para piloto, `motivo` de más de 500 caracteres. |
| `401 Unauthorized` | JWT ausente. |
| `403 Forbidden` | Usuario sin rol Analista. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | Estado actual incorrecto. |
| `422 Unprocessable Entity` | Errores bloqueantes al publicar (detalle en `error.details`). |
| `422 Unprocessable Entity` | Publicar una versión en piloto sin tiendas. |

```json
// 422 — errores bloqueantes al publicar
{
  "error": {
    "code": "UNPROCESSABLE",
    "message": "Existen errores bloqueantes que impiden publicar",
    "details": [
      {
        "posicionId": 15,
        "sku": "10012345",
        "gondola": "Góndola A",
        "nivel": 2,
        "error": "min_final (5) > max_final (4)"
      }
    ]
  }
}
```

```json
// 422 — piloto sin tiendas
{
  "error": {
    "code": "UNPROCESSABLE",
    "message": "La versión en piloto no tiene tiendas; asigna al menos una tienda piloto antes de publicar"
  }
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Patrón State Machine]**  
> El ciclo `borrador → en_desarrollo → piloto → publicado → archivado` es una máquina de estados. Modelarlo explícitamente en la entidad `PlanogramaVersion` con un método `promover(estadoDestino)` que lanza `TransicionInvalidaException` si la transición no es permitida.

> **[SOLID — SRP]**  
> Las reglas para publicar (errores bloqueantes y piloto con tiendas) viven en `validarPublicable` del caso de uso, separadas de la transición de estado. La simulación reutiliza `buscarErroresBloqueantes` y el mismo plan de publicación.

> **[CLEAN CODE — Transacción crítica]**  
> El archivado de la versión anterior y la promoción de la nueva deben ocurrir en la misma transacción. Si una falla, ninguna debe persistir.

> **[CLEAN CODE — Sin duplicar reglas]**  
> `calcularPlanPublicacion(conn, id)` (repositorio de versiones) calcula la anterior, las tiendas del piloto y las que migran sin escribir nada. `promoverAPublicado` lo ejecuta dentro de su transacción y `simularPublicacion` fuera de ella.

> **[SOLID — OCP]**  
> Si en el futuro se agregan nuevas validaciones bloqueantes, deben agregarse como nuevos `IValidadorPublicacion` sin modificar el caso de uso principal (lista de validadores inyectable).
