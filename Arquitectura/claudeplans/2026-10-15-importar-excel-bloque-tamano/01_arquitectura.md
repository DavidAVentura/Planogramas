# 01 — Arquitectura (impacto) · Importar Excel tomando el bloque TG/TM/TE según la versión

## 1. Entendimiento

El Excel de análisis trae tres bloques de columnas idénticos (TG, TM, TE) más columnas comunes. Hoy la
importación de productos a una versión toma siempre el primer bloque que encuentra (TG). Se pide que lea
**solo** el bloque del tipo de la versión destino: versión GRANDE → `*_TG` / `TG1..TG10`, MEDIANA → `_TM`,
EXPRESS → `_TE`.

Casos de uso: la importación de Excel **no tiene CU** en `CASOS_DE_USO.md` (DT-26, abierta). Toca el flujo
de edición de una versión (módulo 20 · importación, front).

### Hallazgos sobre el estado actual

- **El tipo de la versión ya existe y siempre está definido.** `PlanogramaVersion.tipo` es `NOT NULL`
  (`001_esquema_inicial.js`), valores `GRANDE | MEDIANA | EXPRESS`; las versiones especiales también lo
  tienen (heredan el de su base). En el front es `VersionTipo` (`front/src/types/version.ts`) y la sigla
  sale de `SIGLA_TIPO_TIENDA` (`front/src/constants/tiendas.ts`: GRANDE→TG, MEDIANA→TM, EXPRESS→TE). No se
  deduce del nombre ni de las tiendas asignadas: es un campo.
- **Disponible en el front sin pedir nada al back.** `EditorPlanograma.tsx` (l. 54) y `LienzoPlanograma.tsx`
  (l. 101) ya calculan `version = versiones.find(...)` con `useVersionesDePlanograma`, y montan
  `AgenteExtractorBubble` solo cuando `!cargandoInicial` (que incluye `cargandoVersiones`). Solo falta
  pasar `version?.tipo` por `AgenteExtractorBubble` → `ImportarExcelProductosModal` → lector.
- **Cómo ubica columnas el lector hoy** (`front/src/utils/excelProductosPlanograma.ts`):
  - Fila de encabezado = primera fila (de las 15 primeras) con una celda `SKU` → fila 5 del ejemplo.
  - Encabezados normalizados (`normalizarEncabezado`: sin tildes, minúsculas, `_`).
  - Campos: `sinSufijoTipo` quita cualquier sufijo `_t[a-z]` y se queda con **la primera aparición**
    (`!columnas.has(campo)`) → siempre gana TG por estar más a la izquierda.
  - Ganchos: `esColumnaGancho` (`/^t[a-z]\d{1,2}$/`) acepta **todas** las columnas `TGn`, `TMn` y `TEn` y
    **une sus ganchos**. **Defecto actual**: una versión TG importada desde el archivo de tres bloques
    recibe también los ganchos del bloque TM (y TE si no están en 0). La prueba
    `une los ganchos de todas las columnas sin mezclar 54 con 54E` solo usa columnas TG y no lo detecta.
  - Errores de celda de cualquier bloque bloquean la importación aunque no sea el bloque de la versión
    (un gancho mal escrito en `TM3` impide importar a la versión TG).

## 2. Flujo de proceso

Sin cambios de estados ni de actores. El analista, en el editor o el lienzo de una versión editable, abre
"Importar Excel", elige el archivo y el sistema:

1. Determina la sigla del bloque a partir de `version.tipo`.
2. Lee las columnas comunes (SKU, descripción, modo…) y **solo** las columnas del bloque de esa sigla.
3. Muestra en la vista previa qué bloque se leyó ("Bloque TM · Tienda mediana").
4. Si el archivo no trae ese bloque → no se importa; mensaje que nombra el bloque buscado y los que sí trae.
5. Si el bloque existe pero todas sus filas están vacías / en 0 → no se importa; mensaje "el bloque TE no
   tiene productos".
6. El resto (validación de celdas, catálogo de accesorios, POST `importar-productos`) no cambia.

## 3. Impacto por capa

| Capa | Archivo / módulo | Tipo de cambio |
|---|---|---|
| Dominio (back) | — | Sin cambio |
| Aplicación (back) | — | Sin cambio |
| Infraestructura (back) | — | Sin cambio |
| BD | — | Sin migración |
| Front · utils | `front/src/utils/excelProductosPlanograma.ts` | `interpretarHojaProductos(filas, tipo)` y `leerExcelProductos(archivo, tipo)` reciben `VersionTipo`; selección de columnas por sufijo exacto; nuevos campos en `LecturaExcelProductos` |
| Front · pruebas | `front/src/utils/excelProductosPlanograma.test.ts` | Ajustar llamadas (`'GRANDE'`) y agregar casos de bloque |
| Front · modal | `front/src/components/dominio/modales/ImportarExcelProductosModal/ImportarExcelProductosModal.tsx` | Prop `tipoVersion: VersionTipo \| undefined`; mensajes de bloque faltante/vacío; texto del bloque leído en la vista previa |
| Front · contenedor | `front/src/components/dominio/editor/AgenteExtractorBubble/AgenteExtractorBubble.tsx` | Prop `tipoVersion` que reenvía al modal |
| Front · páginas | `front/src/pages/EditorPlanograma/EditorPlanograma.tsx`, `front/src/pages/LienzoPlanograma/LienzoPlanograma.tsx` | Pasar `tipoVersion={version?.tipo}` |
| Docs | `Arquitectura/ESTADO_MODULOS.md` (apartado importación, viñeta "Front") | Regla de selección de bloque |

### Regla de selección de columnas (núcleo del cambio)

Sea `s` = sigla en minúsculas (`tg`/`tm`/`te`) y `SUFIJOS = ['tg','tm','te']` (no cualquier `t[a-z]`):

- **Columna de gancho**: `^(tg|tm|te)\d{1,2}$`. Se toma solo si el prefijo es `s`; las de otros bloques se
  ignoran por completo (no se leen ni se validan).
- **Columna de campo con sufijo** (`facings_tm`): se toma solo si el sufijo es `s`; con otro sufijo se ignora.
- **Columna de campo sin sufijo** (`sku`, `descripcion`, `modo`, o un archivo antiguo con `Facings`): es
  común y se toma para cualquier tipo.
- **Precedencia**: si para un mismo campo hay columna con sufijo `s` y columna sin sufijo, gana la de sufijo.
  Entre dos columnas del mismo campo y misma precedencia, gana la primera (comportamiento actual).
- `Inner` (solo en TG) sigue ignorándose (no está en `CAMPOS`). Las columnas separadoras `.` y los
  títulos de bloque de la fila 2 no afectan (no están en la fila de encabezado).
- **Bloques presentes**: se registran las siglas que aparecen como sufijo o prefijo de gancho en el
  encabezado (`bloquesEnArchivo: ('TG'|'TM'|'TE')[]`) para el mensaje de bloque faltante.

### Cambios en `LecturaExcelProductos`

```ts
export interface LecturaExcelProductos {
  // ...campos actuales sin cambio
  /** Sigla del bloque leído: 'TG' | 'TM' | 'TE'. */
  bloque: SiglaBloque;
  /** Siglas que trae el encabezado del archivo, en orden de aparición. */
  bloquesEnArchivo: SiglaBloque[];
}
```

- `columnasFaltantes` nombra la columna esperada con el sufijo del bloque (`Facings_TM`), no `facings`.
  Facings se considera presente si existe `Facings_<s>` o `Facings` sin sufijo.
- **Bloque vacío**: no es un estado nuevo; resulta en `productos: []`, `errores: []` y todas las filas en
  `filasOmitidas` ("sin facings"). El modal distingue este caso para el mensaje (ver §1, paso 5).

### Versión sin tipo

En BD no puede ocurrir. En el front, `version` puede ser `undefined` solo si el `versionId` de la URL no
pertenece al planograma (la página ya muestra otro estado). Decisión: si `tipoVersion` es `undefined`, el
modal no lee el archivo y muestra "No se pudo determinar el tipo de tienda de la versión; recarga la
página." (no se cae a TG por defecto: importaría datos de otro tamaño sin aviso).

## 4. Contratos

Sin endpoints nuevos ni modificados. `POST /versiones/:id/importar-productos` recibe los mismos
`ProductoExcel[]`; el back no necesita saber de qué bloque salieron. `importar-layout` (PDF) no se toca.
Postman: sin cambios.

## 5. Datos

- Sin migraciones (la última es `016_reactivar_planogramas_archivados.js`; no se usa la 017).
- Retrocompatible con archivos: un Excel de un solo bloque TG sigue funcionando en versiones TG; uno sin
  sufijos funciona en cualquier versión.
- **Datos ya importados**: las versiones TG cargadas desde archivos de tres bloques antes de este cambio
  pueden tener ganchos del bloque TM mezclados en `Posicion.ganchos` (ver §1). No se corrige con migración
  (no se puede distinguir el origen); ver pregunta abierta 2.

## 6. Rendimiento y escalabilidad

Lectura en el navegador de ~100 filas × ~90 columnas: trivial. Ignorar los bloques ajenos reduce trabajo.
Sin consultas nuevas, sin N+1, sin transacciones nuevas.

## 7. Alternativas descartadas y decisión

- Ubicar el bloque por desplazamiento de columnas desde los títulos de la fila 2: frágil (TG tiene `Inner`
  de más) y depende de una fila decorativa.
- Deducir el tipo del texto `Planograma_XX` de cada fila: el ejemplo trae `Planograma_TM`='LIMPIEZA TG-09'.
- Selector manual de bloque en el modal: permite importar un tamaño equivocado; el tipo ya es un dato fijo
  de la versión.
- Mandar el archivo al back y leerlo allá: el lector vive en el front y el back ya valida el contrato.
- Si falta el bloque de la versión, caer a TG: importaría datos de otro tamaño en silencio.

**Decisión recomendada**: cambio solo de front. El lector recibe `VersionTipo` y filtra columnas por sufijo
exacto `_tg|_tm|_te` y prefijo de gancho exacto; las columnas sin sufijo son comunes; bloque faltante o
vacío bloquea con mensaje que nombra el bloque; la vista previa dice qué bloque se leyó. Se corrige de paso
la unión de ganchos entre bloques y la validación de celdas de bloques ajenos.

## 8. Preguntas abiertas

1. Si la versión es TM y el archivo **solo** trae el bloque TG (archivos viejos), ¿se bloquea la
   importación (recomendado) o se permite importar el bloque TG con una advertencia explícita?
2. Versiones TG ya importadas en DEV/PROD con archivos de tres bloques pueden tener ganchos de TM
   mezclados. ¿Se reimportan manualmente esas versiones, o se deja registrado y se revisa caso por caso?
3. ¿El nombre de `Planograma_<s>` que no coincide con la sigla (ej. 'LIMPIEZA TG-09' en el bloque TM) debe
   mostrarse como advertencia en la vista previa, o se ignora (hoy solo se muestra el texto)?

## 9. Para UX y para Seguridad

**UX** (aplica, alcance chico — solo textos y un indicador en el modal existente):
1. Cómo se muestra el bloque leído en la vista previa (texto en `importar-excel__ayuda` vs. `Badge` con
   los colores de `TIPO_TIENDA_META`).
2. Mensaje de bloque faltante: nombrar el bloque buscado y los que trae el archivo; ¿toast o vista de error?
3. Mensaje de bloque vacío (TE en 0): distinguirlo de "el archivo no tiene productos".
4. Mensaje de versión sin tipo (caso límite).
5. Si se decide advertir por `Planograma_<s>` que no coincide (pregunta 3), dónde y con qué peso.

**Seguridad** (no aplica como etapa: sin endpoints, sin datos nuevos, sin cambios en el back; el back sigue
validando todo el contrato de `importar-productos`). Para la revisión del diff, solo:
1. Que el tipo se tome de la versión cargada por el front y no del contenido del archivo.
2. Que ignorar bloques ajenos no deje pasar al request celdas sin validar del bloque elegido.

## 10. Deuda detectada

- **Nueva (media, front · datos)**: posibles ganchos TM mezclados en versiones TG importadas antes de este
  cambio desde archivos de tres bloques (depende de la pregunta 2; si se decide no reimportar, registrar
  como DT).
- Relacionada abierta: **DT-26** (importación sin CU). Este cambio agrega una regla más al flujo; conviene
  cerrarla escribiendo el CU en el cierre de docs, sin bloquear este plan.
