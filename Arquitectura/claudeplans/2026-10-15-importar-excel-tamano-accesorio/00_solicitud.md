# Solicitud — Error al importar productos del Excel (tamaño de accesorio)

- **Fecha**: 2026-10-15
- **Rama**: `feat/importar-excel-tamano-accesorio` · **Commit base**: `76dd82731ec51099164b6375a7cf92710cdc7b1f`
- **Tamaño**: M (reclasificada desde S) — cambia el contrato de `POST /versiones/:id/importar-productos` (varios accesorios por producto), el lector del Excel y la tabla del modal; sin migración (PosicionAccesorio ya admite varios por posición con `orden`)
- **Etapas**: arquitecto (1, 3) · disenador-ux · seguridad-integridad (2, 5) · desarrollador · revisor-calidad

## Solicitud del usuario

al momento de importar los datos en la vista de la captura, en el lienzo importando excel adjunto de este planograma, aparecen 45 productos para importar, pero al dar clic en el botó para importar lanza un error con este mensaje  Datos de entrada inválidos, puedes validar el caso y determinar la causa ?

## Contexto adicional

- Lienzo: `/planogramas/83/versiones/103/lienzo`, archivo `Análisis - Planograma LIMPIEZA TG-12.xlsx`.
- Respuesta del endpoint `POST /versiones/103/importar-productos`:
  `400 VALIDATION_ERROR` — `"productos[42].tamano_accesorio_pulgadas" must be less than or equal to 999`.

## Diagnóstico (coordinador)

Reproducido leyendo el archivo con `interpretarHojaProductos` y validando con el mismo esquema Joi del back.
La fila 197 (SKU 1111754, accesorio `VDA-22R-PTH`) trae en `Tamano_accesorio_TG` el texto `22" // 22"`.
`numero()` en `front/src/utils/excelProductosPlanograma.ts` elimina todo lo que no sea dígito antes de
convertir, así que `22" // 22"` → `"2222"` → 2222, que supera el máximo de 999 del back y rechaza todo el
lote. El mismo defecto afecta a cualquier celda numérica con dos números (cantidades, mín./máx.).

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| P1 — Nombre y tamaño de accesorio con distinta cantidad de valores `//` | "si no cuadran cantidades y tamaños, debe mostrar al usuario un modal con la fila en la que se encuentra el error y la columna en la que se encuentra el error, y el motivo, al igual que la indicación de cómo debería llegar el valor, y no importar nada, todas las filas deben estar bien antes de cargar el archivo, recomendarle al usuario solventar el error, cargar nuevamente el archivo y luego importar" |
| P2 — Otras celdas numéricas con dos números (facings, cantidades, mín./máx.) | Misma respuesta que P1: error bloqueante con fila, columna, motivo y formato esperado; no se importa nada hasta corregir el archivo. |
| P3 — Producto repartido en varios espacios del PDF | "Sí, cada espacio todos": cada espacio lleva la lista completa de accesorios. |

**Interpretación del coordinador (a confirmar en la aprobación 1):** el bloqueo aplica a valores mal
formados o fuera de rango (incluye los que hoy rechaza el back, como tamaño > 999). Las filas sin facings
y las filas vacías/sin SKU se siguen omitiendo como hoy (no son errores de formato). El botón Importar
queda deshabilitado mientras haya errores bloqueantes; el modal de errores lista fila, columna, motivo y
cómo debería venir el valor, y recomienda corregir el archivo y volver a cargarlo.

## Aclaración del usuario (2026-10-15) — reglas del separador `//`

Texto del usuario:

> cuando aparecen así, // significa que son dos accesorios los que utiliza, del accesorio colocado en la celda, utiliza dos y cada uno es de 22'
> deberíamos registrarlo como dos accesorios iguales, pero en el campo de nombre de accesorio también el nombre podría venir separado por //, indicando dos nombres diferentes de accesorios y el tamaño debería llegar separado también, si no viene separado significa que los dos accesorios son del mismo tamaño

Reglas que se derivan (a validar por el arquitecto):
1. `Nombre_accesorio = A`, `Tamano = 22" // 22"` → dos accesorios A, cada uno de 22.
2. `Nombre_accesorio = A // B`, `Tamano = 22" // 12"` → A de 22 y B de 12 (emparejados por posición).
3. `Nombre_accesorio = A // B`, `Tamano = 22"` → A de 22 y B de 22 (un solo tamaño aplica a todos).
4. Un solo nombre y un solo tamaño → un accesorio (comportamiento actual).
5. Se guardan como varias filas de `PosicionAccesorio` de la misma posición (`orden` 1, 2, ...).
6. Cantidades que no cuadran (ej. 2 nombres y 3 tamaños) → definir: error de fila o advertencia.

El plan S anterior (tomar solo el primer número) queda descartado: `PLAN_v0_descartado.md`.

## Cambios pedidos en la aprobación 1

- Decisión 1 (usuario): "accesorio fuera del catálogo, al igual que ahora aparece una advertencia que no existe y si desea darlo de alta, si no lo da de alta, entonces generar error y mostrarlo como que el accesorio no existe en el catálogo". → Ya no se importa sin el accesorio: al pulsar Importar, si sigue sin existir es error bloqueante (back también rechaza todo el lote).
- Decisión 2 (usuario): "sí bloquea la carga, esos campos son enteros, a excepción de los ganchos donde sí puede existir 5E, esos son ganchos de exhibición y sí son válidos". → Facings, cantidades, mín./máx. enteros estrictos. Ganchos aceptan sufijo `E` (exhibición). En el Excel TG-26 hay valores como `54E`, `65 | 54E`; hoy se leen como número (54) y se mezclan con el gancho normal 54.

- Usuario: "ese plan tiene cosas de permisos y cao ... ya se envió a publicar ... solo deberíamos ver los errores de carga y los accesorios separados con //". Se retiró T5 (matriz de permisos) y el control S9; alcance limitado a errores de carga y accesorios `//`.
- Ganchos de exhibición (usuario, 2026-10-15): "Guardar 54E tal cual" — el gancho `54E` se guarda y se muestra distinto del `54` normal (lienzo, consulta, cruce con Por ubicar). Implica revisar cómo se guarda `Posicion.ganchos` (hoy JSON de números) y la numeración/uso en `skuVersion.entity.js` e `importarLayout`.
- P-E1 (usuario): "Sí, también el PDF" — los PDF traen ganchos `54E`. Coordinador: el extractor PDF queda fuera de este plan (alcance pedido: errores de carga del Excel y accesorios `//`); se registra como deuda/plan aparte.
- P-E2 (usuario): "No cuenta" — si Facings viene vacío, solo los ganchos normales cuentan como facings; los `E` no.
- P-E3 (usuario): "No, solo E (bloquear)" — ganchos con otra letra son error bloqueante con fila y columna.
