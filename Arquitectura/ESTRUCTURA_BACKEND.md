# Estructura de carpetas — Backend (`back/`)

Estructura aprobada. Todo código nuevo debe respetar esta organización.
Ver `CLAUDE.md` sección "Backend" para los principios de diseño que la sustentan, y
[[ESTANDAR_PRUEBAS_POSTMAN]] para el estándar de pruebas Postman que debe acompañar cada módulo.

## Árbol de carpetas

```
back/
├── index.js                              # Entry point: carga env, monta app, arranca servidor
├── knexfile.js                           # Configuración del CLI de Knex para migraciones
│
└── src/
    ├── config/
    │   └── env.js                        # ÚNICO punto que lee process.env y exporta constantes
    │
    ├── infrastructure/
    │   │
    │   ├── db/
    │   │   ├── connection.js             # Pool de conexión a SQL Server (usa env.js)
    │   │   └── migrations/              # Archivos de migración Knex (001_*, 002_*, ...)
    │   │
    │   ├── http/
    │   │   ├── app.js                   # Configura Express: middlewares globales + router raíz
    │   │   ├── middlewares/
    │   │   │   ├── autenticacion.js     # Valida el JWT de usuario con CAO y dispara el keepalive de su sesión
    │   │   │   ├── errorHandler.js      # Middleware de error global → { error: {code, message} }
    │   │   │   ├── notFound.js          # 404 catch-all
    │   │   │   └── validate.js          # Wrapper de validación Joi (reutilizable en controllers)
    │   │   └── routes/
    │   │       ├── index.js             # Monta todos los sub-routers bajo /api/v1
    │   │       ├── planogramas.routes.js
    │   │       ├── versiones.routes.js
    │   │       ├── gondolas.routes.js
    │   │       ├── niveles.routes.js
    │   │       ├── posiciones.routes.js
    │   │       ├── sustituciones.routes.js
    │   │       ├── exportacion.routes.js
    │   │       ├── catalogo.routes.js
    │   │       ├── producto.routes.js   # Escritura de dimensiones; montado también bajo /catalog
    │   │       ├── accesorios.routes.js
    │   │       ├── tiendas.routes.js
    │   │       ├── asignaciones.routes.js # Matriz de Estructura, ediciones e historial
    │   │       └── jerarquia.routes.js
    │   │
    │   ├── cao/
    │   │   └── caoAuthClient.js         # GET /auth/validar_token (con cache) + POST /auth/keepalive (máx. 1 por token cada 60 s)
    │   │
    │   ├── cati/
    │   │   ├── catiClient.js            # POST /Auth/exchange + llamadas CATI con Bearer + API key
    │   │   └── tokenManager.js          # Cachea accessToken, verifica expiración, refresca
    │   │
    │   └── repositories/               # Implementaciones concretas (SQL Server vía Knex)
    │       ├── planograma.repository.js
    │       ├── version.repository.js    # Incluye calcularPlanPublicacion (solo lectura, la usan publicar y simular)
    │       ├── gondola.repository.js
    │       ├── nivel.repository.js
    │       ├── posicion.repository.js
    │       ├── sustitucion.repository.js
    │       ├── producto.repository.js
    │       ├── accesorio.repository.js
    │       └── tienda.repository.js
    │
    ├── domain/
    │   ├── planograma/
    │   │   ├── planograma.entity.js     # Reglas de negocio puras (sin Express, sin DB)
    │   │   ├── planograma.usecases.js   # Crear, editar, archivar, listar
    │   │   └── planograma.repository.js # Contrato (interfaz) del repositorio
    │   ├── version/
    │   │   ├── version.entity.js
    │   │   ├── version.usecases.js      # Promover estado, simular publicación, asignar tiendas, guardar borrador
    │   │   └── version.repository.js
    │   ├── gondola/
    │   │   ├── gondola.entity.js
    │   │   ├── gondola.usecases.js
    │   │   └── gondola.repository.js
    │   ├── nivel/
    │   │   ├── nivel.entity.js
    │   │   ├── nivel.usecases.js
    │   │   └── nivel.repository.js
    │   ├── posicion/
    │   │   ├── posicion.entity.js       # Cálculos: capacidad_maxima, min_estetico
    │   │   ├── posicion.usecases.js     # Mover, copiar, validar desborde
    │   │   └── posicion.repository.js
    │   ├── sustitucion/
    │   │   ├── sustitucion.usecases.js
    │   │   └── sustitucion.repository.js
    │   └── producto/                    # Dimensiones físicas de la tabla local Producto —
    │       ├── producto.entity.js       # separado de "catalogo" (proxy CATI sin dominio propio)
    │       ├── producto.usecases.js
    │       └── producto.repository.js
    │
    └── application/
        ├── planogramas/
        │   └── planogramas.controller.js  # Recibe req/res, llama usecase, responde
        ├── versiones/
        │   └── versiones.controller.js
        ├── gondolas/
        │   └── gondolas.controller.js
        ├── niveles/
        │   └── niveles.controller.js
        ├── posiciones/
        │   └── posiciones.controller.js
        ├── sustituciones/
        │   └── sustituciones.controller.js
        ├── exportacion/
        │   └── exportacion.controller.js
        ├── catalogo/
        │   └── catalogo.controller.js     # Proxy a CATI
        ├── producto/
        │   └── producto.controller.js     # Escritura de dimensiones (tabla local Producto)
        ├── accesorios/
        │   └── accesorios.controller.js
        ├── tiendas/
        │   └── tiendas.controller.js
        ├── jerarquia/
        │   └── jerarquia.controller.js    # Proxy a CATI
        └── compartido/                    # Piezas de la capa application usadas por varios módulos
            ├── semaforo.js                # crearSemaforo + semaforoExportacion (uno por proceso, todas las exportaciones .xlsx)
            └── esquemasComunes.js         # PATRON_JERARQUIA, listaEnteros, nivelJerarquia (fragmentos Joi)
```

## Flujo de una request

```
HTTP Request
  → infrastructure/http/routes/     (define método + path, delega al controller)
  → application/*/controller        (extrae params, llama usecase, formatea response)
  → domain/*/usecases               (lógica de negocio, usa contrato del repositorio)
  → infrastructure/repositories/    (ejecuta la query SQL Server, retorna datos)
```

## Reglas de dependencia (arquitectura hexagonal)

| Capa | Puede importar de | NO puede importar de |
|------|-------------------|----------------------|
| `domain/` | Solo otras clases del dominio | `infrastructure/`, `application/`, Express, Knex |
| `application/` | `domain/` | `infrastructure/db/`, Knex directamente |
| `infrastructure/` | `domain/` (contratos), `config/` | `application/` |
| `config/env.js` | `dotenv` | Nada del proyecto |

## Convenciones de nomenclatura

- Archivos en `domain/`: `{entidad}.entity.js`, `{entidad}.usecases.js`, `{entidad}.repository.js`
- Archivos en `infrastructure/repositories/`: `{entidad}.repository.js`
- Archivos en `application/`: `{modulo}.controller.js`
- Archivos en `routes/`: `{modulo}.routes.js`
- Migraciones: `{NNN}_{descripcion_snake}.js` (ej. `002_sesiones_captura.js`)

---

## Método de trabajo para implementar un módulo nuevo

Flujo end-to-end para llevar un módulo de "contrato documentado" a "código + pruebas
funcionando", tomando `planogramas` como plantilla:

1. **Leer el contrato.** `Arquitectura/Contratos/{NN}_{modulo}/{ARCHIVO}.md` por endpoint —
   define request/response, reglas de negocio y tabla de códigos de error. `Arquitectura/ENDPOINTS.md`
   da el resumen de todos los endpoints del módulo y su caso de uso (`CU-XX-XX`, ver
   `Arquitectura/CASOS_DE_USO.md`).
2. **Verificar el esquema de BD.** Confirmar en `back/src/infrastructure/db/migrations/` que las
   tablas/columnas que el módulo necesita ya existen; si no, agregar una migración nueva siguiendo
   la convención `{NNN}_{descripcion_snake}.js`.
3. **Construir las 4 capas, de adentro hacia afuera**, respetando las reglas de dependencia de
   `Arquitectura/ESTRUCTURA_BACKEND.md` (dominio nunca importa de infraestructura ni Express):
   - `domain/{entidad}/{entidad}.entity.js` — reglas de negocio puras (transiciones de estado,
     validaciones), sin dependencias externas.
   - `domain/{entidad}/{entidad}.repository.js` — contrato/interfaz del repositorio (métodos que
     lanzan `No implementado`); es documentación ejecutable del contrato, no lógica real.
   - `domain/{entidad}/{entidad}.usecases.js` — un caso de uso por operación (crear, editar,
     listar, etc.), recibe el repositorio por inyección de dependencia, lanza errores con
     `err.status` + `err.code` (ver convención de errores HTTP arriba).
   - `infrastructure/repositories/{entidad}.repository.js` — implementación concreta con Knex
     contra SQL Server, mismo contrato que el archivo de dominio.
   - `application/{modulo}/{modulo}.controller.js` — valida el request con Joi, llama al usecase
     inyectando el repositorio de infraestructura, formatea la respuesta (`res.json` /
     `res.status(...).json`), delega errores a `next(err)`.
   - `infrastructure/http/routes/{modulo}.routes.js` — define las rutas Express y las conecta al
     controller; sin lógica.
   - Montar el router nuevo en `back/src/infrastructure/http/routes/index.js` (descomentar o
     agregar la línea `router.use('/{modulo}', require('./{modulo}.routes'));`).
4. **Agregar las pruebas Postman del módulo** en el mismo cambio, siguiendo
   [Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md](Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md): una carpeta
   por módulo, una sub-carpeta por endpoint, cobertura mínima de éxito + cada error implementado,
   fixtures dinámicos (`{{$timestamp}}`) o patrón `Setup - datos de prueba` para que la colección
   corra repetidamente sin edición manual. Validar el JSON de la colección antes de terminar
   (comando en la sección 1 de ese estándar).
5. **No mezclar** el cambio de código con cambios de documentación de proyecto (`.md` en español)
   sin avisar explícitamente — ver convención ya existente en este archivo y en
   `MEMORIA_PROYECTO.md`.
