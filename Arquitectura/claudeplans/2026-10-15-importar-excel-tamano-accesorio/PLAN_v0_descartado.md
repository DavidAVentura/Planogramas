# PLAN — Lectura de números del Excel de productos: tomar el primer número de la celda

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.

## Objetivo

Que el Excel de productos se pueda importar cuando una celda numérica trae más de un número o texto
adicional (ej. `22" // 22"`). Hoy se concatenan los dígitos (2222) y el back rechaza todo el lote con
"Datos de entrada inválidos".

## Decisiones

| Decisión | Razón |
|---|---|
| `numero()` toma el **primer** número de la celda (con decimal `.` o `,` opcional y signo opcional) en vez de quitar todo lo que no es dígito | `22" // 22"` significa 22 pulgadas; concatenar dígitos inventa valores. Aplica igual a cantidades y mín./máx. |
| Se corrige solo en el front; el back no cambia | El límite de 999 del back es correcto; el dato mal formado nace en el lector |
| El toast de error de importación muestra el primer `details` del back cuando existe | Hoy el usuario solo ve "Datos de entrada inválidos" sin saber qué fila falla |

## Fuera de alcance

- Cambiar los límites o el esquema Joi de `POST /versiones/:id/importar-productos`.
- Reportar en el modal, antes de importar, los valores fuera de rango por fila.

## Contratos

Sin cambios.

## Datos

Sin cambios de BD.

## Seguridad (controles obligatorios)

No aplica (sin endpoints, consultas ni permisos).

## UX (resumen para implementar)

Sin componentes nuevos. Solo el texto del toast de error: `mensajeDeError` + detalle del back si viene.

## Tareas

### T1 — `numero()` toma el primer número de la celda
- **Archivos**: modificar `front/src/utils/excelProductosPlanograma.ts` · crear `front/src/utils/excelProductosPlanograma.test.ts`
- **Qué hacer**: en `numero(valor)`, para texto, buscar el primer token con `/-?\d+(?:[.,]\d+)?/` y convertirlo
  (coma decimal → punto). Si no hay token, `null`. Los números nativos de Excel no cambian.
- **Criterios de aceptación**:
  - [ ] `22" // 22"` → 22; `12"` → 12; `2,5` → 2.5; `abc` → null; `22` (número) → 22.
  - [ ] Con el Excel `Análisis - Planograma LIMPIEZA TG-12.xlsx`, los 45 productos pasan el esquema del back.
- **Pruebas**: Vitest sobre `interpretarHojaProductos` con filas sintéticas (encabezado + filas): tamaño
  `22" // 22"` → `tamano_accesorio_pulgadas: 22`; facings `"3 // 4"` → 3; fila sin facings va a `filasConError`.
- **Depende de**: —

### T2 — Mostrar el detalle de validación en el toast de importación
- **Archivos**: revisar `front/src/utils/errors.ts`; modificar solo si `mensajeDeError` no expone `details`
  (`ImportarExcelProductosModal.tsx` línea ~95 o el util, lo que sea más acotado y reutilizable).
- **Qué hacer**: si la respuesta trae `error.details[0]`, mostrar `"<message>: <details[0]>"`.
- **Criterios de aceptación**:
  - [ ] Un 400 con details muestra el primer detalle en el toast; sin details, el comportamiento actual.
- **Pruebas**: Vitest de `mensajeDeError` si se modifica el util.
- **Depende de**: —

## Verificación final

- `cd front && npm test && npx tsc -b && npm run lint`
- Prueba manual: lienzo de LIMPIEZA 12-TG (v103) → Importar Excel adjunto → 45 productos se importan a "Por ubicar".

## Riesgos

- Una celda con rango tipo `10-20` ahora se lee como 10 (antes 1020) → aceptable; antes era siempre incorrecto.
