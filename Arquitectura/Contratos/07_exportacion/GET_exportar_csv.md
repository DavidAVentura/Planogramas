# Contrato: Exportar Versión a CSV

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/exportar/csv`  
**Actor:** Analista  
**Caso de uso:** CU-06-04  

---

## Descripción

Genera y descarga el planograma como CSV con una fila por posición. Compatible con Excel. El archivo incluye todos los campos de la posición y contexto de góndola/nivel.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

---

## Response — 200 OK

**Headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="AUTOS-TG-01.csv"
```

**Columnas del CSV:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `version` | string | Código de versión |
| `gondola` | string | Nombre de la góndola |
| `gondola_ancho_cm` | number | Ancho de la góndola |
| `nivel` | integer | Orden del nivel |
| `altura_piso_cm` | number | Altura desde el piso |
| `tipo_accesorio` | string | Tipo de accesorio del nivel |
| `posicion` | integer | Orden horizontal |
| `sku` | string | SKU del producto |
| `facings_h` | integer | Facings horizontales |
| `ancho_cm` | number | Ancho asignado |
| `apilable` | integer | Cantidad apilable |
| `u_por_facing` | integer | Unidades por facing |
| `capacidad_max` | integer | Capacidad máxima |
| `min_estetico` | integer | Mínimo estético |
| `min_final` | integer | Mínimo de reorden |
| `max_final` | integer | Máximo de reorden |
| `perfil_redondeo` | string | Perfil de redondeo |
| `modo` | string | Modo de la posición |
| `decision` | string | Decisión (ACTIVO/BAJA/NUEVO) |
| `cross_externo` | boolean | Es cross merchandising |
| `montar_display` | boolean | Montar en display |
| `desborde` | boolean | Desborda góndola |
| `nota_desborde` | string | Nota de desborde |
| `observaciones` | string | Observaciones libres |

**Ejemplo de fila:**
```
AUTOS-TG-01,Góndola A,120,1,30,GANCHO,1,10012345,3,27,1,4,12,4,3,12,NORMAL,NORMAL,ACTIVO,false,false,false,,
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — BOM UTF-8]**  
> Incluir BOM (`\uFEFF`) al inicio del CSV para compatibilidad con Excel en Windows al abrir directamente.

> **[SOLID — SRP]**  
> Usar una librería de serialización CSV (ej. `csv-stringify` en Node.js). No construir el CSV con concatenación de strings.

> **[CLEAN CODE — Niveles sin posiciones]**  
> Decidir si los niveles vacíos aparecen en el CSV (con fila sin SKU) o se omiten. Documentar la decisión aquí. Recomendación: omitir para simplicidad de análisis en Excel.
