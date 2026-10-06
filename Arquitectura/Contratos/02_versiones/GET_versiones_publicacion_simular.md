# Contrato: Simular Publicación de Versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/publicacion/simular`  
**Actor:** Analista  
**Caso de uso:** CU-02-04 (→ publicado)  

---

## Descripción

Calcula, **sin escribir nada**, qué pasaría al publicar una versión en piloto: los errores bloqueantes que lo impedirían, la versión publicada anterior que se archivaría y qué tiendas quedan con la versión.

Lo usa el modal **Publicar** del detalle del planograma para mostrar el impacto antes de confirmar:
- "N tiendas piloto se actualizan a publicado" → `tiendasPiloto`.
- "M tiendas de la versión anterior se actualizarán a la nueva" → `tiendasMigran`.
- La versión que se archiva → `versionAnterior` (o "Ninguna").
- Con `erroresBloqueantes` el modal solo los lista y no ofrece publicar.

La publicación real la hace [POST_versiones_promover.md](POST_versiones_promover.md) con `estadoDestino = "publicado"`.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión en piloto. |

---

## Reglas de negocio

1. La versión debe estar en `piloto` (misma transición que publicar) → `422` si no.
2. Responde `200` **aun con errores bloqueantes**, para que el front los muestre antes de ofrecer "Publicar".
3. `versionAnterior`: versión base `publicado` del mismo `planograma_id + tipo` que se archivaría. `null` si no existe o si la versión es especial por tienda (las especiales no archivan ninguna anterior).
4. `tiendasPiloto`: tiendas que hoy montan esta versión en piloto; al publicar la quedan publicada.
5. `tiendasMigran`: tiendas que hoy montan la publicada anterior y **no** están en el piloto; al publicar pasan a esta versión.
6. `totalTiendas = tiendasPiloto + tiendasMigran`. Nunca repite tiendas: una tienda monta una sola versión por planograma.
7. Usa el mismo cálculo que la publicación real (`calcularPlanPublicacion`), así que siempre coincide con lo que haría `POST /versiones/{id}/promover`.
8. No valida que el piloto tenga tiendas: con `tiendasPiloto` vacío el front deshabilita "Publicar" y el `POST` respondería `422`.

---

## Response — 200 OK

```json
{
  "versionId": 10,
  "codigo": "DUCHAS-TG-02",
  "tipo": "GRANDE",
  "esEspecial": false,
  "erroresBloqueantes": [],
  "advertencias": [{ "codigo": "PRODUCTOS_POR_UBICAR", "mensaje": "Hay 3 producto(s) en la góndola \"Por ubicar\" sin su lugar definitivo en el lienzo" }],
  "versionAnterior": { "id": 8, "codigo": "DUCHAS-TG" },
  "tiendasPiloto": [
    { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE", "marca": "Cemaco" }
  ],
  "tiendasMigran": [
    { "id": 2, "codigo": "T007", "nombre": "Cemaco Oakland", "tipo": "GRANDE", "marca": "Cemaco" }
  ],
  "totalTiendas": 2
}
```

`advertencias` no impiden publicar (hoy: `PRODUCTOS_POR_UBICAR` si quedan productos en la góndola
"Por ubicar" del importador de productos; el Implementador los ve con sus números de gancho).

Las tiendas vienen ordenadas por nombre. `erroresBloqueantes` tiene la misma forma que el `details` del `422` de promover: `{ posicionId, sku, gondola, nivel, error }`.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `id` no es un entero positivo. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | La versión no está en `piloto`. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Sin duplicar reglas]**  
> El caso de uso `simularPublicacion` valida la transición con `validarTransicionPromover(estado, PUBLICADO)` y combina `buscarErroresBloqueantes` con `versionRepo.simularPublicacion`, que ejecuta `calcularPlanPublicacion` fuera de una transacción. `promoverAPublicado` usa la misma función dentro de la suya.

> **[REST — Solo lectura]**  
> Es un `GET` idempotente y sin efectos: se puede llamar cada vez que se abre el modal.
