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
    │   │       └── jerarquia.routes.js
    │   │
    │   ├── cati/
    │   │   ├── caoClient.js             # POST /api/auth a CAO → devuelve tokenCAO
    │   │   ├── catiClient.js            # POST /Auth/exchange + llamadas CATI con Bearer + API key
    │   │   └── tokenManager.js          # Cachea accessToken, verifica expiración, refresca
    │   │
    │   └── repositories/               # Implementaciones concretas (SQL Server vía Knex)
    │       ├── planograma.repository.js
    │       ├── version.repository.js
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
    │   │   ├── version.usecases.js      # Promover estado, asignar tiendas, guardar borrador
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
        └── jerarquia/
            └── jerarquia.controller.js    # Proxy a CATI
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
