# Estándar de pruebas Postman — Backend Planogramas

Reglas obligatorias para las pruebas de acertividad en Postman de `back/`. Aplican a cualquier
persona o agente (Claude Code u otro) que implemente o modifique un endpoint. El objetivo: cada
grupo de endpoints (módulo) debe tener su propio set de pruebas manuales, ejecutable en cada
revisión sin preparación manual salvo la documentada explícitamente aquí.

Ver también `CLAUDE.md` (raíz del repo) sección "Convención de errores HTTP", [[ESTRUCTURA_BACKEND]],
[[ENDPOINTS]] y [[Contratos/README|Contratos/]] (fuente de verdad de qué endpoints y códigos de
error existen por módulo).

---

## 1. Único archivo fuente

- El único archivo que se edita a mano es **`postman/planogramas-import.postman_collection.json`**
  (formato Postman Collection v2.1). Se versiona en git como cualquier otro archivo del repo.
- **Nunca editar a mano** `postman/postman/**` ni `postman/.postman/**`. Esa carpeta es un espejo
  generado automáticamente por la función de Git Sync de Postman Cloud (un YAML por
  request/carpeta) — cualquier edición manual ahí se pierde en el siguiente sync y no tiene efecto
  sobre lo que la gente importa.
- Después de cada edición, validar que el JSON siga siendo válido (no hay `jq` disponible en este
  entorno):
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('postman/planogramas-import.postman_collection.json','utf8')); console.log('JSON válido')"
  ```
- Flujo para que un humano recoja los cambios: borrar la colección vieja en su Postman (Delete) y
  volver a hacer Import del archivo actualizado. El entorno (`HOST`) no se pierde porque vive
  aparte de la colección.

---

## 2. Estructura obligatoria: un módulo = una carpeta

La colección tiene una carpeta de primer nivel por módulo, con el mismo nombre y el mismo orden que
`Arquitectura/Contratos/`:

```
planogramas → versiones → gondolas → niveles → posiciones → sustituciones →
exportacion → catalogo → accesorios → tiendas → jerarquia
```

Dentro de cada módulo, **una sub-carpeta por endpoint**, nombrada:

```
{Verbo en infinitivo} {entidad} ({MÉTODO} {ruta con "-" en vez de "/"})
```

Ejemplos ya existentes en `planogramas`:

- `Listar planogramas (GET /planogramas)`
- `Crear planograma (POST /planogramas)`
- `Editar planograma (PATCH /planogramas/:id)`
- `Archivar planograma (POST /planogramas/:id/archivar)`

Esto debe mapear 1:1 contra los archivos de contrato en `Arquitectura/Contratos/{NN}_{modulo}/`
(un archivo de contrato por endpoint, mismo criterio).

Solo si un módulo necesita datos de arranque (ver sección 5) se agrega una carpeta adicional
`Setup - datos de prueba` **como primer ítem** de la carpeta del módulo, antes de cualquier otra
sub-carpeta de endpoint.

---

## 3. Cobertura mínima por endpoint

Dentro de la carpeta de cada endpoint, un request por escenario, nombrado:

```
{status HTTP} - {descripción corta del escenario en español}
```

Cobertura mínima obligatoria, derivada de la tabla "Códigos de error" del contrato correspondiente
en `Arquitectura/Contratos/`:

1. Un request de **éxito** (2xx) por cada combinación de comportamiento distinto documentada (ej.
   "sin filtros" y "con filtros" cuentan como dos escenarios de éxito si el contrato los distingue).
2. Un request por **cada código de error que el endpoint implementa realmente hoy**. No agregues
   pruebas de códigos que el contrato menciona pero que el código actual no implementa todavía
   (ej. si el módulo no valida JWT aún, no agregues un escenario 401/403 — eso genera pruebas que
   fallan por diseño y rompe la confianza en la colección). Cuando ese código se implemente,
   agrega el escenario en el mismo cambio.
3. Si el endpoint tiene una regla de negocio con múltiples ramas de error del mismo status (ej.
   422 por dos motivos distintos), cada rama es un request separado — no un solo request genérico.

---

## 4. Reglas de los scripts de test (`pm.test`)

Cada request debe traer su propio script en `event.listen === "test"` con, como mínimo:

1. **Assert de status code** — siempre, sin excepción:
   ```js
   pm.test('Status 201', () => pm.response.to.have.status(201));
   ```
2. **Assert de forma de la respuesta**, siguiendo las convenciones de `CLAUDE.md`:
   - Errores: `{ error: { code, message, details? } }` → validar `error.code` contra el código
     esperado (`VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `UNPROCESSABLE`, etc.), no solo el
     status HTTP.
   - Listas paginadas: `{ data: [], total, page, pageSize }` → validar que `data` sea array, que
     `page`/`pageSize` reflejen lo pedido (o los defaults), y `total` sea número.
   - Recursos creados/editados: validar los campos que la regla de negocio garantiza (ej. `estado`
     inicial, cantidad de elementos en un array, que un campo cambió de valor).
3. No probar implementación interna (SQL, nombres de columnas) — solo contrato HTTP observable.

---

## 5. Repetibilidad: nada de fixtures que se rompen en la segunda corrida

Regla de oro: **la colección completa debe poder correrse con el Runner las veces que se quiera,
sin editar nada a mano entre corridas**, salvo lo documentado como "seed manual" (sección 6).

Para lograrlo:

- **Cualquier valor usado para probar unicidad** (nombre, código, etc.) debe ser dinámico, nunca
  literal fijo, usando variables dinámicas nativas de Postman: `{{$timestamp}}`, `{{$randomUUID}}`.
  Ejemplo: `"nombre": "Autos - Rack Frontal A {{$timestamp}}"`.
- **Cualquier request que muta estado de forma permanente** (archivar, publicar, eliminar, etc.) y
  cuyo resultado feliz (2xx) es insumo de otro escenario, **no debe apuntar a un id fijo
  hardcodeado**. En vez de eso:
  1. Agregar una carpeta `Setup - datos de prueba` como primer ítem del módulo.
  2. Ahí, un request que crea el recurso fresco que se necesita (nombre dinámico).
  3. En su script de test, guardar el id en una variable de colección:
     ```js
     pm.test('Status 201', () => pm.response.to.have.status(201));
     pm.collectionVariables.set('miIdDeFlujoFeliz', pm.response.json().id);
     ```
  4. El resto de requests del módulo referencian `{{miIdDeFlujoFeliz}}` en vez de un número fijo.
- Patrón de referencia ya implementado: carpeta `planogramas/Setup - datos de prueba` → request
  `201 - Crear planograma temporal para flujo feliz (setup)` → llena `planogramaId`.

---

## 6. Variables de colección: solo para fixtures que no se pueden crear vía API

Las variables definidas en el nivel de colección (`variable: [...]`) son **exclusivamente** para
estados que:

- No se pueden generar en cada corrida vía Setup (sección 5) porque requieren datos que ya
  existían de antes, o
- Requieren un endpoint que todavía no existe (módulo comentado en
  `back/src/infrastructure/http/routes/index.js`).

Cada variable de este tipo debe:

1. Tener una `description` que explique exactamente qué estado de BD requiere y por qué no se
   puede generar vía Setup.
2. Si el estado se puede crear vía API (aunque sea con varias llamadas), preferir automatizarlo en
   Setup en vez de dejarlo como variable estática — una variable estática es el último recurso.
3. Si el estado **solo** se puede crear con SQL directo (porque el endpoint no existe todavía, ej.
   `versiones`/`tiendas` en el piloto actual), documentar en la descripción de la variable (o en un
   comentario junto al request que la usa) el script SQL mínimo para recrearlo si la BD se limpia,
   igual que se hizo para `planogramaIdConVersionesPublicadas` (ver historial de la colección).
4. Cuando el endpoint que faltaba se implemente, migrar esa variable estática al patrón de Setup
   automático (sección 5) en el mismo cambio que agrega las pruebas del endpoint nuevo.

---

## 7. Checklist al agregar pruebas para un endpoint o módulo nuevo

1. Ubicar el contrato en `Arquitectura/Contratos/{NN}_{modulo}/{ARCHIVO}.md` y su tabla de
   "Códigos de error".
2. Confirmar contra el código real (`back/src/domain/*/**.usecases.js` y
   `back/src/infrastructure/repositories/*.repository.js`) qué códigos de error están realmente
   implementados hoy — la tabla del contrato puede ir por delante de la implementación.
3. Crear la carpeta del endpoint dentro de la carpeta del módulo, en el orden en que aparece en el
   router (`back/src/infrastructure/http/routes/{modulo}.routes.js`).
4. Un request de éxito + un request por cada error implementado (sección 3), con scripts de test
   completos (sección 4).
5. Si algún escenario requiere un recurso que otro request de la misma corrida también necesita en
   estado "no tocado", usar el patrón de Setup (sección 5) — no reutilizar un id fijo entre
   escenarios que mutan y escenarios que solo leen.
6. Si el escenario necesita un fixture que la API todavía no puede crear, documentarlo como
   variable estática (sección 6) con su script SQL de recreación.
7. Validar el JSON (comando en sección 1) antes de terminar el cambio.
8. Si el cambio solo toca pruebas (sin tocar código de `back/`), decirlo explícitamente al
   commitear — no mezclar cambios de pruebas con cambios funcionales sin avisar (misma regla que
   ya aplica a los `.md` de proyecto, ver `CLAUDE.md`).
