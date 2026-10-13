# PLAN — <título>

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.

## Objetivo

<2-3 líneas: qué cambia para el usuario y por qué>

## Decisiones

| Decisión | Razón |
|---|---|

## Fuera de alcance

- <lo que NO se hace en este plan>

## Contratos

<Endpoints nuevos o modificados: método, ruta, permiso requerido, request, response, errores
(`{ error: { code, message, details? } }`). Tipos TS del front que cambian.>

## Datos

<Migración `NNN_descripcion.js`: tablas/columnas/índices, default/backfill, cómo se revierte.
“Sin cambios de BD” si no aplica.>

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|

## UX (resumen para implementar)

<Componentes base a usar, componentes nuevos (carpeta y props), tokens, textos exactos de estados.
“Sin cambios de UI” si no aplica.>

## Tareas

### T1 — <título>
- **Archivos**: crear `ruta` · modificar `ruta`
- **Qué hacer**: <pasos concretos; firmas de funciones con parámetros y retorno>
- **Criterios de aceptación**:
  - [ ] <verificable>
- **Pruebas**: <archivo de prueba y casos>
- **Depende de**: —

### T2 — …

## Verificación final

- `cd back && npm test`
- `cd front && npm test && npx tsc -b && npm run lint`
- Postman: carpeta `<NN - módulo>` (si aplica)
- Prueba manual: <pasos en la app>

## Riesgos

- <riesgo → mitigación>
