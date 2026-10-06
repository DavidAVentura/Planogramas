# Contrato: Importar productos del Excel a "Por ubicar"

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{id}/importar-productos`  
**Actor:** Analista  

---

## Descripción

Importa el listado de productos del Excel de un planograma (una fila por SKU) a la góndola
**"Por ubicar"** de la versión: una posición por SKU con todos sus datos de montaje. El analista
después arrastra cada producto a su lugar real en el lienzo (o lo ubica el PDF del layout).

El front lee el Excel (`front/src/utils/excelProductosPlanograma.ts`) y manda las filas ya
interpretadas; la jerarquía, marca, modelo (se lee de CATI), temporada, fecha, SKU que sustituye,
justificación y código de planograma no se importan.

---

## Request

```json
{
  "productos": [{
    "sku": "125041",
    "descripcion": "PEGA INSTAN LOCTITE 3G ORIGINAL",
    "ganchos": [4, 9, 14, 19],
    "facings_horizontal": 4,
    "unidades_por_facing": 20,
    "cantidad_apilable": 1,
    "min_estetico": 13,
    "capacidad_maxima": 80,
    "min_final": 65,
    "max_final": 80,
    "perfil_redondeo": "MRP",
    "modo": "PLANOGRAMA",
    "decision": "ACTIVO",
    "accesorio_codigo": "R45-12-212P2",
    "tamano_accesorio_pulgadas": 12,
    "observaciones": null
  }]
}
```

| Columna del Excel | Campo |
|-------------------|-------|
| `SKU` | `sku` (requerido) |
| `Descripcion` | `descripcion` (solo para nombrar el espacio si el SKU no existe) |
| `TG1`…`TG10` | `ganchos` (enteros positivos, sin repetir) |
| `Facings_TG` | `facings_horizontal` (requerido, ≥ 1) |
| `Cantidad_X_facing_TG` | `unidades_por_facing` |
| `Cantidad_facing_vertical_TG` | `cantidad_apilable` |
| `Min_estetico_TG`, `Capacidad_maxima_TG` | `min_estetico`, `capacidad_maxima` (si falta: facings × unidades × apilable) |
| `Min_final_TG`, `Max_final_TG` | `min_final`, `max_final` |
| `Perfil_redondeo_TG` | `perfil_redondeo` (`MRP`/`ZSRE`) |
| `Modo` | `modo` (`PLANOGRAMA`/`CROSS`/`IMPULSO`) |
| `Decision_Final_TG` | `decision` (`ACTIVO`/`INACTIVO`) |
| `Nombre_accesorio_TG`, `Tamano_accesorio_TG` | `accesorio_codigo`, `tamano_accesorio_pulgadas` |
| `Observaciones_TG` | `observaciones` |

Máximo 1000 productos por request.

---

## Reglas de negocio

1. La versión debe estar en un estado editable (`borrador`, `en_desarrollo`, `piloto`).
2. Se omiten (y se informan en `omitidos`) los SKU repetidos en el mismo archivo y los que ya
   tienen una posición en la versión. Reimportar el mismo Excel no duplica nada.
3. La góndola "Por ubicar" (`Gondola.por_ubicar = 1`, una por versión) se crea si no existe, al
   final de la versión. Sus niveles son de relleno: **10 posiciones por nivel**, en orden de primer
   gancho (las filas sin ganchos al final). Se completan los niveles con lugar y se crean los que
   falten; medidas de la góndola y alturas de los niveles se recalculan.
4. Cada SKU se garantiza en el catálogo local (nutriéndolo desde CATI). Si no existe, el producto
   queda como espacio **PENDIENTE** con `nombre_detectado = "SKU x · descripción"` (y sus ganchos)
   y una advertencia. No bloquea.
5. `accesorio_codigo` se busca en el catálogo sin distinguir mayúsculas; si no existe, el producto
   se importa sin accesorio y se advierte (darlo de alta con `POST /accesorios` y reimportar no
   lo agrega, porque el SKU ya estaría en la versión: asignarlo desde el detalle de la posición).
6. Ancho de cada posición: ancho del producto × facings, o 20 cm × facings si no tiene ancho.
7. Los `ganchos` se guardan en `Posicion.ganchos` y mandan sobre la numeración calculada (ver
   `GET /versiones/{id}/skus`). Las posiciones de "Por ubicar" sin ganchos no reciben número.
8. Todo en una transacción.

---

## Response — 201 Created

```json
{
  "gondola": { "id": 815, "creada": true, "totalNiveles": 2 },
  "totalImportados": 13,
  "omitidos": [{ "sku": "961693", "motivo": "Ya está en la versión" }],
  "advertencias": ["El accesorio \"SUS 4*22\" no existe en el catálogo; esos productos se importaron sin accesorio."]
}
```

`gondola` es `null` si no se importó ningún producto.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo, `productos` vacío, una fila sin `sku` o `facings_horizontal`, ganchos repetidos o un valor fuera de su lista. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La versión no existe. |
| `422` | `UNPROCESSABLE` | La versión no es editable. |
