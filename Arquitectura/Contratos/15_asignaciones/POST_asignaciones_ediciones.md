# Contrato: Guardar edición de asignaciones

**Método:** `POST`  
**Ruta:** `/api/v1/asignaciones/ediciones`  
**Actor:** Analista  
**Caso de uso:** CU-02-05  

---

## Descripción

Guarda de una vez los cambios hechos en la matriz de Estructura ("Guardar asignaciones"). Todos
los cambios forman **una edición**: comparten id, fecha, usuario y motivo en la auditoría.

Cada cambio es una celda planograma × tienda y dice qué debe quedar montado:

| Campo | Efecto |
|-------|--------|
| `versionId: <id>` | Monta esa versión (publicada o piloto). La tienda desmonta cualquier otra versión del planograma. |
| `crearEspecialDesde: <baseId>` | Clona una versión **especial publicada** para la tienda desde esa base (estructura completa), y la monta. |
| `versionId: null` (o sin ninguno de los dos) | Quita el planograma de la tienda. No borra ninguna versión. |

La especial nace **publicada** (decisión de producto): es una copia exacta de una versión ya
publicada, así que la tienda la usa de inmediato y se edita después. Su código es
`{PLANOGRAMA}-T{G|M|E}-{CÓDIGO_TIENDA}`.

Transaccional: o se aplican todos los cambios o ninguno. Los cambios que no modifican la celda
(mismo valor que ya tiene) se ignoran; si ninguno la modifica, `422`.

Usuario: el de la sesión CAO (número de empleado y nombre). Solo si el request no trae usuario se
registra `sistema`.

---

## Request body

```json
{
  "cambios": [
    { "planogramaId": 161, "tiendaId": 3, "versionId": 16111 },
    { "planogramaId": 161, "tiendaId": 4, "crearEspecialDesde": 16102 },
    { "planogramaId": 165, "tiendaId": 2, "versionId": null }
  ],
  "motivo": "Chiquimula remodelada con góndola de 4 m"
}
```

| Campo | Tipo | Requerido | Reglas |
|-------|------|-----------|--------|
| `cambios` | `array` | Sí | 1 a 2000 elementos; cada celda a lo sumo una vez. |
| `cambios[].planogramaId` | `integer` | Sí | |
| `cambios[].tiendaId` | `integer` | Sí | Tienda activa. |
| `cambios[].versionId` | `integer \| null` | No | Excluyente con `crearEspecialDesde`. |
| `cambios[].crearEspecialDesde` | `integer` | No | Versión base (`version_base_id IS NULL`) publicada del mismo planograma. |
| `motivo` | `string` | No | Máx. 500. Queda en el historial de todos los cambios de la edición. |

---

## Response — 201 Created

```json
{
  "edicionId": 152,
  "fecha": "2026-09-26T15:45:00.000Z",
  "cambios": 3,
  "especialesCreadas": [
    { "versionId": 16144, "codigo": "AUTOS 01-TM-T0QM", "planogramaId": 161, "tiendaId": 4 }
  ]
}
```

El front muestra el id como `ED-000152`.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Body inválido, `cambios` vacío, `versionId` y `crearEspecialDesde` juntos, o una celda repetida. |
| `404 Not Found` | Tienda, planograma o versión no existe. |
| `409 Conflict` | `crearEspecialDesde`: la tienda ya tiene una especial derivada de esa base (en cualquier estado). |
| `422 Unprocessable` | Tienda inactiva, planograma archivado, versión de otro planograma, versión no montable (ni publicada ni piloto), especial de otra tienda, base para especial no publicada o no base, o ningún cambio modifica la asignación. |

---

## Auditoría

Un registro en `AsignacionAuditoria` por cambio aplicado, con la versión anterior y la nueva (id,
código y estado de ese momento). Acciones:

| Acción | Cuándo |
|--------|--------|
| `ASIGNACION` | Celda vacía → versión publicada. |
| `CAMBIO` | Versión publicada → otra publicada. |
| `RETIRO` | Versión → vacía. |
| `CREACION_ESPECIAL` | Se clona una especial nueva. |
| `ENTRADA_PILOTO` | Cualquier estado → versión en piloto. |
| `SALIDA_PILOTO` | Versión en piloto → versión publicada. |
| `PILOTO_PUBLICADO` | La misma versión pasa de piloto a publicada (solo automático, al publicar). |

`EdicionAsignacion.origen` es `MANUAL` para este endpoint. Los otros caminos que mueven tiendas
también auditan: `VERSION` (`PUT /versiones/:id/tiendas`), `PILOTO` y `PUBLICACION`
(`POST /versiones/:id/promover`).

**Promover a piloto desde Estructura no usa este endpoint.** Una versión en desarrollo no es
montable (este endpoint responde `422`), así que en el modo promoción de Estructura
(`/estructura?planogramaId=…&versionId=…&modo=promover`) el guardado llama a
`POST /versiones/:id/promover` con las tiendas pintadas. En el modo de ajuste de un piloto
(`modo=piloto`) la versión ya es montable y el guardado sí usa este endpoint; el front no deja
guardar si el piloto queda sin tiendas.
