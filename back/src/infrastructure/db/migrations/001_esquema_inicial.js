/**
 * 001_esquema_inicial.js
 * Crea las 12 tablas del modelo MVP en orden correcto de dependencias FK.
 * Tablas de captura fotográfica (SesionCaptura, FotoCaptura, DeteccionPropuesta)
 * se crearán en una migración separada cuando inicie esa fase.
 */

// ─── UP ───────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {

  // 1. Accesorio ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('Accesorio', (t) => {
    t.increments('id');
    t.string('codigo', 50).notNullable().unique();      // ej. VDA-12R-PTH
    t.string('nombre', 200).notNullable();
    t.string('tipo', 20).notNullable();                 // GANCHO | BANDEJA | BARRA | CANASTA | OTRO
    t.decimal('longitud_cm', 8, 2).nullable();
    t.decimal('ancho_cm', 8, 2).nullable();
    t.text('notas_capacidad').nullable();
  });

  // 2. Tienda ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('Tienda', (t) => {
    t.increments('id');
    t.string('codigo', 20).notNullable().unique();      // T0PC, T007, T010...
    t.string('nombre', 200).notNullable();
    t.string('tipo', 20).notNullable();                 // GRANDE | MEDIANA | EXPRESS
  });

  // 3. Producto ──────────────────────────────────────────────────────────────
  // PK es el SKU (string). sku_sustituto es FK self; se agrega al final del up.
  await knex.schema.createTable('Producto', (t) => {
    t.string('sku', 50).primary();
    t.string('nombre', 500).notNullable();
    t.string('marca', 200).nullable();
    t.string('categoria_nivel1', 200).nullable();
    t.string('categoria_nivel2', 200).nullable();
    t.string('categoria_nivel3', 200).nullable();
    t.string('subcategoria', 200).nullable();
    t.decimal('ancho_cm', 8, 2).nullable();
    t.decimal('alto_cm', 8, 2).nullable();
    t.decimal('profundidad_cm', 8, 2).nullable();
    t.string('fuente_dimensiones', 10).nullable();      // STIBO | VTEX | MANUAL
    t.boolean('dimensiones_validadas').notNullable().defaultTo(false);
    t.string('gtin', 50).nullable();
    t.decimal('precio', 12, 2).nullable();
    t.string('imagen_url', 500).nullable();
    t.integer('unidades_por_empaque').nullable();
    t.string('estado', 20).notNullable().defaultTo('activo');
    t.string('sku_sustituto', 50).nullable();           // FK self — se agrega abajo
  });

  // FK self de Producto.sku_sustituto → Producto.sku
  await knex.schema.table('Producto', (t) => {
    t.foreign('sku_sustituto').references('sku').inTable('Producto');
  });

  // 4. Planograma ────────────────────────────────────────────────────────────
  await knex.schema.createTable('Planograma', (t) => {
    t.increments('id');
    t.string('nombre', 200).notNullable();
    t.string('departamento', 200).notNullable();
    t.string('estado', 20).notNullable().defaultTo('borrador'); // borrador | activo | archivado
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.string('created_by', 100).notNullable();
  });

  // 5. PlanogramaSubcategoria ────────────────────────────────────────────────
  await knex.schema.createTable('PlanogramaSubcategoria', (t) => {
    t.increments('id');
    t.integer('planograma_id').notNullable()
      .references('id').inTable('Planograma').onDelete('CASCADE');
    t.string('subcategoria', 500).notNullable();
  });

  // 6. PlanogramaVersion ─────────────────────────────────────────────────────
  await knex.schema.createTable('PlanogramaVersion', (t) => {
    t.increments('id');
    t.integer('planograma_id').notNullable()
      .references('id').inTable('Planograma').onDelete('CASCADE');
    t.string('tipo', 20).notNullable();                 // GRANDE | MEDIANA | EXPRESS
    t.string('codigo', 50).nullable();                  // ej. AUTOS TG-03
    t.integer('version_base_id').nullable();            // FK self — se agrega abajo
    t.string('estado', 20).notNullable().defaultTo('borrador');
    // borrador | en_desarrollo | piloto | publicado | archivado
    t.text('notas').nullable();
  });

  // FK self de PlanogramaVersion.version_base_id → PlanogramaVersion.id
  await knex.schema.table('PlanogramaVersion', (t) => {
    t.foreign('version_base_id').references('id').inTable('PlanogramaVersion');
  });

  // Índice único filtrado: solo una versión 'publicado' por planograma+tipo
  await knex.raw(`
    CREATE UNIQUE INDEX UQ_Version_publicada
    ON PlanogramaVersion (planograma_id, tipo)
    WHERE estado = 'publicado'
  `);

  // 7. VersionTienda ─────────────────────────────────────────────────────────
  await knex.schema.createTable('VersionTienda', (t) => {
    t.integer('planograma_version_id').notNullable()
      .references('id').inTable('PlanogramaVersion').onDelete('CASCADE');
    t.integer('tienda_id').notNullable()
      .references('id').inTable('Tienda').onDelete('CASCADE');
    t.primary(['planograma_version_id', 'tienda_id']);
  });

  // 8. Gondola ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('Gondola', (t) => {
    t.increments('id');
    t.integer('planograma_version_id').notNullable()
      .references('id').inTable('PlanogramaVersion').onDelete('CASCADE');
    t.string('nombre', 200).notNullable();
    t.decimal('ancho_cm', 8, 2).notNullable();
    t.decimal('alto_cm', 8, 2).notNullable();
    t.decimal('profundidad_cm', 8, 2).notNullable();
    t.string('posicion_en_tienda', 200).nullable();
    t.integer('orden').notNullable().defaultTo(1);
  });

  // 9. Nivel ─────────────────────────────────────────────────────────────────
  await knex.schema.createTable('Nivel', (t) => {
    t.increments('id');
    t.integer('gondola_id').notNullable()
      .references('id').inTable('Gondola').onDelete('CASCADE');
    t.integer('orden').notNullable();                   // 1 = nivel más bajo
    t.decimal('altura_desde_piso_cm', 8, 2).notNullable();
    t.decimal('ancho_disponible_cm', 8, 2).notNullable();
    t.string('tipo_accesorio', 20).nullable();          // GANCHO | BANDEJA | BARRA | CANASTA | OTRO
    t.integer('codigo_accesorio_id').nullable()
      .references('id').inTable('Accesorio');
    t.decimal('tamano_accesorio_pulgadas', 6, 2).nullable();
    t.text('notas').nullable();
  });

  // 10. Posicion ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('Posicion', (t) => {
    t.increments('id');
    t.integer('nivel_id').notNullable()
      .references('id').inTable('Nivel').onDelete('CASCADE');
    t.integer('orden_horizontal').notNullable();
    t.string('sku', 50).notNullable()
      .references('sku').inTable('Producto');
    t.decimal('ancho_asignado_cm', 8, 2).notNullable();
    t.integer('facings_horizontal').notNullable().defaultTo(1);
    t.integer('cantidad_apilable').notNullable().defaultTo(1);
    t.integer('unidades_por_facing').notNullable().defaultTo(1);
    t.integer('capacidad_maxima').nullable();           // calculado: facings_h × apilable × unid_x_facing
    t.integer('min_estetico').nullable();               // calculado por regla de negocio
    t.integer('min_final').nullable();                  // ajustable manualmente
    t.integer('max_final').nullable();                  // ajustable manualmente
    t.string('perfil_redondeo', 10).nullable();         // MRP | ZSRE
    t.string('modo', 20).notNullable().defaultTo('PLANOGRAMA'); // PLANOGRAMA | CROSS
    t.boolean('cross_externo').notNullable().defaultTo(false);
    t.boolean('montar_en_display').notNullable().defaultTo(false);
    t.boolean('desborda_gondola').notNullable().defaultTo(false);
    t.string('nota_desborde', 500).nullable();
    t.string('decision', 10).notNullable().defaultTo('ACTIVO'); // ACTIVO | INACTIVO
    t.text('observaciones').nullable();
  });

  // 11. PosicionAccesorio ────────────────────────────────────────────────────
  await knex.schema.createTable('PosicionAccesorio', (t) => {
    t.increments('id');
    t.integer('posicion_id').notNullable()
      .references('id').inTable('Posicion').onDelete('CASCADE');
    t.integer('orden').notNullable().defaultTo(1);
    t.integer('accesorio_id').notNullable()
      .references('id').inTable('Accesorio');
    t.string('nota_libre', 500).nullable();             // ej. 'a la derecha', 'colocar frontal'
  });

  // 12. HistorialSustitucion ─────────────────────────────────────────────────
  await knex.schema.createTable('HistorialSustitucion', (t) => {
    t.increments('id');
    t.integer('planograma_version_id').notNullable()
      .references('id').inTable('PlanogramaVersion').onDelete('CASCADE');
    t.string('sku_original', 50).notNullable();
    t.string('sku_sustituto', 50).notNullable();
    t.text('motivo').notNullable();
    t.datetime('fecha').notNullable().defaultTo(knex.fn.now());
    t.string('usuario_id', 100).notNullable();
    t.specificType('posiciones_afectadas', 'nvarchar(max)').nullable(); // JSON: [posicion_id, ...]
  });
};

// ─── DOWN ─────────────────────────────────────────────────────────────────────

exports.down = async function (knex) {
  // Eliminar en orden inverso para respetar FKs
  await knex.schema.dropTableIfExists('HistorialSustitucion');
  await knex.schema.dropTableIfExists('PosicionAccesorio');
  await knex.schema.dropTableIfExists('Posicion');
  await knex.schema.dropTableIfExists('Nivel');
  await knex.schema.dropTableIfExists('Gondola');
  await knex.schema.dropTableIfExists('VersionTienda');

  // Eliminar el índice filtrado antes de eliminar la tabla
  await knex.raw('DROP INDEX IF EXISTS UQ_Version_publicada ON PlanogramaVersion');
  await knex.schema.dropTableIfExists('PlanogramaVersion');
  await knex.schema.dropTableIfExists('PlanogramaSubcategoria');
  await knex.schema.dropTableIfExists('Planograma');
  await knex.schema.dropTableIfExists('Producto');
  await knex.schema.dropTableIfExists('Tienda');
  await knex.schema.dropTableIfExists('Accesorio');
};
