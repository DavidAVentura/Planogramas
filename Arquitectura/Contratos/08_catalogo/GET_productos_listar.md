# Contrato: Listar Productos con Apariciones en Planogramas

**Método:** `GET`  
**Ruta:** `/api/v1/catalog/productos`  
**Actor:** Analista  
**Caso de uso:** CU-10-01  

---

## Descripción

Lista los productos de la tabla local `Producto` (los SKUs que ya se usaron en alguna posición)
con la cantidad de planogramas distintos en los que aparecen, en total y por modo (`PLANOGRAMA`,
`CROSS`, `IMPULSO`). Alimenta la vista `/productos` del frontend. Opcionalmente filtra por un nivel
de la jerarquía CATI (Área → Departamento → Familia → Categoría → Subcategoría).

No confundir con `GET /catalog/productos/buscar` (`GET_productos_buscar.md`), que es un proxy a
CATI sobre el catálogo completo: este endpoint solo lista lo que existe localmente.

---

## Parámetros de entrada

### Query Parameters

Todos opcionales. Son los ids que devuelve `GET /jerarquia/*` (ver `11_jerarquia/`).

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `area` | `string` | Id de área (ej. `01`). |
| `departamento` | `string` | Id de departamento (ej. `01-0023`). |
| `familia` | `string` | Id de familia (ej. `01-0023-717`). |
| `categoria` | `string` | Id de categoría. |
| `subcategoria` | `string` | Id de subcategoría. |

Si llegan varios niveles, solo se usa el **más específico** (subcategoría > categoría > familia >
departamento > área): un nivel ya pertenece a todos sus niveles superiores.

---

## Reglas de negocio

1. Sin filtro de jerarquía se listan todos los productos locales, ordenados por `nombre` ASC. El
   frontend resuelve en el cliente la búsqueda por texto, el filtro por modo/estado y el orden
   (mismo criterio que `GET /tiendas`): el volumen de la tabla local es acotado.
2. **La jerarquía nunca se lee de columnas locales.** `Producto` no guarda familia ni categoría, y
   área/departamento (`categoria_nivel1`/`categoria_nivel2`) quedan congelados en el momento en
   que el SKU se registró. Con filtro, el backend pide a CATI todos los SKUs del nivel elegido
   (`GET /api/Product/search?{Area|Departamento|Familia|Categoria|Subcategoria}={id}&Profile=CEMACO`)
   y los cruza con la tabla local. Así un cambio de jerarquía en CATI se refleja sin migraciones
   ni sincronización.
3. La consulta a CATI pide páginas de 10 000 SKUs: la primera, y con su `totalPages`, el resto en
   paralelo. Los SKUs por nivel se cachean 30 minutos (igual que la jerarquía). Medido contra CATI
   real: un área completa (~56 000 SKUs) tarda ~10 s en frío; un departamento, < 1 s.
4. No se filtra por estado en CATI: la vista también debe mostrar productos inactivos que siguen
   colocados en planogramas.
5. `planogramas` y `apariciones` cuentan **planogramas distintos** (no posiciones), considerando
   solo posiciones con SKU dentro de versiones **y** planogramas no archivados. Un planograma puede
   contar en más de un modo (ej. el mismo SKU como `PLANOGRAMA` en una góndola y `CROSS` en otra).
   Las posiciones `PENDIENTE` no tienen SKU y no cuentan.
   `planograma_ids` lista esos mismos planogramas distintos (su largo es igual a `planogramas`);
   alimenta el filtro multiselección por planograma de la vista `/productos`, que se resuelve en
   el cliente e incluye cualquier modo (`PLANOGRAMA`, `CROSS` o `IMPULSO`).
6. `categoria_nivel1`, `categoria_nivel2` y `subcategoria` se devuelven tal como están en la tabla
   local, con el código de CATI al final (ej. `"FERRETERIA (01)"`); son solo para mostrar.

---

## Response — 200 OK

Arreglo sin paginar (mismo criterio que `GET /tiendas`).

```json
[
  {
    "sku": "1070922",
    "nombre": "Afilador para Herramientas de Corte 13 cm",
    "marca": "Truper [c]",
    "categoria_nivel1": "FERRETERIA (01)",
    "categoria_nivel2": "Herramientas (0023)",
    "subcategoria": "AFILADORES (23453)",
    "precio": 47.99,
    "ancho_cm": 4,
    "alto_cm": 10,
    "profundidad_cm": 2,
    "fuente_dimensiones": "CATI",
    "dimensiones_validadas": false,
    "imagen_url": "https://stiboprd.blob.core.windows.net/images/1070922_1/XL/1070922_1.jpg",
    "estado": "activo",
    "sku_sustituto": null,
    "planogramas": 5,
    "apariciones": { "PLANOGRAMA": 4, "CROSS": 1, "IMPULSO": 0 },
    "planograma_ids": [165, 167, 169, 170, 171]
  }
]
```

Arreglo vacío (`[]`) si ningún producto local pertenece al nivel de jerarquía pedido.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Un parámetro de jerarquía llega vacío (ej. `?familia=`). |
| `401 Unauthorized` | JWT ausente. *(No implementado todavía.)* |
| `503 Service Unavailable` | Con filtro de jerarquía: CATI no disponible o no responde dentro de 30 s. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `producto.controller.js#listar` → `producto.usecases.listarProductos({ productoRepo, catalogo })`.
> El caso de uso recibe por inyección el repositorio local y el puerto de catálogo
> (`catiClient.listarSkusPorJerarquia`); no sabe que la jerarquía viene de CATI. Vive en el módulo
> `producto` (con dominio propio), no en `catalogo` (proxy sin dominio), aunque comparta el
> prefijo `/catalog/productos`.

> **[CLEAN CODE — Regla de dominio]**  
> `producto.entity.nivelJerarquiaMasEspecifico(filtros)` decide qué nivel se usa;
> `MODOS_APARICION` define qué modos cuentan como aparición.

> **[RENDIMIENTO]**  
> El cruce con la lista de CATI se hace en memoria (Set de SKUs), no con `WHERE sku IN (...)`:
> SQL Server admite como máximo 2100 parámetros por consulta y un área supera los 50 000 SKUs.
