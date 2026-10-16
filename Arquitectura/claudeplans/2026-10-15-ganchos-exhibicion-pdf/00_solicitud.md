# Solicitud — Ganchos de exhibición (`NNE`) en el extractor de PDF (DT-27)

- **Fecha**: 2026-10-15
- **Rama**: `feat/ganchos-exhibicion-pdf` (desde `feat/importar-excel-tamano-accesorio`, que trae los helpers de ganchos) · **Commit base**: `b5efe60bdfce497ff3c3addc1a01428d5774bfb4`
- **Tamaño**: M — cambia un módulo existente (agente-extractor del back + modal extractor PDF del front) y la validación de un endpoint (`importar-layout`); sin migración (`Posicion.ganchos` ya guarda el arreglo mixto)
- **Etapas**: arquitecto (1, 3) · disenador-ux (solo si cambia lo visible del modal) · seguridad-integridad (2, 5) · desarrollador · revisor-calidad

## Solicitud del usuario

(Enviada por la sesión coordinadora, en nombre del usuario.)
Ejecuta /desarrollo para la deuda DT-27 de Arquitectura/DEUDA_TECNICA.md: los extractores de PDF e imagen
numerada del planograma solo devuelven ganchos enteros, pero el PDF sí imprime ganchos de exhibición como `54E`,
que hoy se leen como 54 o no cruzan con "Por ubicar". Objetivo: que el extractor PDF
(front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/, importacionPdf.ts,
types/extractorPdfPlanograma.ts y el agente extractor del back) detecte y envíe ganchos `NNE` usando los helpers
ya existentes (back/src/domain/compartido/gancho.js `normalizarGancho`, front/src/domain/ganchos/gancho.ts) y el
esquema común back/src/application/compartido/ganchos.schema.js, de modo que importar-layout con usar_por_ubicar
cruce `54E` con `54E`. Terminado = extracción con E probada, pruebas de dominio, Postman de importar-layout con un
gancho E, docs y deuda DT-27 cerrada.

## Contexto adicional

- Plan previo que dejó la deuda: `Arquitectura/claudeplans/2026-10-15-importar-excel-tamano-accesorio/`
  (ganchos `54E` en `Posicion.ganchos` como arreglo mixto: número para normales, texto `"NNE"` para exhibición;
  no reservan número en la numeración y no cuentan como facing).
- Permisos/CAO no se tocan.

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|

## Cambios pedidos en la aprobación 1

_Aprobado por el usuario sin cambios (2026-10-15)._
