# Contrato: Reemplazar Tiendas Asignadas a una Versión

**Método:** `PUT`  
**Ruta:** `/api/v1/versiones/{id}/tiendas`  
**Actor:** Analista  
**Caso de uso:** CU-02-05  

---

## Descripción

Reemplaza el listado completo de tiendas asignadas a la versión. Hace DELETE de todas las asignaciones actuales e INSERT de las nuevas en una transacción. Una versión archivada no puede modificarse.

> **Uso desde el front:** la asignación de tiendas a una versión se hace en **Estructura** (matriz
> planograma × tienda): el conteo de tiendas de la tabla de versiones lleva allá ya filtrado al
> planograma (en modo piloto si la versión está en piloto). Este endpoint queda para integraciones,
> pruebas y el resto de la API.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tiendaIds` | `integer[]` | Sí | IDs de tiendas a asignar. Array vacío desasigna todas. |

---

## Reglas de negocio

1. Versión archivada → `422`.
2. Una tienda puede asignarse a una versión sin importar su `tipo` (no se valida coincidencia).
3. IDs inexistentes son ignorados silenciosamente (o retornan advertencia — a decisión de implementación; se recomienda retornar advertencia).
4. La operación es idempotente: llamar dos veces con los mismos IDs produce el mismo resultado.
5. Una versión en `piloto` puede quedar sin tiendas con `tiendaIds: []`, pero así no se puede publicar (`POST /versiones/{id}/promover` responde `422`). Estructura no deja guardar un piloto sin tiendas.
6. Si la versión está `publicado` o `piloto`, aplica la regla "una tienda monta una sola versión por planograma": cada tienda agregada desmonta la versión que tenía del planograma. Las tiendas agregadas y quitadas se auditan en una edición con `origen = VERSION` (ver `15_asignaciones/`). En otros estados la lista se reemplaza tal cual, sin auditoría.

---

## Request JSON

```json
{
  "tiendaIds": [1, 3, 7]
}
```

---

## Response — 200 OK

```json
{
  "versionId": 10,
  "tiendas": [
    { "id": 1, "codigo": "GTM-PRA", "nombre": "Cemaco Pradera" },
    { "id": 3, "codigo": "GTM-MIR", "nombre": "Cemaco Miraflores" }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tiendaIds` no es un array o contiene valores no enteros. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | Versión archivada. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — PUT semántico]**  
> PUT implica reemplazo total. Documentar explícitamente que enviar `tiendaIds: []` desasigna todas las tiendas — es un comportamiento esperado, no un bug.

> **[CLEAN CODE — Transacción]**  
> DELETE + INSERT en la misma transacción. Si algún INSERT falla, el DELETE no debe persistir.

> **[SOLID — Tell Don't Ask]**  
> La versión debe exponer `puedeModificarTiendas(): boolean` basado en su estado, en lugar de que el servicio consulte el estado y decida.
