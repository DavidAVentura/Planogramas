# PLAN — Importar Excel tomando el bloque TG/TM/TE según la versión

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Worktree: `.claude/worktrees/importar-excel-bloque-tamano` · rama `feat/importar-excel-bloque-tamano`.

## Objetivo

El Excel de análisis trae tres bloques de columnas (TG, TM, TE) más columnas comunes. Hoy el lector toma
siempre el primer bloque (TG) para los campos y **une los ganchos de los tres bloques**. Con este cambio la
importación lee **solo** el bloque del tipo de la versión destino (GRANDE → TG, MEDIANA → TM, EXPRESS → TE),
bloquea si ese bloque falta o viene vacío, marca como error un `Planograma_<S>` de otro tamaño y muestra en la
vista previa qué bloque se leyó. Cambio solo de front; el back no cambia.

## Decisiones

| Decisión | Razón |
|---|---|
| El bloque sale de `version.tipo` (`VersionTipo`), pasado desde la página → `AgenteExtractorBubble` → modal → lector. Nunca del contenido del archivo ni de un selector | `tipo` es `NOT NULL` en BD y ya está cargado en `EditorPlanograma`/`LienzoPlanograma`; un selector permitiría importar otro tamaño |
| Columnas ubicadas por **nombre de encabezado** con sufijo exacto `_tg`/`_tm`/`_te` y gancho exacto `^(tg\|tm\|te)\d{1,2}$`; las de otros bloques se ignoran por completo (ni se leen ni se validan) | TG tiene `Inner` de más: los desplazamientos no son equivalentes. Corrige además la unión de ganchos entre bloques y que un error en `TM3` bloquee una versión TG |
| Columna sin sufijo (`SKU`, `Descripcion`, `Modo`, o `Facings` de un archivo antiguo) es común y vale para cualquier tipo. Si un campo tiene columna con sufijo `S` y sin sufijo, gana la de sufijo; empate → la primera | Retrocompatibilidad con archivos de un solo bloque o sin sufijos |
| **Bloque ausente** = el encabezado trae al menos un bloque (`bloquesEnArchivo` no vacío) y no trae el de la versión → no se importa | Respuesta del usuario: bloquear. Un archivo sin ningún sufijo se trata como común (no hay bloque que falte) |
| **Bloque vacío** = el bloque existe, sin errores y sin productos (todas las filas omitidas) → no se importa, con mensaje propio | Distinguir "TE en 0" de "archivo sin productos" |
| `Planograma_<S>` que nombra **otro** tamaño es un `ErrorLectura` bloqueante de la vista de errores existente. Regla: el texto contiene al menos una sigla `TG`/`TM`/`TE` como palabra (delimitada por no-letras) y ninguna es `S`. Sin ninguna sigla → no es error | Respuesta del usuario. No se puede exigir sigla a nombres que no la llevan; "ACEITE" no cuenta como `TE` por la delimitación |
| La validación de `Planograma_<S>` se aplica solo a filas que serían producto (SKU y facings ≥ 1) | Un bloque TE en 0 con el nombre copiado de TG debe dar "bloque vacío", no N errores |
| Versión sin tipo (`tipoVersion === undefined`): el modal no lee, muestra el aviso al abrir y deshabilita "Leer archivo". No hay valor por defecto | Caer a TG importaría otro tamaño en silencio |
| Avisos de bloqueo previo (ausente, vacío, sin tipo) con `BloqueoErrores` en el paso 1, no con toast. Columnas faltantes, archivo ilegible y "sin productos" siguen en toast | Propuesta UX: el mensaje es largo y debe permanecer mientras se cambia el archivo |
| Los textos de bloqueo se generan en una función pura del lector (`bloqueoDeLectura`) | Se prueban con Vitest sin montar el modal |
| El mensaje UX "No se encontró ningún bloque TG, TM o TE…" **no se implementa** | Con la regla de bloque ausente es inalcanzable (sin bloques el archivo es común; si además falta Facings, ya sale el toast de columnas faltantes) |
| Datos ya importados (versiones TG con ganchos TM mezclados): se reimportan a mano; sin consulta ni migración | Respuesta del usuario |
| Sin paquetes nuevos | — |

## Fuera de alcance

- Back, BD, Postman y el contrato de `POST /versiones/:id/importar-productos` (sin cambios).
- `importar-layout` (PDF) y demás extractores.
- Corregir versiones ya importadas (reimportación manual del usuario).
- Columna `Inner` (sigue ignorada).
- Propuestas UX al sistema de diseño: token para `#7a5900` de `TIPO_TIENDA_META.EXPRESS` y extraer
  `BloqueoErrores` a `ui/` (se registran como deuda en T6).
- Caso de uso de la importación (DT-26 sigue abierta).

## Contratos

Sin endpoints nuevos ni modificados.

Tipos TS que cambian en `front/src/utils/excelProductosPlanograma.ts`:

```ts
import type { VersionTipo } from '../types/version';

export type SiglaBloque = 'TG' | 'TM' | 'TE';

/** GRANDE → 'TG', MEDIANA → 'TM', EXPRESS → 'TE' (usa SIGLA_TIPO_TIENDA de constants/tiendas). */
export function siglaBloque(tipo: VersionTipo): SiglaBloque;

export interface LecturaExcelProductos {
  // ...campos actuales sin cambio (productos, planogramas, columnasFaltantes, errores, filasOmitidas, origenesAccesorio)
  /** Sigla del bloque que corresponde a la versión. */
  bloque: SiglaBloque;
  /** Siglas presentes en la fila de encabezado (como sufijo `_xx` o prefijo de gancho), sin repetir, en orden de aparición. */
  bloquesEnArchivo: SiglaBloque[];
}

export interface AvisoBloqueo {
  titulo: string;
  detalle: string;
}

export function interpretarHojaProductos(filas: Celda[][], tipo: VersionTipo): LecturaExcelProductos;
export async function leerExcelProductos(archivo: File, tipo: VersionTipo): Promise<LecturaExcelProductos>;
/** Bloque ausente o vacío → aviso; en cualquier otro caso null. */
export function bloqueoDeLectura(lectura: LecturaExcelProductos): AvisoBloqueo | null;
export const AVISO_SIN_TIPO: AvisoBloqueo;
```

Props que cambian:
- `ImportarExcelProductosModalProps`: `tipoVersion: VersionTipo | undefined` (requerida).
- `AgenteExtractorBubbleProps`: `tipoVersion: VersionTipo | undefined` (requerida), se reenvía al modal.

## Datos

Sin cambios de BD. No se usa la migración 017.

## Seguridad (controles obligatorios)

Seguridad no tuvo etapa de diseño (sin endpoints ni datos nuevos); revisará el diff con estos controles:

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| S1 | El tipo del bloque viene de `version.tipo` cargado por el front, nunca del archivo (ni de `Planograma_<S>` ni de los títulos de la fila 2) | `EditorPlanograma.tsx`, `LienzoPlanograma.tsx`, `AgenteExtractorBubble.tsx`, modal | Revisión del diff: `tipoVersion={version?.tipo}` es la única fuente |
| S2 | Ignorar bloques ajenos no reduce la validación del bloque elegido: toda celda que llega a `ProductoExcel` sigue pasando por las reglas actuales | `interpretarHojaProductos` | Pruebas T2: errores en el bloque elegido siguen bloqueando; errores en bloques ajenos no |
| S3 | Sin tipo no se lee ni se envía nada | modal | Prueba manual T4 / revisión |

## UX (resumen para implementar)

Sin componentes nuevos ni CSS nuevo. Todo en `ImportarExcelProductosModal.tsx`.

- **Nombre del tamaño**: `{Nombre}` = `Tienda ${TIPO_TIENDA_META[tipo].label.toLowerCase()}` → "Tienda grande",
  "Tienda mediana", "Tienda express" (en minúscula inicial dentro de "esperado": "tienda mediana").
- **Paso 1, ayuda** (con tipo):
  "Sube el Excel del planograma (una fila por SKU con sus ganchos, facings, cantidades, mín./máx., accesorio y observaciones). Esta versión es de {Nombre}: se lee solo el bloque {S} del archivo. Se lee la primera hoja; la jerarquía, marca, modelo, temporada y sustitución no se importan."
  Sin tipo: el mismo texto sin la frase "Esta versión es de …".
- **Paso 1, aviso de bloqueo**: `BloqueoErrores` (local, ya existente) bajo `UsarAdjuntos`, con `key` igual al
  detalle para que recupere el foco si cambia: `<strong>{titulo}</strong><span>{detalle}</span>`.
  - Bloque ausente — título "No se importó nada"; detalle: "El archivo no trae el bloque {S} ({Nombre}), que es el que corresponde a esta versión. Trae: {bloquesEnArchivo.join(', ')}. Carga el archivo que incluya el bloque {S}."
  - Bloque vacío — título "No se importó nada"; detalle: "El bloque {S} ({Nombre}) no tiene productos: todas sus filas están vacías o en 0. Verifica que el archivo tenga datos para esta versión."
  - Sin tipo (`AVISO_SIN_TIPO`) — título "No se pudo leer el archivo"; detalle: "No se pudo determinar el tipo de tienda de la versión; recarga la página." Visible al abrir; "Leer archivo" `disabled` con `title="No se pudo determinar el tipo de tienda de la versión"`.
- **Vista previa**: dentro de `<p className="importar-excel__ayuda">`:
  "{N} producto(s) · Bloque <Badge bg={meta.bg} color={meta.color}>{S} · {meta.label}</Badge> del planograma {X}. Se colocan en la góndola "Por ubicar" …" (resto igual). Sin `planogramas` se omite " del planograma …". `meta = TIPO_TIENDA_META[tipoVersion]`. `Badge` de `components/ui/Badge/Badge` (props `bg`, `color`, `children`).
- **Vista de errores — `Planograma_<S>`**: sin cambios de vista; son filas `ErrorLectura` más:
  - `columna`: encabezado real (ej. `Planograma_TM`), `letra` real (ej. `AP`).
  - `motivo`: `El nombre «{valor}» no corresponde al bloque {S}`.
  - `esperado`: `Un nombre de planograma de {nombre en minúscula} ({S}), p. ej. «{valor con la sigla ajena reemplazada por S}»` (ej. «LIMPIEZA TM-09»).
  - `{valor}` y el ejemplo se recortan a 40 caracteres + "…" solo si superan 40.
- Accesibilidad: `BloqueoErrores` ya tiene `role="alert"` y foco; el `Badge` lleva texto, no solo color.

## Tareas

### T1 — Selección de columnas por bloque en el lector
- **Archivos**: modificar `front/src/utils/excelProductosPlanograma.ts`
- **Qué hacer**:
  1. Importar `VersionTipo` (`../types/version`) y `SIGLA_TIPO_TIENDA`, `TIPO_TIENDA_META` (`../constants/tiendas`).
  2. Agregar `SiglaBloque`, `siglaBloque(tipo)`, `const SIGLAS: SiglaBloque[] = ['TG', 'TM', 'TE']`.
  3. Reemplazar `sinSufijoTipo` y `esColumnaGancho` por:
     ```ts
     /** `facings_tm` → { campo: 'facings', sigla: 'TM' }; `sku` → { campo: 'sku', sigla: null }. Solo tg|tm|te. */
     function separarSufijo(clave: string): { campo: string; sigla: SiglaBloque | null };
     /** `tm3` → 'TM'; cualquier otra clave → null. Regex /^(tg|tm|te)\d{1,2}$/. */
     function siglaDeGancho(clave: string): SiglaBloque | null;
     ```
  4. Nueva firma `interpretarHojaProductos(filas, tipo: VersionTipo)`; `const s = siglaBloque(tipo)`.
     Al recorrer el encabezado:
     - Registrar en `bloquesEnArchivo` (sin repetir, orden de aparición) la sigla de cada gancho o sufijo.
     - Gancho: si `siglaDeGancho(clave) === s` → `columnasGancho`; si es de otra sigla → ignorar.
     - Campo con `sigla === s` → `columnasBloque` (primera gana); con `sigla === null` → `columnasComunes`
       (primera gana); con otra sigla → ignorar. Solo campos de `CAMPOS`.
     - `columnas` = comunes sobrescritas por las del bloque.
  5. **Bloque ausente**: si `bloquesEnArchivo.length > 0 && !bloquesEnArchivo.includes(s)` → devolver la
     lectura vacía con `bloque`, `bloquesEnArchivo` y `columnasFaltantes: []` (sin leer filas).
  6. `columnasFaltantes`: `sku` → `'SKU'`; `facings` → `` `Facings_${s}` ``. (Antes devolvía `'facings'`.)
  7. Todas las salidas (incluida la de encabezado sin SKU y la de errores) incluyen `bloque` y `bloquesEnArchivo`.
  8. `leerExcelProductos(archivo, tipo)` pasa `tipo`.
  9. Actualizar el comentario de cabecera del archivo con la regla de bloques.
- **Criterios de aceptación**:
  - [ ] Con encabezado de tres bloques y tipo MEDIANA, los productos salen de `*_TM` y `TM1..TM10`; ninguna celda TG/TE influye.
  - [ ] Un gancho inválido en `TG3` no produce error al leer con MEDIANA, y sí con GRANDE.
  - [ ] Un archivo solo con `SKU`, `Facings`, `TG1` (sin sufijos en campos) funciona con GRANDE; con MEDIANA da bloque ausente (`bloquesEnArchivo = ['TG']`).
  - [ ] Un archivo sin ninguna sigla (`SKU`, `Facings`) funciona con cualquier tipo.
  - [ ] `Facings_TM` gana sobre `Facings` cuando ambas existen y el tipo es MEDIANA.
- **Pruebas**: en T2.
- **Depende de**: —

### T2 — Validación de `Planograma_<S>`, bloqueos y pruebas del lector
- **Archivos**: modificar `front/src/utils/excelProductosPlanograma.ts` · modificar `front/src/utils/excelProductosPlanograma.test.ts`
- **Qué hacer**:
  1. Función pura exportada:
     ```ts
     /** Siglas TG/TM/TE presentes como palabra (delimitadas por no-letras o borde), en mayúsculas. */
     export function siglasEnNombre(nombre: string): SiglaBloque[];
     ```
     Regex sugerida: `/(?<![A-Za-z])(TG|TM|TE)(?![A-Za-z])/gi`. "LIMPIEZA TG-09" → `['TG']`; "ACEITE" → `[]`.
  2. En el bucle de filas, después de calcular `facings` y antes de `errores.push(...erroresFila)`: si
     `facings && facings >= 1` y existe la columna `planograma`, leer el texto; si `siglasEnNombre(t)` no está
     vacío y no incluye `s`, `registrar(columnaPlanograma, { motivo, esperado })` con los textos exactos de la
     sección UX (recorte a 40 + "…"; el ejemplo reemplaza cada sigla ajena por `s` en el valor).
  3. `bloqueoDeLectura(lectura)` y `AVISO_SIN_TIPO` con los textos exactos de la sección UX:
     - ausente: `bloquesEnArchivo.length > 0 && !bloquesEnArchivo.includes(bloque)`;
     - vacío: `bloquesEnArchivo.includes(bloque) && errores.length === 0 && productos.length === 0 && columnasFaltantes.length === 0`;
     - otro caso → `null`.
     `{Nombre}` a partir del tipo de la sigla (invertir `SIGLA_TIPO_TIENDA`) y `TIPO_TIENDA_META[tipo].label`.
  4. Pruebas: el helper `hoja` pasa `'GRANDE'`; todas las llamadas existentes a `interpretarHojaProductos`
     reciben tipo. Ajustar `columnasFaltantes` esperado de `['facings']` a `['Facings_TG']`. Renombrar la prueba
     "une los ganchos de todas las columnas…" a "une los ganchos de las columnas del bloque sin mezclar 54 con 54E".
- **Criterios de aceptación**:
  - [ ] Fila con `Planograma_TM = 'LIMPIEZA TG-09'` y tipo MEDIANA → un `ErrorLectura` en `Planograma_TM` con su letra; `productos: []`.
  - [ ] `'LIMPIEZA TM-09'` o `'LIMPIEZA'` en `Planograma_TM` → sin error.
  - [ ] Bloque TE en 0 con `Planograma_TE = 'LIMPIEZA TG-09'` → sin errores, `bloqueoDeLectura` da el aviso de bloque vacío.
  - [ ] `npm test` en `front/` pasa.
- **Pruebas** (`front/src/utils/excelProductosPlanograma.test.ts`, nuevo `describe('bloques TG/TM/TE')` con un
  encabezado de tres bloques `['SKU', 'Planograma_TG', 'Facings_TG', 'TG1', 'Inner', '.', 'Planograma_TM', 'Facings_TM', 'TM1', '.', 'Planograma_TE', 'Facings_TE', 'TE1']`):
  - `siglaBloque`: GRANDE→TG, MEDIANA→TM, EXPRESS→TE.
  - GRANDE lee facings y ganchos de TG; MEDIANA de TM; EXPRESS de TE (valores distintos por bloque en la misma fila).
  - No une ganchos entre bloques (TG1=54, TM1=65 → GRANDE `[54]`, MEDIANA `[65]`).
  - Error de celda en bloque ajeno no bloquea; en el bloque propio sí (columna y letra correctas).
  - `bloquesEnArchivo` = `['TG','TM','TE']` en orden; `bloque` según tipo.
  - Bloque ausente: archivo solo TG + MEDIANA → `productos: []`, `bloqueoDeLectura` con detalle que contiene "bloque TM (Tienda mediana)" y "Trae: TG".
  - Bloque vacío: TE todo 0/null + EXPRESS → `filasOmitidas` con todas las filas, `bloqueoDeLectura` "El bloque TE (Tienda express) no tiene productos…".
  - Lectura correcta → `bloqueoDeLectura` = `null`.
  - Archivo sin siglas (`SKU`, `Facings`) funciona con MEDIANA; `Facings_TM` gana sobre `Facings`.
  - Faltante: `[['SKU', 'TM1']]` con MEDIANA → `columnasFaltantes = ['Facings_TM']`.
  - `siglasEnNombre`: 'LIMPIEZA TG-09' → ['TG']; 'ACEITE' → []; 'PINTURAS TM10'→['TM'] (dígito delimita).
  - `Planograma_<S>` que no coincide → error con motivo y esperado exactos (incluye «LIMPIEZA TM-09»); coincide o sin sigla → sin error; nombre > 40 caracteres se recorta con "…".
- **Depende de**: T1

### T3 — Pasar el tipo de la versión desde las páginas y la burbuja
- **Archivos**: modificar `front/src/components/dominio/editor/AgenteExtractorBubble/AgenteExtractorBubble.tsx` · `front/src/pages/EditorPlanograma/EditorPlanograma.tsx` (l. ~420) · `front/src/pages/LienzoPlanograma/LienzoPlanograma.tsx` (l. ~847)
- **Qué hacer**: agregar a `AgenteExtractorBubbleProps` `tipoVersion: VersionTipo | undefined` con JSDoc
  ("Tipo de la versión: decide qué bloque TG/TM/TE se lee del Excel"); desestructurarla y pasarla a
  `<ImportarExcelProductosModal tipoVersion={tipoVersion} …>`. En ambas páginas, `tipoVersion={version?.tipo}`
  (la variable `version` ya existe: l. 54 y l. 101).
- **Criterios de aceptación**:
  - [ ] `npx tsc -b` sin errores; ningún valor por defecto de tipo.
- **Pruebas**: tipos (`tsc`).
- **Depende de**: T4 (el modal debe aceptar la prop; T3 y T4 pueden ir en el mismo commit)

### T4 — Modal: bloqueos en el paso 1, bloque en la vista previa, versión sin tipo
- **Archivos**: modificar `front/src/components/dominio/modales/ImportarExcelProductosModal/ImportarExcelProductosModal.tsx`
- **Qué hacer**:
  1. Prop `tipoVersion: VersionTipo | undefined`.
  2. Estado `const [bloqueoLectura, setBloqueoLectura] = useState<AvisoBloqueo | null>(null)`.
     `const aviso = tipoVersion ? bloqueoLectura : AVISO_SIN_TIPO`.
  3. `seleccionar(archivo)` = `setArchivo(archivo); setBloqueoLectura(null)`; usarlo en `ZonaArrastreArchivo` y `UsarAdjuntos`.
  4. `leer()`: si `!tipoVersion` → return. `setBloqueoLectura(null)`; `const resultado = await leerExcelProductos(archivo, tipoVersion)`; orden:
     1) `const b = bloqueoDeLectura(resultado)` y `resultado.errores.length === 0` → `setBloqueoLectura(b)` (cubre ausente y vacío);
     2) `columnasFaltantes` → toast actual;
     3) sin errores y sin productos → toast actual "El archivo no tiene productos para importar";
     4) si no → `setLectura(resultado)`.
     (Bloque ausente se evalúa antes que columnas faltantes: el lector devuelve `columnasFaltantes: []` en ese caso.)
  5. `cargarOtroArchivo()` también limpia `bloqueoLectura`.
  6. Paso 1: ayuda con la frase del bloque (sección UX); `{aviso && <BloqueoErrores key={aviso.detalle}><strong>{aviso.titulo}</strong><span>{aviso.detalle}</span></BloqueoErrores>}` bajo `UsarAdjuntos`; botón "Leer archivo" `disabled={!archivo || leyendo || !tipoVersion}` y `title` sin tipo.
  7. Vista previa: Badge del bloque como en la sección UX (`TIPO_TIENDA_META[tipoVersion]`, `lectura.bloque`).
  8. Vista de errores: sin cambios (los errores de `Planograma_<S>` llegan como `ErrorLectura`).
  9. Actualizar el JSDoc del componente con la regla del bloque.
- **Criterios de aceptación**:
  - [ ] Versión MEDIANA + archivo de tres bloques → vista previa con Badge "TM · Mediana" y datos del bloque TM.
  - [ ] Versión MEDIANA + archivo solo TG → aviso rojo en el paso 1 con el texto exacto; no se abre vista previa.
  - [ ] Versión EXPRESS + archivo con TE en 0 → aviso de bloque vacío.
  - [ ] Elegir otro archivo quita el aviso.
  - [ ] `Planograma_TM='LIMPIEZA TG-09'` → vista "Errores del archivo" con la fila; "Importar" deshabilitado.
  - [ ] Sin tipo → aviso al abrir y "Leer archivo" deshabilitado.
  - [ ] Ningún color, radio ni CSS nuevo; `npm run lint` limpio.
- **Pruebas**: lógica cubierta por T2 (`bloqueoDeLectura`); el modal se verifica a mano (no hay pruebas de componentes en el proyecto).
- **Depende de**: T2

### T5 — Verificación con el archivo real
- **Qué hacer**: con `C:\Users\dventura\Downloads\Análisis - Planograma SUAVIZANTES Y LIQUIDO PLANCHAR LIMPIEZA 09.xlsx`
  en DEV (`npm run dev` en back y front): leer en una versión TG, una TM y una TE (o EXPRESS de prueba) y registrar
  el resultado (productos, errores de `Planograma_TM`, bloqueo de TE) en `04_implementacion.md`. No importar a
  versiones reales sin pedirlo al usuario.
- **Criterios de aceptación**:
  - [ ] TG: vista previa sin ganchos del bloque TM.
  - [ ] TM: la fila 6 aparece como error de `Planograma_TM` («LIMPIEZA TG-09»).
  - [ ] TE: aviso de bloque vacío.
- **Depende de**: T3, T4

### T6 — Documentación (commit de docs separado)
- **Archivos**: `Arquitectura/ESTADO_MODULOS.md` (viñeta "Front" del apartado de importación, módulo 20) · `Arquitectura/DEUDA_TECNICA.md`
- **Qué hacer**:
  - ESTADO_MODULOS: regla de bloques (sufijo exacto, gancho exacto, comunes sin sufijo, precedencia, bloque
    ausente/vacío, `Planograma_<S>` bloqueante, el tipo sale de `version.tipo`) y la nota: "versiones TG importadas
    antes del 2026-10-15 desde archivos de tres bloques pueden tener ganchos TM mezclados; se reimportan a mano".
  - DEUDA_TECNICA: nueva DT (Baja, front) `TIPO_TIENDA_META.EXPRESS` usa el color literal `#7a5900` en vez de token.
- **Depende de**: T5

## Verificación final

- `cd back && npm test` (sin cambios; debe seguir pasando)
- `cd front && npm test && npx tsc -b && npm run lint`
- Postman: no aplica (sin endpoints).
- Prueba manual: T5, más versión sin tipo simulada (abrir el editor con un `versionId` de otro planograma, si la
  página llega a montar la burbuja) o revisión de código del camino `!tipoVersion`.

## Riesgos

- Archivos con encabezados distintos a `_TG/_TM/_TE` (p. ej. `Facings TG` con espacio) → `normalizarEncabezado`
  ya convierte espacios a `_`; cubierto.
- Nombres de planograma con una sigla como palabra que no indica tamaño (p. ej. "TE" de té) → falso error
  bloqueante; el motivo muestra el valor y el usuario corrige el nombre. Riesgo bajo; si aparece, se ajusta la regla.
- Versiones ya importadas con ganchos mezclados → reimportación manual (decisión del usuario), documentada en T6.
