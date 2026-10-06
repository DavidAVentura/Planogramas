/**
 * importacion.entity.js
 * Reglas de negocio puras de la importación de un layout completo (góndola → secciones →
 * niveles → posiciones) en una sola operación, usada por el Agente Importador de PDF.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 *
 * Convierte cada cuerpo recibido en un "plan" listo para persistir:
 *   - secciones con ids temporales negativos (mismo convenio que seccionRepo.guardarEstructura);
 *   - niveles con su hoja, su `ancho_disponible_cm` = ancho de la hoja y `orden` renumerado de
 *     arriba hacia abajo, hoja por hoja (así la numeración de ganchos del sistema sigue el layout);
 *   - posiciones con `orden_horizontal` renumerado y `capacidad_maxima` calculada.
 */

const { MIN_TAM_CM, DIRECCIONES, construirArbol, aplanar, calcularHojas } = require('../seccion/seccion.entity');

const DESTINOS = Object.freeze(['NUEVA', 'REEMPLAZAR']);

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

function errorBadRequest(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  if (details) err.details = details;
  return err;
}

/**
 * Valida el árbol de secciones de un cuerpo y lo traduce a nodos con ids temporales negativos.
 * @returns {{ nodos: object[], hojas: Array<{id, ancho}>, idPorClave: Map<string, number> }}
 *   `hojas` vacío = góndola sin dividir.
 */
function planificarSecciones(secciones, anchoCm, altoCm, etiqueta) {
  if (!secciones.length) return { nodos: [], hojas: [], idPorClave: new Map() };

  const idPorClave = new Map();
  secciones.forEach((s, i) => {
    if (idPorClave.has(s.clave)) throw errorUnprocessable(`${etiqueta}: la sección "${s.clave}" está repetida`);
    idPorClave.set(s.clave, -(i + 1));
  });

  const nodos = secciones.map((s) => {
    if (s.padre_clave !== null && !idPorClave.has(s.padre_clave)) {
      throw errorUnprocessable(`${etiqueta}: la sección "${s.clave}" cuelga de "${s.padre_clave}", que no existe`);
    }
    if (s.es_division && !DIRECCIONES.includes(s.direccion)) {
      throw errorUnprocessable(`${etiqueta}: la división "${s.clave}" no tiene dirección válida`);
    }
    return {
      id:         idPorClave.get(s.clave),
      padreId:    s.padre_clave === null ? null : idPorClave.get(s.padre_clave),
      esDivision: s.es_division,
      direccion:  s.es_division ? s.direccion : null,
      orden:      s.orden,
      tamCm:      s.tam_cm,
    };
  });

  const raices = nodos.filter((n) => n.padreId === null);
  if (raices.length !== 1 || !raices[0].esDivision) {
    throw errorUnprocessable(`${etiqueta}: las secciones deben tener una sola raíz y debe ser una división`);
  }

  const raiz = construirArbol(nodos);
  const visitados = new Set();
  (function recorrer(nodo, w, h) {
    visitados.add(nodo.id);
    if (!nodo.esDivision) {
      if (nodo.hijos.length) throw errorUnprocessable(`${etiqueta}: una sección hoja no puede tener hijas`);
      return;
    }
    if (nodo.hijos.length < 2) throw errorUnprocessable(`${etiqueta}: cada división debe tener al menos 2 secciones`);
    const total = nodo.direccion === 'COLUMNAS' ? w : h;
    let usado = 0;
    nodo.hijos.forEach((hijo, i) => {
      hijo.orden = i + 1;
      const ultima = i === nodo.hijos.length - 1;
      const tam = ultima ? total - usado : Number(hijo.tamCm);
      if (tam < MIN_TAM_CM) throw errorUnprocessable(`${etiqueta}: una sección mide menos de ${MIN_TAM_CM} cm`, { minimoCm: MIN_TAM_CM });
      if (ultima) hijo.tamCm = tam;
      usado += tam;
      if (nodo.direccion === 'COLUMNAS') recorrer(hijo, tam, h);
      else recorrer(hijo, w, tam);
    });
  })(raiz, Number(anchoCm), Number(altoCm));

  if (visitados.size !== nodos.length) throw errorUnprocessable(`${etiqueta}: hay secciones que no cuelgan de la raíz`);

  const hojas = calcularHojas(raiz, anchoCm, altoCm).map((h) => ({ id: h.nodo.id, ancho: h.ancho }));
  // Filas planas (lo que persiste el repositorio) con el orden y el tamaño ya normalizados.
  return { nodos: aplanar(raiz), hojas, idPorClave };
}

function planificarPosiciones(posiciones) {
  return [...posiciones]
    .sort((a, b) => a.orden_horizontal - b.orden_horizontal)
    .map((p, i) => ({
      orden_horizontal:    i + 1,
      sku:                 p.sku ?? null,
      ancho_asignado_cm:   p.ancho_asignado_cm,
      facings_horizontal:  p.facings_horizontal,
      cantidad_apilable:   1,
      unidades_por_facing: 1,
      capacidad_maxima:    p.facings_horizontal,
      perfil_redondeo:     'MRP',
      modo:                p.sku ? 'PLANOGRAMA' : 'PENDIENTE',
      decision:            'ACTIVO',
      nombre_detectado:    p.nombre_detectado ?? null,
      confidence:          p.confidence ?? 100,
      datos_vision:        p.datos_vision ? JSON.stringify(p.datos_vision) : null,
      // Números impresos en el PDF: se guardan para que la numeración del lienzo sea la del PDF.
      ganchos:             p.ganchos?.length ? [...p.ganchos] : null,
      accesorios:          [],
    }));
}

/**
 * Niveles agrupados por hoja (en el orden de recorrido de las hojas) y, dentro de cada hoja, de
 * arriba hacia abajo según el `orden` recibido; luego se renumera 1..N para toda la góndola.
 */
function planificarNiveles(niveles, hojas, idPorClave, anchoGondola, etiqueta) {
  const dividida = hojas.length > 0;
  const ordenHoja = new Map(hojas.map((h, i) => [h.id, i]));
  const anchoHoja = new Map(hojas.map((h) => [h.id, h.ancho]));

  const conHoja = niveles.map((nivel) => {
    if (!dividida) {
      if (nivel.seccion_clave !== null) throw errorUnprocessable(`${etiqueta}: un nivel indica sección "${nivel.seccion_clave}" pero la góndola no está dividida`);
      return { nivel, seccionId: null };
    }
    const seccionId = idPorClave.get(nivel.seccion_clave);
    if (seccionId === undefined || !anchoHoja.has(seccionId)) {
      throw errorUnprocessable(`${etiqueta}: cada nivel debe indicar una sección hoja (recibido "${nivel.seccion_clave}")`);
    }
    return { nivel, seccionId };
  });

  conHoja.sort((a, b) =>
    (dividida ? ordenHoja.get(a.seccionId) - ordenHoja.get(b.seccionId) : 0) || a.nivel.orden - b.nivel.orden);

  return conHoja.map(({ nivel, seccionId }, i) => ({
    seccion_id:                seccionId,
    orden:                     i + 1,
    altura_desde_piso_cm:      nivel.altura_desde_piso_cm,
    ancho_disponible_cm:       dividida ? anchoHoja.get(seccionId) : Number(anchoGondola),
    tipo_accesorio:            nivel.tipo_accesorio,
    codigo_accesorio_id:       nivel.codigo_accesorio_id ?? null,
    tamano_accesorio_pulgadas: nivel.tamano_accesorio_pulgadas ?? null,
    notas:                     nivel.notas || null,
    posiciones:                planificarPosiciones(nivel.posiciones ?? []),
  }));
}

/**
 * Valida un cuerpo y lo convierte en el plan que persiste el repositorio.
 * @param {object} cuerpo - un elemento de `cuerpos` del request (ya validado con Joi)
 * @param {number} indice - posición del cuerpo en el request, para los mensajes
 */
function planificarCuerpo(cuerpo, indice) {
  const etiqueta = `Cuerpo ${indice + 1} (${cuerpo.nombre})`;
  const { nodos, hojas, idPorClave } = planificarSecciones(cuerpo.secciones ?? [], cuerpo.ancho_cm, cuerpo.alto_cm, etiqueta);
  return {
    destino:   cuerpo.destino,
    gondolaId: cuerpo.destino === 'REEMPLAZAR' ? cuerpo.gondola_id : null,
    gondola: {
      nombre:         cuerpo.nombre,
      ancho_cm:       cuerpo.ancho_cm,
      alto_cm:        cuerpo.alto_cm,
      profundidad_cm: cuerpo.profundidad_cm,
    },
    secciones: nodos,
    niveles:   planificarNiveles(cuerpo.niveles ?? [], hojas, idPorClave, cuerpo.ancho_cm, etiqueta),
  };
}

/**
 * Cruza el layout con los productos de la góndola "Por ubicar" (importados del Excel) por número
 * de gancho: un espacio del PDF cuyos ganchos pertenecen todos a un mismo producto de "Por ubicar"
 * toma ese producto con sus datos del Excel (cantidades, mín./máx., accesorio...) y queda
 * confirmado. Un producto del Excel puede repartirse en varios espacios (ej. ganchos 4, 9, 14 y 19
 * en cuatro filas): sus facings se reparten en proporción a los ganchos de cada espacio.
 *
 * Muta los planes. Devuelve qué hacer con cada producto de "Por ubicar": eliminarlo si se usaron
 * todos sus ganchos, o dejarle los que sobraron.
 * @param {object[]} planes - salida de `planificarCuerpo`
 * @param {object[]} porUbicar - posiciones de la góndola "Por ubicar" (con `ganchos` y `accesorios`)
 * @returns {{ eliminar: number[], actualizar: object[], llenados: number, advertencias: string[] }}
 */
function cruzarConPorUbicar(planes, porUbicar) {
  const porGancho = new Map();
  porUbicar.forEach((p) => (p.ganchos ?? []).forEach((g) => porGancho.set(g, p)));
  const usados = new Map(); // id de "Por ubicar" → Set de ganchos usados
  const advertencias = [];
  let llenados = 0;

  planes.forEach((plan) => plan.niveles.forEach((nivel) => nivel.posiciones.forEach((pos) => {
    if (!pos.ganchos?.length) return;
    const fuentes = new Set(pos.ganchos.map((g) => porGancho.get(g)));
    if (fuentes.has(undefined)) return;
    if (fuentes.size > 1) {
      advertencias.push(`Ganchos ${pos.ganchos.join(', ')}: corresponden a varios productos del Excel; el espacio quedó como en el PDF.`);
      return;
    }
    const fuente = [...fuentes][0];
    if (pos.sku && fuente.sku && pos.sku !== fuente.sku) {
      advertencias.push(`Gancho ${pos.ganchos.join(', ')}: el PDF indica el SKU ${pos.sku} y el Excel ${fuente.sku}; se usó el del Excel.`);
    }
    const facings = Math.max(1, Math.round((fuente.facings_horizontal * pos.ganchos.length) / fuente.ganchos.length));
    Object.assign(pos, {
      sku:                 fuente.sku,
      nombre_detectado:    fuente.sku ? null : fuente.nombre_detectado,
      confidence:          fuente.sku ? 100 : fuente.confidence,
      datos_vision:        fuente.sku ? null : pos.datos_vision,
      facings_horizontal:  facings,
      cantidad_apilable:   fuente.cantidad_apilable,
      unidades_por_facing: fuente.unidades_por_facing,
      capacidad_maxima:    facings * fuente.unidades_por_facing * fuente.cantidad_apilable,
      min_estetico:        fuente.min_estetico,
      min_final:           fuente.min_final,
      max_final:           fuente.max_final,
      perfil_redondeo:     fuente.perfil_redondeo ?? 'MRP',
      modo:                fuente.sku ? fuente.modo : 'PENDIENTE',
      decision:            fuente.decision,
      observaciones:       fuente.observaciones,
      accesorios:          fuente.accesorios.map(({ accesorio_id, tamano_pulgadas, nota_libre, orden }) => ({ accesorio_id, tamano_pulgadas, nota_libre, orden })),
    });
    if (!usados.has(fuente.id)) usados.set(fuente.id, new Set());
    pos.ganchos.forEach((g) => usados.get(fuente.id).add(g));
    llenados += 1;
  })));

  const eliminar = [];
  const actualizar = [];
  porUbicar.forEach((p) => {
    const usadosDeP = usados.get(p.id);
    if (!usadosDeP) return;
    const resto = p.ganchos.filter((g) => !usadosDeP.has(g));
    if (!resto.length) {
      eliminar.push(p.id);
      return;
    }
    const facings = Math.max(1, Math.round((p.facings_horizontal * resto.length) / p.ganchos.length));
    actualizar.push({ id: p.id, ganchos: resto, facings_horizontal: facings, capacidad_maxima: facings * p.unidades_por_facing * p.cantidad_apilable });
    advertencias.push(`${p.sku ?? p.nombre_detectado}: los ganchos ${resto.join(', ')} no están en el PDF; siguen en "Por ubicar".`);
  });

  return { eliminar, actualizar, llenados, advertencias };
}

/** Una misma góndola no puede reemplazarse dos veces en la misma importación. */
function validarDestinosUnicos(cuerpos) {
  const ids = cuerpos.filter((c) => c.destino === 'REEMPLAZAR').map((c) => c.gondola_id);
  if (new Set(ids).size !== ids.length) {
    throw errorBadRequest('Una góndola solo puede ser reemplazada por un cuerpo en la misma importación');
  }
}

/**
 * Convierte en PENDIENTE las posiciones cuyo SKU no existe (ni local ni en CATI), conservando el
 * SKU leído en `nombre_detectado`. Muta el plan y devuelve las advertencias.
 * @param {object[]} planes
 * @param {Set<string>} skusInexistentes
 */
function degradarSkusInexistentes(planes, skusInexistentes) {
  const advertencias = new Set();
  planes.forEach((plan) => plan.niveles.forEach((nivel) => nivel.posiciones.forEach((p) => {
    if (!p.sku || !skusInexistentes.has(p.sku)) return;
    advertencias.add(`${plan.gondola.nombre}: el SKU ${p.sku} no existe en el catálogo; sus posiciones quedaron pendientes.`);
    p.nombre_detectado = p.nombre_detectado || `SKU ${p.sku} (no encontrado)`;
    p.sku = null;
    p.modo = 'PENDIENTE';
    p.confidence = Math.min(p.confidence, 50);
  })));
  return [...advertencias];
}

// ─── Productos del Excel → góndola "Por ubicar" ──────────────────────────────

/** Posiciones por nivel de relleno en la góndola "Por ubicar". */
const POSICIONES_POR_NIVEL = 10;
/** Ancho de una posición cuando el producto no tiene ancho registrado (cm). */
const ANCHO_POSICION_SIN_DATO_CM = 20;
const NOMBRE_POR_UBICAR = 'Por ubicar';
const POR_UBICAR_DEFAULTS = Object.freeze({ ancho_cm: 200, alto_cm: 230, profundidad_cm: 50 });
const ALTO_MAXIMO_CM = 300;
const ALTO_MINIMO_POR_NIVEL_CM = 20;

/**
 * Filtra y ordena las filas del Excel: descarta SKUs repetidos en el mismo archivo y los que ya
 * están en la versión, y ordena por el primer gancho (las filas sin ganchos van al final, en el
 * orden del archivo). Devuelve las filas a importar y las omitidas con su motivo.
 * @param {object[]} filas
 * @param {Set<string>} skusEnVersion
 */
function filtrarProductos(filas, skusEnVersion) {
  const vistos = new Set();
  const omitidos = [];
  const aImportar = [];
  filas.forEach((fila, indice) => {
    if (vistos.has(fila.sku)) {
      omitidos.push({ sku: fila.sku, motivo: 'Repetido en el archivo' });
      return;
    }
    vistos.add(fila.sku);
    if (skusEnVersion.has(fila.sku)) {
      omitidos.push({ sku: fila.sku, motivo: 'Ya está en la versión' });
      return;
    }
    aImportar.push({ fila, indice });
  });
  const primerGancho = (f) => (f.ganchos?.length ? Math.min(...f.ganchos) : Infinity);
  aImportar.sort((a, b) => primerGancho(a.fila) - primerGancho(b.fila) || a.indice - b.indice);
  return { aImportar: aImportar.map((x) => x.fila), omitidos };
}

/**
 * Convierte una fila del Excel en la posición a insertar (sin nivel ni orden todavía).
 * @param {object} fila
 * @param {{ existe: boolean, anchoCm: number|null }} producto - resultado de validar el SKU
 * @param {{ id: number, tamano_pulgadas: number|null }|null} accesorio
 */
function posicionDesdeFila(fila, producto, accesorio) {
  const facings = fila.facings_horizontal;
  const unidades = fila.unidades_por_facing ?? 1;
  const apilable = fila.cantidad_apilable ?? 1;
  return {
    sku:                 producto.existe ? fila.sku : null,
    nombre_detectado:    producto.existe ? null : `SKU ${fila.sku}${fila.descripcion ? ` · ${fila.descripcion}` : ''}`.slice(0, 500),
    confidence:          producto.existe ? 100 : 0,
    ancho_asignado_cm:   producto.anchoCm ? producto.anchoCm * facings : ANCHO_POSICION_SIN_DATO_CM * facings,
    facings_horizontal:  facings,
    cantidad_apilable:   apilable,
    unidades_por_facing: unidades,
    capacidad_maxima:    fila.capacidad_maxima ?? facings * unidades * apilable,
    min_estetico:        fila.min_estetico ?? null,
    min_final:           fila.min_final ?? null,
    max_final:           fila.max_final ?? null,
    perfil_redondeo:     fila.perfil_redondeo ?? 'MRP',
    modo:                producto.existe ? (fila.modo ?? 'PLANOGRAMA') : 'PENDIENTE',
    decision:            fila.decision ?? 'ACTIVO',
    observaciones:       fila.observaciones || null,
    ganchos:             fila.ganchos?.length ? fila.ganchos : null,
    accesorio,
  };
}

/**
 * Medidas de la góndola "Por ubicar" y altura de cada nivel de relleno (orden 1 = arriba, bases
 * equidistantes hasta el piso), para `totalNiveles` niveles cuyo ancho ocupado máximo es
 * `anchoMaximoOcupadoCm`.
 */
function geometriaPorUbicar(totalNiveles, anchoMaximoOcupadoCm) {
  const alto = Math.min(ALTO_MAXIMO_CM, Math.max(POR_UBICAR_DEFAULTS.alto_cm, totalNiveles * ALTO_MINIMO_POR_NIVEL_CM));
  const ancho = Math.min(500, Math.max(POR_UBICAR_DEFAULTS.ancho_cm, Math.ceil(anchoMaximoOcupadoCm)));
  const paso = alto / Math.max(1, totalNiveles);
  return {
    gondola: { ancho_cm: ancho, alto_cm: alto, profundidad_cm: POR_UBICAR_DEFAULTS.profundidad_cm },
    alturas: Array.from({ length: totalNiveles }, (_, i) => Math.round((alto - (i + 1) * paso) * 100) / 100),
  };
}

module.exports = {
  POSICIONES_POR_NIVEL,
  NOMBRE_POR_UBICAR,
  filtrarProductos,
  posicionDesdeFila,
  geometriaPorUbicar,
  cruzarConPorUbicar,
  DESTINOS,
  errorUnprocessable,
  planificarCuerpo,
  validarDestinosUnicos,
  degradarSkusInexistentes,
};
