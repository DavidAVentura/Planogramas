/**
 * seccion.usecases.js
 * Casos de uso del dominio Sección. Reciben los repositorios por inyección de dependencia.
 *
 * Toda operación carga el árbol completo de la góndola, lo modifica en memoria y lo persiste de
 * una vez con `seccionRepo.guardarEstructura` (los nodos nuevos llevan ids negativos
 * temporales). Las secciones solo cambian la geometría: nunca tocan posiciones.
 */

const { validarVersionEditable } = require('../nivel/nivel.entity');
const {
  MIN_TAM_CM, errorUnprocessable, errorConflict, errorNotFound,
  construirArbol, aplanar, calcularHojas, buscarConPadre, validarDireccion, asignarHuerfanos,
} = require('./seccion.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

async function cargarContexto(seccionRepo, gondolaRepo, versionRepo, gondolaId, { editable }) {
  const gondola = await gondolaRepo.buscarPorId(gondolaId);
  if (!gondola) throw errorNotFound(`Góndola ${gondolaId} no encontrada`);
  if (editable) {
    const version = await versionRepo.buscarPorId(gondola.versionId);
    if (!version) throw errorNotFound(`Versión ${gondola.versionId} no encontrada`);
    validarVersionEditable(version.estado);
  }
  const [filas, niveles] = await Promise.all([
    seccionRepo.listarPorGondola(gondolaId),
    seccionRepo.listarNivelesDeGondola(gondolaId),
  ]);
  const raiz = construirArbol(filas);
  if (raiz) asignarHuerfanos(niveles, calcularHojas(raiz, gondola.ancho_cm, gondola.alto_cm)[0].nodo.id);
  return { gondola, filas, raiz, niveles };
}

function serializarNodo(nodo) {
  return {
    id:         nodo.id,
    esDivision: nodo.esDivision,
    direccion:  nodo.esDivision ? nodo.direccion : null,
    tamCm:      Number(nodo.tamCm),
    hijos:      nodo.hijos.map(serializarNodo),
  };
}

function nivelesDeHoja(niveles, hojaId) {
  return niveles.filter((n) => n.seccionId === hojaId).sort((a, b) => a.orden - b.orden);
}

/**
 * Compara los niveles antes/después y arma los cambios a persistir: sección reasignada y ancho
 * disponible igual al ancho de su sección (solo si la góndola queda dividida).
 */
function cambiosDeNiveles(niveles, raiz, gondola, extra = {}) {
  const actualizar = [];
  const anchoPorHoja = new Map();
  if (raiz) calcularHojas(raiz, gondola.ancho_cm, gondola.alto_cm).forEach((h) => anchoPorHoja.set(h.nodo.id, h.ancho));
  for (const n of niveles) {
    if ((extra.eliminar ?? []).includes(n.id)) continue;
    const cambio = { id: n.id };
    if (n.seccionId !== n.seccionIdOriginal) cambio.seccion_id = n.seccionId ?? null;
    const ancho = raiz ? anchoPorHoja.get(n.seccionId) : Number(gondola.ancho_cm);
    if (ancho !== undefined && Number(ancho) !== Number(n.anchoDisponibleCm)) cambio.ancho_disponible_cm = ancho;
    if (Object.keys(cambio).length > 1) actualizar.push(cambio);
  }
  return { actualizar, crear: extra.crear ?? [], eliminar: extra.eliminar ?? [] };
}

function marcarOriginales(niveles, raizOriginal) {
  // `seccionIdOriginal` refleja lo que hay en BD (null si la góndola no estaba dividida, aunque
  // en memoria se haya asignado a la primera hoja).
  niveles.forEach((n) => { n.seccionIdOriginal = raizOriginal ? n.seccionIdBd : null; });
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Estructura de secciones de una góndola, con el rectángulo (cm) de cada hoja y sus niveles.
 * @returns {Promise<{ gondolaId, anchoCm, altoCm, dividida, raiz, hojas }>}
 */
async function obtenerEstructura(seccionRepo, gondolaRepo, gondolaId) {
  const { gondola, raiz, niveles } = await cargarContexto(seccionRepo, gondolaRepo, null, gondolaId, { editable: false });
  const hojas = raiz
    ? calcularHojas(raiz, gondola.ancho_cm, gondola.alto_cm).map((h, i) => ({
      id:       h.nodo.id,
      indice:   i + 1,
      xCm:      h.x,
      yCm:      h.y,
      anchoCm:  h.ancho,
      altoCm:   h.alto,
      nivelIds: nivelesDeHoja(niveles, h.nodo.id).map((n) => n.id),
    }))
    : [];
  return {
    gondolaId,
    anchoCm:  Number(gondola.ancho_cm),
    altoCm:   Number(gondola.alto_cm),
    dividida: Boolean(raiz),
    raiz:     raiz ? serializarNodo(raiz) : null,
    hojas,
  };
}

/**
 * Divide una sección hoja en dos (COLUMNAS: la nueva queda a la derecha y copia las alturas y el
 * tipo de los niveles, vacíos; FILAS: la nueva queda abajo y se lleva la mitad inferior de los
 * niveles). Si la góndola no estaba dividida, `seccionId` debe omitirse: se divide la góndola
 * completa.
 */
async function dividir(seccionRepo, gondolaRepo, versionRepo, gondolaId, { seccionId, direccion }) {
  validarDireccion(direccion);
  const ctx = await cargarContexto(seccionRepo, gondolaRepo, versionRepo, gondolaId, { editable: true });
  const { gondola, niveles } = ctx;
  let { raiz } = ctx;
  marcarOriginales(niveles, raiz);

  let temp = -1;
  if (!raiz) {
    if (seccionId) throw errorNotFound(`Sección ${seccionId} no encontrada en la góndola ${gondolaId}`);
    raiz = { id: temp--, esDivision: false, direccion: null, orden: 1, tamCm: Number(gondola.alto_cm), hijos: [] };
    niveles.forEach((n) => { n.seccionId = raiz.id; });
  } else if (!seccionId) {
    throw errorUnprocessable('La góndola ya está dividida: indica qué sección dividir (seccionId)');
  }

  const objetivoId = seccionId ?? raiz.id;
  const encontrado = buscarConPadre(raiz, objetivoId);
  if (!encontrado) throw errorNotFound(`Sección ${seccionId} no encontrada en la góndola ${gondolaId}`);
  const { nodo: hoja, padre } = encontrado;
  if (hoja.esDivision) throw errorUnprocessable('Solo se puede dividir una sección final (hoja)');

  const rect = calcularHojas(raiz, gondola.ancho_cm, gondola.alto_cm).find((h) => h.nodo.id === hoja.id);
  const total = direccion === 'COLUMNAS' ? rect.ancho : rect.alto;
  if (total < MIN_TAM_CM * 2) {
    throw errorUnprocessable(`La sección mide ${total} cm: no alcanza para dos de al menos ${MIN_TAM_CM} cm`);
  }
  const mitad = Math.floor(total / 2);
  const queda = total - mitad;

  const nueva = { id: temp--, esDivision: false, direccion: null, orden: 0, tamCm: mitad, hijos: [] };
  const crear = [];
  const propios = nivelesDeHoja(niveles, hoja.id);
  if (direccion === 'COLUMNAS') {
    propios.forEach((n) => crear.push({
      seccion_id:                nueva.id,
      orden:                     n.orden,
      altura_desde_piso_cm:      n.alturaDesdePisoCm,
      tipo_accesorio:            n.tipoAccesorio,
      codigo_accesorio_id:       n.codigoAccesorioId,
      tamano_accesorio_pulgadas: n.tamanoAccesorioPulgadas,
      ancho_disponible_cm:       mitad,
      notas:                     null,
    }));
  } else {
    propios.slice(Math.ceil(propios.length / 2)).forEach((n) => { n.seccionId = nueva.id; });
  }

  if (padre && padre.direccion === direccion) {
    hoja.tamCm = queda;
    padre.hijos.splice(padre.hijos.indexOf(hoja) + 1, 0, nueva);
  } else {
    const division = { id: temp--, esDivision: true, direccion, orden: hoja.orden, tamCm: hoja.tamCm, hijos: [hoja, nueva] };
    hoja.tamCm = queda;
    if (padre) padre.hijos[padre.hijos.indexOf(hoja)] = division;
    else raiz = division;
  }

  // La copia de una columna se crea con el ancho de su sección; `cambiosDeNiveles` ajusta el
  // ancho de los niveles existentes y de los movidos.
  await seccionRepo.guardarEstructura(gondolaId, {
    nodos:   aplanar(raiz),
    niveles: cambiosDeNiveles(niveles, raiz, gondola, { crear }),
  });
  return obtenerEstructura(seccionRepo, gondolaRepo, gondolaId);
}

/**
 * Cambia la medida de una sección (o división) en la dirección de su padre. La diferencia la
 * absorbe la hermana siguiente (o la anterior, si es la última).
 */
async function redimensionar(seccionRepo, gondolaRepo, versionRepo, seccionId, tamCm) {
  const seccion = await seccionRepo.buscarPorId(seccionId);
  if (!seccion) throw errorNotFound(`Sección ${seccionId} no encontrada`);
  const { gondola, raiz, niveles } = await cargarContexto(seccionRepo, gondolaRepo, versionRepo, seccion.gondolaId, { editable: true });
  marcarOriginales(niveles, raiz);

  const { nodo, padre } = buscarConPadre(raiz, seccionId);
  if (!padre) throw errorUnprocessable('La sección principal mide lo que mide la góndola: cambia las medidas de la góndola');

  // Medidas reales (la última hija toma el resto): se recalculan desde el layout.
  const reales = medidasHijas(raiz, padre, gondola);
  const i = padre.hijos.indexOf(nodo);
  const j = i < padre.hijos.length - 1 ? i + 1 : i - 1;
  const vecina = padre.hijos[j];
  const delta = Number(tamCm) - reales[i];
  const tamVecina = reales[j] - delta;
  if (Number(tamCm) < MIN_TAM_CM || tamVecina < MIN_TAM_CM) {
    throw errorUnprocessable(`Fuera de rango: cada sección debe medir al menos ${MIN_TAM_CM} cm`, {
      maximoCm: reales[i] + reales[j] - MIN_TAM_CM,
    });
  }
  padre.hijos.forEach((h, k) => { h.tamCm = reales[k]; });
  nodo.tamCm = Number(tamCm);
  vecina.tamCm = tamVecina;

  await seccionRepo.guardarEstructura(seccion.gondolaId, {
    nodos:   aplanar(raiz),
    niveles: cambiosDeNiveles(niveles, raiz, gondola),
  });
  return obtenerEstructura(seccionRepo, gondolaRepo, seccion.gondolaId);
}

/** Medida real (cm) de cada hija de `padre`, según el layout actual. */
function medidasHijas(raiz, padre, gondola) {
  let medidas = null;
  (function recorrer(nodo, w, h) {
    if (medidas || !nodo.esDivision) return;
    const total = nodo.direccion === 'COLUMNAS' ? w : h;
    let usado = 0;
    const propias = nodo.hijos.map((c, i) => {
      const tam = i === nodo.hijos.length - 1 ? Math.max(0, total - usado) : Number(c.tamCm);
      usado += tam;
      return tam;
    });
    if (nodo === padre) { medidas = propias; return; }
    nodo.hijos.forEach((c, i) => {
      if (nodo.direccion === 'COLUMNAS') recorrer(c, propias[i], h);
      else recorrer(c, w, propias[i]);
    });
  })(raiz, Number(gondola.ancho_cm), Number(gondola.alto_cm));
  return medidas;
}

/**
 * Quita una sección sin productos: sus niveles (vacíos) se eliminan y su espacio pasa a la
 * hermana vecina. Si la góndola queda con una sola sección, vuelve a "sin dividir".
 */
async function quitar(seccionRepo, gondolaRepo, versionRepo, seccionId) {
  const seccion = await seccionRepo.buscarPorId(seccionId);
  if (!seccion) throw errorNotFound(`Sección ${seccionId} no encontrada`);
  const { gondola, raiz: raizInicial, niveles } = await cargarContexto(seccionRepo, gondolaRepo, versionRepo, seccion.gondolaId, { editable: true });
  marcarOriginales(niveles, raizInicial);
  let raiz = raizInicial;

  const { nodo, padre } = buscarConPadre(raiz, seccionId);
  if (!padre) throw errorUnprocessable('No se puede quitar la sección principal de la góndola');

  const idsSubarbol = new Set();
  (function recorrer(n) { idsSubarbol.add(n.id); n.hijos.forEach(recorrer); })(nodo);
  const nivelesDelSubarbol = niveles.filter((n) => idsSubarbol.has(n.seccionId));
  const totalPosiciones = nivelesDelSubarbol.reduce((s, n) => s + n.totalPosiciones, 0);
  if (totalPosiciones > 0) {
    throw errorConflict('La sección tiene productos: quítalos o muévelos antes de quitar la sección', { totalPosiciones });
  }

  const reales = medidasHijas(raiz, padre, gondola);
  const i = padre.hijos.indexOf(nodo);
  const j = i > 0 ? i - 1 : i + 1;
  padre.hijos.forEach((h, k) => { h.tamCm = reales[k]; });
  padre.hijos[j].tamCm = reales[j] + reales[i];
  padre.hijos.splice(i, 1);

  if (padre.hijos.length === 1) {
    const unica = padre.hijos[0];
    const abuelo = buscarConPadre(raiz, padre.id).padre;
    unica.tamCm = padre.tamCm;
    if (!abuelo) {
      raiz = unica;
    } else {
      const k = abuelo.hijos.indexOf(padre);
      if (unica.esDivision && unica.direccion === abuelo.direccion) abuelo.hijos.splice(k, 1, ...unica.hijos);
      else abuelo.hijos[k] = unica;
    }
  }

  const eliminar = nivelesDelSubarbol.map((n) => n.id);
  const sinDividir = !raiz.esDivision;
  if (sinDividir) niveles.forEach((n) => { n.seccionId = null; });

  await seccionRepo.guardarEstructura(seccion.gondolaId, {
    nodos:   sinDividir ? [] : aplanar(raiz),
    niveles: cambiosDeNiveles(niveles, sinDividir ? null : raiz, gondola, { eliminar }),
  });
  return obtenerEstructura(seccionRepo, gondolaRepo, seccion.gondolaId);
}

/**
 * Valida que `seccionId` sea una hoja de la góndola (para crear niveles dentro de una sección).
 */
async function validarHojaDeGondola(seccionRepo, gondolaId, seccionId) {
  const filas = await seccionRepo.listarPorGondola(gondolaId);
  const fila = filas.find((f) => f.id === seccionId);
  if (!fila) throw errorNotFound(`Sección ${seccionId} no encontrada en la góndola ${gondolaId}`);
  if (fila.esDivision) throw errorUnprocessable('Los niveles solo se agregan en una sección final (hoja)');
}

module.exports = {
  obtenerEstructura,
  dividir,
  redimensionar,
  quitar,
  validarHojaDeGondola,
};
