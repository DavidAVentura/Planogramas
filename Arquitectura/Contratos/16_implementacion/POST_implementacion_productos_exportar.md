# Contrato: Descargar productos por planograma (`.xlsx`)

**Método:** `POST`  
**Ruta:** `/api/v1/implementacion/productos/exportar`  
**Actor:** Analista  
**Caso de uso:** CU-10-06  

---

## Descripción

Genera en el servidor un `.xlsx` con los SKU de las versiones elegidas en Productos → Por planograma, en dos formatos:

- **Lista**: una fila por SKU–versión–modo (Planograma, Cross o Impulso).
- **Pivote por versión**: una fila por SKU–planograma–estado de la versión–modo, con tres bloques (TG, TM, TE) cuyos encabezados son los del Excel de categorías (`Facings_TG`, …) para poder reimportarlo.

Se excluyen posiciones sin SKU y las `PENDIENTE`. Es POST porque, con filtros de columna, el cuerpo puede llevar hasta 30 000 ids de posición (no caben en una URL).

---

## Parámetros de entrada

### Body (JSON, máximo 512 kb)

Validación Joi estricta: una clave desconocida → `400`. El parser de este cuerpo (`express.json({ limit: '512kb' })`) se monta en `app.js` solo para esta ruta, antes del parser global; responde antes que la autorización (un cuerpo mal formado o mayor al límite da `400`/`413` aunque el usuario no sea analista).

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `versionIds` | `integer[]` | Sí | 1 a 50 enteros positivos seguros, únicos. |
| `formato` | `string` | Sí | `LISTA` o `PIVOTE`. |
| `area` | `string` | No | Código de Área CATI (`^[A-Za-z0-9_-]{1,20}$`); debe existir en CATI. |
| `departamento` | `string` | No | Código de Departamento CATI; **exige `area`** y debe pertenecer a ella. |
| `posicionIds` | `integer[]` | No | 0 a 30 000 enteros positivos seguros, únicos: las posiciones que la pantalla deja visibles tras la búsqueda y los filtros por columna. El front lo envía **solo** si hay algún filtro de cliente activo. |

```json
{ "versionIds": [12, 15], "formato": "LISTA", "area": "A01", "departamento": "D05", "posicionIds": [881, 882] }
```

Orden de capas: `requiereAnalista` → `validarCuerpo(schemaExportar)` → limitador por usuario (5/min) → controller. `403` sale antes que el `400` de Joi; los `400` no gastan cupo.

---

## Reglas de negocio

Orden de evaluación:

1. **Versiones**: todas deben existir (cualquier estado) → si no, `404 NOT_FOUND` con `details.versionIds`.
2. **Pivote** (`validarPivote`, dominio): las versiones especiales de tienda (`version_base_id` no nulo) se **excluyen** y se reportan en la hoja `Versiones`; si todas son especiales → `422 PIVOTE_NO_APLICABLE` (`soloEspeciales: true`); una versión no especial sin `tipo` → `422` (`sinTipo`); dos no especiales del mismo planograma + tipo + estado → `422` (`duplicadas`). Detalle: `details: { sinTipo: number[], duplicadas: [{ planogramaId, tipo, estado, versionIds }], soloEspeciales: boolean }`.
3. **Jerarquía**: se valida contra los catálogos de CATI (código inexistente o departamento de otra área → `400`) y se resuelven los SKU del nivel más específico. CATI caído → `503 SERVICE_UNAVAILABLE` sin datos sin filtrar. Sin `area` no se llama a CATI.
4. **Semáforo único** de 1 para todas las exportaciones `.xlsx` del proceso (compartido con el consolidado de tiendas): ocupado → `503 EXPORTACION_EN_CURSO`. Se toma después de resolver CATI y antes de cargar la base; se libera siempre.
5. **Universo** calculado en el servidor: `versionIds` ∩ jerarquía CATI. **`posicionIds` solo acota**: el servidor intersecta con él; los ids que no pertenecen al universo se descartan sin error. Una fila agregada entra si **al menos una** de sus posiciones pasó y **todas sus columnas agregadas** (ubicaciones, facings, capacidades, ganchos, accesorios, `Varía`) se calculan solo con las posiciones que pasaron. La numeración de ganchos se calcula con la versión completa. Los ids nunca llegan a SQL: la base se carga por `versionIds` y se intersecta en memoria.
6. **Tope**: si las filas superan `CONSOLIDADO_EXPORTACION_MAX_FILAS` → `422 EXPORTACION_DEMASIADO_GRANDE` con `details: { filas, maximo }`, sin generar el libro.
7. Se genera el libro completo y solo entonces se fijan las cabeceras. Con 0 filas se devuelve un libro con encabezados y hoja `Versiones` (`200`).
8. **Área y Departamento por SKU** en la Lista salen de `Producto.categoria_nivel1/2` (dato de CATI **registrado en el SKU**; no se consulta CATI por SKU), por lo que pueden diferir del filtro en vivo (DT-74).
9. **Instantánea no transaccional**: la base se lee con varias consultas sin transacción; una edición concurrente puede dejar una posición fuera del archivo.

Estados en el archivo: Borrador, En desarrollo, Piloto, Publicada, Archivada.

---

## Response — 200 OK

Binario. Cabeceras (fijadas solo después de tener el `Buffer`):

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="productos-por-planograma-{lista|pivote}-AAAAMMDD.xlsx"
Cache-Control: no-store
Content-Length: <bytes>
```

### Hoja `Lista` (primera; fila 1 congelada)

SKU · Producto · Área · Departamento · Planograma · Versión · Tipo (TG/TM/TE) · Estado de la versión · Especial de tienda · Modo · Góndola · Sección · Nivel · Posición en nivel · Ganchos · Accesorio de montaje · Montaje · Facing horizontal · Cantidad apilable · Capacidad del facing · Capacidad máxima · Mín. estético · Mín. final · Máx. final · Perfil de redondeo · Decisión · Observaciones · SKU sustituto. Orden: SKU → código de versión → modo.

### Hoja `Pivote por versión` (primera; 2 filas y 6 columnas comunes congeladas)

- Fila 1: título de grupo `TG`, `TM`, `TE` combinado sobre su bloque. Fila 2: encabezados.
- Comunes: `SKU` · `Descripcion` · `Nombre_planograma` · `Estado_version` · `Modo` · `SKU_sustituto` (los tres últimos se ignoran al reimportar).
- Bloque por sigla `S` (TG = GRANDE, TM = MEDIANA, TE = EXPRESS): `Planograma_S` (código de la versión) · `Facings_S` · `Cantidad_x_facing_S` · `Cantidad_facing_vertical_S` · `Min_estetico_S` · `Capacidad_maxima_S` · `Nombre_accesorio_S` · `Tamano_accesorio_S` · `Perfil_redondeo_S` · `Min_final_S` · `Max_final_S` · `Decision_final_S` · `Observaciones_S` · `S1`…`Sn` (ganchos; `54E` como texto).
- Una cantidad con valores distintos entre las posiciones del grupo se escribe `Varía` (el lector de categorías la rechaza: falla segura). `Facings` = suma; `Capacidad_maxima` = suma o vacío si alguna es nula.
- Bloque vacío si el SKU no está con ese modo en una versión de ese tipo y estado.
- Orden: SKU → nombre del planograma → id del planograma → estado (publicado, piloto, en desarrollo, borrador) → modo. Al reimportar en una versión TG gana la primera fila del SKU (la publicada) y las demás se reportan como repetidas (DT-75).

### Hoja `Versiones` (segunda en ambos formatos)

Id · Código · Planograma · Tipo · Estado · Especial de tienda · Incluida (Sí/No) · Motivo (`Especial de tienda: no va en el Pivote` o vacío).

Todas las celdas de texto se escriben como texto (nunca fórmulas) y sin caracteres de control.

---

## Códigos de error

Siempre JSON `{ error: { code, message, details? } }`; nunca un archivo truncado.

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Cuerpo inválido (ver parámetros), jerarquía inexistente o `departamento` sin `area`. |
| `401` | — | JWT ausente o inválido. |
| `403` | `FORBIDDEN` | El usuario no es analista. |
| `404` | `NOT_FOUND` | Alguna versión no existe (`details.versionIds`). |
| `413` | `ERROR` | Cuerpo mayor a 512 kb (código genérico, DT-76). |
| `422` | `PIVOTE_NO_APLICABLE` | Pivote con versiones sin tipo, duplicadas o todas especiales. |
| `422` | `EXPORTACION_DEMASIADO_GRANDE` | Más filas que el máximo (`details: { filas, maximo }`). |
| `429` | `RATE_LIMITED` | Más de 5 descargas por minuto del mismo usuario. |
| `503` | `SERVICE_UNAVAILABLE` | Hay jerarquía y CATI no responde. |
| `503` | `EXPORTACION_EN_CURSO` | Hay otra exportación `.xlsx` en el proceso. |
| `500` | `INTERNAL_ERROR` | Falla al generar el libro (sin `Content-Disposition`). |

Log por descarga: `[implementacion] exportacion numeroEmpleado=… formato=… versiones=N filtroCliente=si|no filas=… ms=…` (sin ids, códigos de jerarquía ni token).
