# Contrato: Productos de la tienda por posición (Productos del Implementador)

**Método:** `GET`  
**Ruta:** `/api/v1/tiendas/{tiendaId}/implementacion/productos`  
**Actor:** Implementador  
**Caso de uso:** CU-07-01, CU-07-02  

---

## Descripción

Alimenta la vista **Productos** del Implementador: una fila por **posición** de las versiones
asignadas a la tienda, con los campos de montaje de `Posicion`, los datos del `Producto` (incluido
`sku_sustituto`) y el inventario del SKU en la tienda.

El orden, los filtros por columna y la configuración de columnas se resuelven en el front; este
endpoint devuelve todas las filas de las versiones pedidas (una tienda tiene a lo sumo algunos
cientos de posiciones), sin paginar.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `tiendaId` | `integer` | Sí |

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `versionIds` | `string` | No | IDs de versión separados por coma (`10,12`). Sin él: todas las versiones asignadas (mismas que `GET_implementacion_resumen.md`, regla 1). |

---

## Reglas de negocio

1. Cada `versionId` pedido debe ser una versión `publicado` o `piloto` asignada a la tienda; si
   alguno no lo es → `404 NOT_FOUND` (con los IDs en `details.versionIds`). El
   Implementador nunca ve versiones de otra tienda, ni borradores.
2. Filas = posiciones con `sku` no nulo (se excluyen las `PENDIENTE`). Se incluyen `ACTIVO` e
   `INACTIVO`: la columna Decisión lo muestra. El conteo de "productos del planograma" de
   `Mi tienda` sigue siendo solo `ACTIVO`.
3. Orden por defecto: `codigoVersion`, `Gondola.orden`, `Nivel.orden`, `Posicion.orden_horizontal`.
4. `nombre`, `marca` y `sku_sustituto` salen de la tabla local `Producto`; `sustituto_nombre` es el
   `nombre` del producto sustituto (null si no hay sustituto o no está en la tabla local).
5. Inventario: misma consulta y misma regla que `GET_implementacion_resumen.md` (reglas 3 y 5).
   `inventario` es el número de unidades en la tienda (0 si no hay fila); `conInventario = inventario > 0`.
   En modo degradado ambos van en `null` y `inventarioDisponible: false`.

---

## Response — 200 OK

```json
{
  "tienda": { "id": 1, "codigo": "T0PC", "nombre": "Cemaco Pradera", "tipo": "GRANDE" },
  "inventarioDisponible": true,
  "total": 1,
  "data": [
    {
      "posicionId": 5501,
      "versionId": 10,
      "codigoVersion": "AUTOS 01-TG",
      "estadoVersion": "publicado",
      "planogramaNombre": "Autos · Limpieza exterior",
      "gondolaId": 101,
      "gondola": "Góndola 1",
      "gondolaOrden": 1,
      "nivelId": 900,
      "nivel": 3,
      "orden": 2,
      "sku": "1200101",
      "nombre": "Cera líquida para auto 473 ml",
      "marca": "Cemaco",
      "facings_horizontal": 3,
      "cantidad_apilable": 1,
      "unidades_por_facing": 4,
      "capacidad_maxima": 12,
      "min_estetico": 4,
      "perfil_redondeo": "MRP",
      "modo": "PLANOGRAMA",
      "decision": "ACTIVO",
      "observaciones": "Etiqueta de precio al frente",
      "sku_sustituto": null,
      "sustituto_nombre": null,
      "inventario": 24,
      "conInventario": true
    }
  ]
}
```

`nivel` es `Nivel.orden` (1 = nivel más bajo); `orden` es `Posicion.orden_horizontal`.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `tiendaId` o algún elemento de `versionIds` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La tienda no existe o está inactiva. |
| `404` | `NOT_FOUND` | Algún `versionId` no es una versión publicada o piloto asignada a la tienda. |
