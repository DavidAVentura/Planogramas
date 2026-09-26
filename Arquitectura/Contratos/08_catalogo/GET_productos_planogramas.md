# Contrato: Obtener Planogramas de un Producto

**Método:** `GET`  
**Ruta:** `/api/v1/catalog/productos/{sku}/planogramas`  
**Actor:** Analista  
**Caso de uso:** CU-10-02  

---

## Descripción

Lista cada posición de un producto en planogramas vigentes: planograma, versión, góndola, nivel,
modo en que aparece y cuántas tiendas tiene asignadas la versión. Se usa al expandir una fila de la
vista `/productos` (detalle de `GET_productos_listar.md`).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `sku` | `string` | Sí |

---

## Reglas de negocio

1. El SKU debe existir en la tabla local `Producto`; si no, `404` (aunque exista en CATI: un SKU
   que no está localmente no puede tener posiciones, por la FK `Posicion.sku → Producto.sku`).
2. Solo se incluyen posiciones de versiones **y** planogramas no archivados — mismo criterio que
   el conteo de `GET /catalog/productos`.
3. Una fila por posición (no por planograma): el mismo SKU puede estar en varias góndolas/niveles
   de una misma versión, o en varias versiones (TG/TM/TE, especiales por tienda) del mismo
   planograma.
4. `tiendas` = cantidad de filas de `VersionTienda` de la versión (0 si no tiene asignadas).
5. Orden: planograma (`nombre` ASC) → versión (`codigo` ASC) → góndola (`orden`) → nivel (`orden`).
6. Arreglo vacío (`[]`) si el producto existe localmente pero no tiene posiciones vigentes.

---

## Response — 200 OK

```json
[
  {
    "posicionId": 451,
    "modo": "CROSS",
    "cross_externo": false,
    "decision": "ACTIVO",
    "planogramaId": 171,
    "planograma": "limas",
    "departamento": "Herramientas",
    "planogramaEstado": "borrador",
    "versionId": 252,
    "codigo": "LIMAS-TG",
    "tipo": "GRANDE",
    "versionEstado": "en_desarrollo",
    "gondola": "01",
    "nivel": 2,
    "tiendas": 0
  }
]
```

| Campo | Descripción |
|-------|-------------|
| `modo` | `PLANOGRAMA`, `CROSS` o `IMPULSO` (ver `05_posiciones/PATCH_posiciones_editar.md`). |
| `cross_externo` | `true` si la posición está en un accesorio colgante fuera de la góndola. |
| `decision` | `ACTIVO` / `INACTIVO` de la posición. |
| `gondola` | `Gondola.nombre` tal cual (puede ser `"01"` o `"Góndola Frontal"`). |
| `nivel` | `Nivel.orden`. |

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. *(No implementado todavía.)* |
| `404 Not Found` | El SKU no existe en la tabla local `Producto`. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `producto.controller.js#obtenerPlanogramas` → `producto.usecases.obtenerPlanogramasDeProducto`
> → `productoRepo.listarApariciones(sku)`. Una sola consulta con la cadena
> `Posicion → Nivel → Gondola → PlanogramaVersion → Planograma` y un subquery de conteo sobre
> `VersionTienda`.

> **[FRONTEND]**  
> El frontend arma el enlace al lienzo con `planogramaId` + `versionId`
> (`/planogramas/{planogramaId}/versiones/{versionId}/lienzo`).
