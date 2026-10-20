# 06 — Cierre

Código en el commit `ba4b688`. Documentación actualizada (T14): `ESTADO_MODULOS.md` (módulos 16 y 21), `ENDPOINTS.md` (sección 16 nueva), `CASOS_DE_USO.md` (CU-10-05 y CU-10-06), `Contratos/16_implementacion/` (contrato nuevo del POST y GET actualizado), `ESTRUCTURA_BACKEND.md` (`application/compartido/`) y `DEUDA_TECNICA.md` (DT-71 a DT-80). `CLAUDE.md` no cambia (sin migraciones; el estado de módulos ya cubre el 16). Sin cambios en `DISENO_SISTEMA.md`, tokens ni stylelint.

## Menores pendientes (sugerencias)

De `05_revision_calidad.md` (M1 y M4 ya corregidos en la ronda 1):
- **M2**: más de 30 000 `posicionIds` visibles terminan en un toast genérico; avisar en el modal o deshabilitar Descargar con `title`.
- **M3**: lógica de descarga de `Blob` duplicada (Por planograma, `ConsolidadoTiendas.tsx`, `ModalExportarLienzo.tsx`); extraer `descargarBlob(blob, nombre)` a `front/src/utils/`.
- **M5**: `13` repetido en `exportacionPorVersion.entity.js`; usar `CAMPOS_BLOQUE_PIVOTE.length`.
- **M6**: accesorios del Pivote con nombres sin repetir y tamaños sin deduplicar pueden dar "N nombres y M tamaños" al reimportar (falla segura); escribir un código por accesorio o documentar la limitación.
- **M7**: el modal muestra "Versiones: 0" si las versiones elegibles tardan más que los productos; agregar `versiones === null` a `descargaDeshabilitada`.
- **M8**: doble validación Joi del cuerpo; que `validarCuerpo` guarde el valor en `res.locals` y el controller lo reutilice (opcional).

De `05_revision_seguridad.md` (M1 ya corregido):
- **M2**: igual que M2 de calidad (mensaje confuso con más de 30 000 filas visibles; falla segura).
- **M3**: el `503` de CATI expone `causa.message` en `details` (`catiClient.js`), alcanzable ahora desde el listado y la descarga; registrarlo solo en el log. Equivale a DT-15 para CATI; no se registró como DT nueva, conviene ampliar DT-15.
- **M4** y **M5**: ya registrados como DT-77 y DT-76.
- **M6**: el parser JSON responde antes que la autorización (un solo-implementador con JSON roto o mayor a 512 kb recibe 400/413 en vez de 403); aceptable, documentado en el contrato.

## Propuestas de diseño pendientes de aprobación (no implementadas)

1. Extraer a `ui/ModalDescarga` el esqueleto común de `DescargarConsolidadoModal` y `DescargarProductosVersionModal`.
2. Escala de espaciado `--space-1…5` y regla stylelint contra literales de `px` en `padding`/`gap` (DT-04).

(La propuesta 2 del plan, `filtrosExtra` en `ProductosVersiones`, se implementó en la ronda 2 a pedido del usuario junto con `filtrosExtraActivos`, `onLimpiarFiltrosExtra` y `accionesExtra`; el cambio al sistema de diseño no se documentó en `DISENO_SISTEMA.md`.)
