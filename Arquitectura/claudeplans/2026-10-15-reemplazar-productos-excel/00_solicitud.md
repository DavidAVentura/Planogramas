# Solicitud — Reemplazar productos importados del Excel y recargar las versiones de Limpieza

- **Fecha**: 2026-10-15
- **Rama**: `feat/reemplazar-productos-excel` (worktree `.claude/worktrees/importar-excel-bloque-tamano`) · **Commit base**: `9b45e498be1826f644015bf9399d23665cf2d19d` (develop local; origin/fork siguen en `2a06094`)
- **Estado**: ⏸ **PENDIENTE** (2026-10-15) — `PLAN.md` listo, **sin aprobación 1** y sin código. Por decisión del
  usuario se retoma después de terminar la feature que corre en paralelo, en este orden: (1) diseño de front
  (`disenador-ux`: opción "Reemplazar productos" del modal y pantalla de recarga), (2) actualizar `PLAN.md` con ese
  diseño (arquitecto, etapa 3), (3) aprobación 1, (4) desarrollo. Al retomar: crear la rama desde `develop`
  actualizado, revisar que la numeración de deuda DT-43…DT-46 siga libre y que no haya cambios en el lector.
- **Tamaño**: L — borra datos (posiciones de la versión), cambia un endpoint, lee Excels de Azure Blob y corre una recarga masiva en DEV.
- **Etapas**: arquitecto (1, 3) · disenador-ux · seguridad-integridad (2, 5) · desarrollador · revisor-calidad

## Solicitud del usuario

> ¿Cómo quedaron las versiones de planograma que tienen dos bloques pero se cargaron antes de la
> actualización? Hay que volverlas a cargar. ¿Podemos hacer un script o similar para borrar todos los
> productos e importarlos nuevamente desde el Excel?

## Contexto adicional

- Sigue a `2026-10-15-importar-excel-bloque-tamano`: el lector anterior unía los ganchos de TG/TM/TE y tomaba
  los demás campos de la primera columna (TG). Versiones TG: ganchos mezclados. Versiones TM/TE: todos los
  campos del bloque TG.
- Reimportar hoy no corrige nada: `filtrarProductos` omite los SKU que ya están en la versión ("Ya está en la versión").
- Los productos se importan a la góndola "Por ubicar" (`importarPorUbicar`, `importacion.repository.js`).
- El lector de Excel vive en el front (`front/src/utils/excelProductosPlanograma.ts`, `read-excel-file`); el back no
  tiene librería de Excel.
- Los adjuntos de versión aceptan `.xlsx` (módulo 13, Azure Blob `adjuntos-dev` en DEV).

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| ¿Los productos de las versiones afectadas siguen en "Por ubicar" o ya se ubicaron? | **Siguen en "Por ubicar"**: borrar y reimportar no pierde trabajo de ubicación. |
| ¿Cómo corregirlas? | **Ambas**: (1) dejar en el modal de importación una opción permanente "Reemplazar productos" (quitar los productos cargados previamente y cargar de nuevo), y (2) **ahora** ejecutar la recarga para todas las versiones afectadas. |
| ¿Qué versiones? | **Todas las de Limpieza** (todos los planogramas del departamento/categoría Limpieza y sus versiones). |
| ¿De dónde sale el Excel de cada versión? | **Del adjunto de la versión** (Azure Blob); el proceso lo descarga de ahí. |
| ¿Ambiente? | **Solo DEV** (BD `OTB`, blob `adjuntos-dev`). PROD queda fuera; se decidirá después con confirmación explícita. |

### Respuestas a las preguntas abiertas de `01_arquitectura.md` (cambian la recomendación del arquitecto)

| Pregunta | Respuesta del usuario |
|---|---|
| Recarga masiva: ¿pantalla en el front o script? | **Script en el back, ejecutado desde la terminal.** "Ahorita solo construye todo en el backend y lo ejecutamos desde allí". Hay que llevar/compartir la lectura del Excel en el back. Dejar todo listo (casos de uso, endpoints o servicios reutilizables, reporte de simulación con forma estable) para que **una feature siguiente** construya la pantalla del front y la opción "Reemplazar productos" del modal. **Este cambio no toca el front.** |
| ¿Versiones de Limpieza publicadas o en piloto? | **Recargarlas también.** La recarga masiva debe poder escribir en versiones no editables (publicado/piloto); el flag `reemplazar` del endpoint normal sigue respetando la regla de versión editable salvo que el plan justifique otra cosa. Seguridad debe definir cómo se acota esta excepción. |
| ¿Herramienta permanente o se retira? | **Permanente** (útil después para PROD y otros departamentos). |
| ¿Cómo se reconoce Limpieza? | **Departamento Limpieza** en la jerarquía (CATI) del planograma; el script filtra por departamento (parámetro). |

## Cambios pedidos en la aprobación 1

