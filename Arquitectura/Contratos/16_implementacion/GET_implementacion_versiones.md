# Contrato: Versiones elegibles en Por versión

**Método:** `GET`  
**Ruta:** `/api/v1/implementacion/versiones`  
**Actor:** Analista  
**Caso de uso:** pendiente de registrar en `CASOS_DE_USO.md` (vista Por versión del Analista)  

---

## Descripción

Alimenta el selector "Planograma versión" de la vista **Por versión** del Analista: la misma tabla
de Productos del Implementador, pero sobre versiones de cualquier planograma y sin tienda fija.
No consulta inventario.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `incluir` | `string` | No | IDs de versión separados por coma (`10,12`) que se agregan aunque no estén publicadas ni en piloto. Los usa la vista cuando llega por enlace ("Ver productos" desde una versión o desde la ficha de un producto). |

---

## Reglas de negocio

1. Versiones = todas las `publicado` y `piloto` de todos los planogramas, más las de `incluir` en
   cualquier estado (borrador, en desarrollo, archivada). Un id de `incluir` que no existe se ignora.
2. Orden: `Planograma.departamento`, `PlanogramaVersion.codigo` (igual que `GET_implementacion_resumen.md`).
3. `totalProductos` = SKUs distintos de posiciones `ACTIVO` (misma regla que el resumen de Mi tienda).
4. `adjuntos` = conteo de `Adjunto` de la versión.
5. `tiendaIds` = tiendas que montan la versión (`VersionTienda`). La vista lo usa para indicar si la
   tienda elegida monta cada versión.

---

## Response — 200 OK

```json
{
  "data": [
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
      "adjuntos": 2,
      "tiendaIds": [11]
    }
  ]
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Algún elemento de `incluir` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
