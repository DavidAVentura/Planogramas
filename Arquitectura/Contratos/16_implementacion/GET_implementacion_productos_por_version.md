# Contrato: Productos por versión (vista Por versión del Analista)

**Método:** `GET`  
**Ruta:** `/api/v1/implementacion/productos`  
**Actor:** Analista  
**Caso de uso:** pendiente de registrar en `CASOS_DE_USO.md` (vista Por versión del Analista)  

---

## Descripción

Las mismas filas que `GET_implementacion_productos.md` (una por posición con SKU), para versiones de
cualquier planograma y en cualquier estado. La tienda es **opcional** y solo agrega inventario: no
limita qué versiones se pueden ver. Sirve para responder "si esta versión se monta en esa tienda,
¿hay stock?".

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `versionIds` | `string` | Sí | IDs de versión separados por coma (`10,12`). Máximo 50. |
| `tiendaId` | `integer` | No | Tienda cuyo inventario se agrega. Sin ella, los campos de inventario van en `null`. |

---

## Reglas de negocio

1. Cada `versionId` debe existir (cualquier estado); si alguno no existe → `404 NOT_FOUND` con los
   IDs en `details.versionIds`. **No** se valida que la versión esté asignada a la tienda.
2. Si viene `tiendaId`, la tienda debe existir y estar activa → si no, `404 NOT_FOUND`.
3. Filas (`data`): mismas reglas 2 a 5 de `GET_implementacion_productos.md` (mismo código, función
   `armarFilasProductos` en `implementacion.usecases.js`).
4. Inventario:
   - **Sin tienda:** no se consulta CATI. `tienda: null`, `inventario` y `conInventario` en `null`,
     `inventarioDisponible: true` (no es modo degradado: simplemente no se pidió).
   - **Con tienda:** misma consulta, caché y modo degradado que `GET_implementacion_productos.md` (regla 6).
5. `versiones`: un resumen por versión pedida, con la forma de `planogramas[]` de
   `GET_implementacion_resumen.md` más `montadaEnTienda`:
   - `totalProductos`, `adjuntos` siempre;
   - `conInventario`, `porcentajeInventario`, `implementable` solo con tienda e inventario disponible
     (si no, `null`);
   - `evidencias` y `gondolas` (con sus fotos en la tienda) solo con tienda (si no, `0` y `[]`);
   - `montadaEnTienda`: `true`/`false` según `VersionTienda`; `null` sin tienda.

---

## Response — 200 OK

```json
{
  "tienda": { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE" },
  "umbralImplementable": 85,
  "inventarioDisponible": true,
  "inventarioDesactualizado": false,
  "inventarioActualizadoEn": "2026-10-06T14:05:12.000Z",
  "versiones": [
    {
      "versionId": 11,
      "codigo": "AUTOS 01-TG",
      "tipo": "GRANDE",
      "estado": "piloto",
      "esEspecial": false,
      "planogramaId": 1,
      "nombre": "AUTOS 01",
      "departamento": "Automotriz",
      "totalProductos": 46,
      "conInventario": 40,
      "porcentajeInventario": 87,
      "implementable": true,
      "adjuntos": 2,
      "evidencias": 0,
      "gondolas": [{ "id": 101, "nombre": "Góndola 1", "orden": 1, "evidencias": 0 }],
      "montadaEnTienda": false
    }
  ],
  "total": 1,
  "data": [
    { "posicionId": 5501, "versionId": 11, "sku": "1200101", "inventario": 24, "conInventario": true }
  ]
}
```

Cada elemento de `data` tiene la forma completa descrita en `GET_implementacion_productos.md`
(aquí abreviada).

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Falta `versionIds`, trae más de 50, o algún elemento (o `tiendaId`) no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | Algún `versionId` no existe. |
| `404` | `NOT_FOUND` | La tienda no existe o está inactiva. |
