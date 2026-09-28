# Contrato: Resumen de implementación de una tienda (Mi tienda)

**Método:** `GET`  
**Ruta:** `/api/v1/tiendas/{tiendaId}/implementacion`  
**Actor:** Implementador  
**Caso de uso:** CU-07-01  

---

## Descripción

Alimenta la vista **Mi tienda** del Implementador: lista las versiones de planograma que la tienda
tiene asignadas (`VersionTienda`) y, por cada una, cuántos productos tiene, cuántos tienen
inventario en la tienda y si **se puede implementar**.

A diferencia de `GET /tiendas/{tiendaId}/planogramas` (solo `publicado`), aquí entran las
versiones `publicado` **y** `piloto`: por la regla de asignaciones (módulo 15) una tienda monta una
sola versión por planograma, así que la tienda ve exactamente la que le toca montar — si tiene el
piloto, solo el piloto; si tiene la TM, solo la TM.

La tienda del Implementador la elige el propio usuario en el front (selector recordado en el
navegador); el backend no la deduce del JWT (ver `SEQ_CU-07_consulta_implementadores.mmd`).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `tiendaId` | `integer` | Sí |

---

## Reglas de negocio

1. Versiones = filas de `VersionTienda` de la tienda cuya `PlanogramaVersion.estado` es
   `publicado` o `piloto`. Ordenadas por `Planograma.departamento`, luego `PlanogramaVersion.codigo`.
2. **Productos de la versión** = SKUs distintos de sus posiciones (`Posicion` → `Nivel` → `Gondola`)
   con `sku` no nulo y `decision = 'ACTIVO'`. Las posiciones `PENDIENTE` (sin SKU) y las
   `INACTIVO` no cuentan.
3. **Inventario** = stock SAP del SKU en el centro de la tienda. Se consulta **una sola vez** por
   request a CATI `POST /api/Stock/sap/bulkInventoryReport?profile=CEMACO` con todos los SKUs de
   todas las versiones, y se toma la fila cuyo `centroId` coincide con `Tienda.codigo` (código de 4
   caracteres, ej. `T0PC`, `T007`, `TJ10`; comparación sin distinguir mayúsculas ni espacios).
   Un SKU **tiene inventario** si su `stock` (string de SAP, convertido a número) es `> 0`. Un SKU
   sin fila para la tienda cuenta como sin inventario.
   **Caché:** el backend guarda en memoria el stock de cada SKU (todas las filas de centros) por
   **2 horas**; solo se consultan a CATI los SKUs sin caché vigente, en lotes de 200 en paralelo, y
   dos requests simultáneos con los mismos SKUs comparten la misma consulta. Cada lote se resuelve
   por separado (un lote fallido no descarta los que respondieron).
   `inventarioActualizadoEn` = fecha del dato más antiguo usado (`null` si no hay productos o en
   modo degradado).
4. `porcentajeInventario = conInventario / totalProductos × 100` (redondeado a 1 decimal).
   `implementable = porcentajeInventario > 85` (estrictamente mayor). Una versión con 0 productos
   tiene `porcentajeInventario = 0` e `implementable = false`.
5. **Inventario desactualizado:** si CATI falla pero todos los SKUs tienen un dato previo en caché
   (de hasta 24 horas), se responde con ese dato: `inventarioDisponible: true`,
   `inventarioDesactualizado: true` y `advertencia`. Tras un fallo, durante 5 minutos no se
   reintenta CATI para los SKUs que ya tienen dato (se responde sin esperar el timeout).
6. **Modo degradado:** si CATI no responde o falla y algún SKU no tiene dato en caché, **no** se
   responde `503`: se responde `200` con `inventarioDisponible: false`, `advertencia` con el
   motivo, y `conInventario`, `porcentajeInventario` e `implementable` en `null`. El Implementador
   puede seguir viendo sus planogramas, adjuntos y evidencia.
7. `adjuntos` = conteo de `Adjunto` de la versión. `evidencias` = conteo de
   `EvidenciaImplementacion` de la versión **en esta tienda** (ver `17_evidencias/`). Por góndola se
   devuelve también su conteo, para el avance "2 de 3 góndolas con foto".

---

## Response — 200 OK

```json
{
  "tienda": { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE" },
  "umbralImplementable": 85,
  "inventarioDisponible": true,
  "inventarioDesactualizado": false,
  "inventarioActualizadoEn": "2026-09-28T14:05:12.000Z",
  "planogramas": [
    {
      "versionId": 10,
      "codigo": "AUTOS 01-TG",
      "tipo": "GRANDE",
      "estado": "publicado",
      "esEspecial": false,
      "planogramaId": 42,
      "nombre": "Autos · Limpieza exterior",
      "departamento": "AUTOS",
      "totalProductos": 10,
      "conInventario": 9,
      "porcentajeInventario": 90,
      "implementable": true,
      "adjuntos": 2,
      "evidencias": 3,
      "gondolas": [
        { "id": 101, "nombre": "Góndola 1", "orden": 1, "evidencias": 2 },
        { "id": 102, "nombre": "Góndola 2", "orden": 2, "evidencias": 1 }
      ]
    }
  ]
}
```

## Response — 200 OK (CATI falló, se sirve el último dato en caché)

```json
{
  "tienda": { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE" },
  "umbralImplementable": 85,
  "inventarioDisponible": true,
  "inventarioDesactualizado": true,
  "inventarioActualizadoEn": "2026-09-28T09:40:03.000Z",
  "advertencia": "No se pudo actualizar el inventario, se muestra el último disponible",
  "planogramas": [ { "...": "igual que el caso normal" } ]
}
```

## Response — 200 OK (CATI no disponible)

```json
{
  "tienda": { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE" },
  "umbralImplementable": 85,
  "inventarioDisponible": false,
  "inventarioDesactualizado": false,
  "inventarioActualizadoEn": null,
  "advertencia": "Inventario no disponible en este momento",
  "planogramas": [
    { "versionId": 10, "codigo": "AUTOS 01-TG", "totalProductos": 10, "conInventario": null,
      "porcentajeInventario": null, "implementable": null, "...": "resto igual" }
  ]
}
```

`planogramas: []` cuando la tienda no tiene versiones publicadas ni piloto asignadas.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `tiendaId` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La tienda no existe o está inactiva. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]** El caso de uso (`domain/implementacion/implementacion.usecases.js`) recibe por
> inyección el repositorio (versiones asignadas, SKUs, conteos) y un **puerto de inventario**
> (`obtenerInventarioTienda(codigoTienda, skus)`), cuya implementación concreta usa
> `catiClient`. La regla del 85 % y el cálculo del porcentaje viven en
> `domain/implementacion/implementacion.entity.js`, sin dependencias externas.

> **[ANTI-CORRUPCIÓN]** La forma de respuesta de `bulkInventoryReport` no está documentada en el
> swagger de CATI; `catiClient` la normaliza a `[{ sku, centroId, stock }]` aceptando tanto un
> arreglo plano de filas `InventarioSap` como filas agrupadas por SKU.
