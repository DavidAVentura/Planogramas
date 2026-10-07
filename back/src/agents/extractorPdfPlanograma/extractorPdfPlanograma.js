/**
 * extractorPdfPlanograma.js
 * Agente Importador de PDF de planograma: recibe la ficha de montaje en PDF de un mueble (ej.
 * "HERRAMIENTAS TG-27 · cuerpo 1/1") y la convierte en el layout del lienzo, en dos capas:
 *
 *   1. Layout (lo principal): por cada cuerpo del PDF, medidas de la góndola, árbol de secciones
 *      (columnas/franjas), niveles (altura, tipo y código de accesorio) y espacios (ancho,
 *      números de gancho impresos y el SKU impreso si lo hay). Lo lee el modelo de OpenAI.
 *   2. Productos: cada espacio se intenta identificar contra CATI — primero por el SKU impreso y,
 *      si no hay o no existe, buscando por la descripción visual (solo candidatos, nunca se
 *      asigna un producto que no se pudo confirmar).
 *
 * Sin persistencia: devuelve la propuesta para que el usuario la revise; la importación real la
 * hace POST /versiones/:id/importar-layout (módulo importacion).
 *
 * Convenciones del lienzo que el resultado respeta (ver front/src/domain/lienzo/secciones.service.ts
 * y back/src/domain/skuVersion/skuVersion.entity.js):
 *   - Nivel `orden` 1 = el de ARRIBA; las alturas desde el piso bajan a medida que sube el orden.
 *   - `altura_desde_piso_cm` = base del nivel (donde se apoya o cuelga el producto).
 *   - Cada posición importada guarda los números de gancho impresos (`Posicion.ganchos`, migración
 *     013), que mandan sobre la numeración calculada. La numeración del PDF es correlativa entre
 *     todos los cuerpos, así que se conserva tal cual. Solo los espacios sin números legibles
 *     reciben uno calculado (el siguiente libre en el recorrido de la versión). `facings` =
 *     cantidad de números impresos del espacio.
 */

const { calcularHojas } = require('../../domain/seccion/seccion.entity');
const { TIPOS_ACCESORIO } = require('../../domain/nivel/nivel.entity');
const { GONDOLA_DEFAULTS } = require('../../domain/gondola/gondola.entity');

const MIN_TAM_SECCION_CM = 10;
const CONCURRENCIA_CATI = 6;
const MAX_CANDIDATOS = 5;
const TOLERANCIA_ANCHO = 1.05;

const LIMITES = Object.freeze({ ancho: 500, alto: 300, profundidad: 200 });

// ─── Esquema de salida del modelo ────────────────────────────────────────────

const SCHEMA_ESPACIO = {
  type: 'object',
  properties: {
    orden_horizontal: { type: 'integer' },
    ganchos: { type: 'array', items: { type: 'integer' } },
    ancho_cm: { type: 'number' },
    sku_impreso: { type: ['string', 'null'] },
    descripcion_visual: { type: ['string', 'null'] },
    confianza: { type: 'integer' },
  },
  required: ['orden_horizontal', 'ganchos', 'ancho_cm', 'sku_impreso', 'descripcion_visual', 'confianza'],
  additionalProperties: false,
};

const SCHEMA_NIVEL = {
  type: 'object',
  properties: {
    seccion_clave: { type: ['string', 'null'] },
    altura_desde_piso_cm: { type: 'number' },
    tipo_accesorio: { type: 'string', enum: [...TIPOS_ACCESORIO] },
    codigo_accesorio: { type: ['string', 'null'] },
    tamano_accesorio_pulgadas: { type: ['number', 'null'] },
    espacios: { type: 'array', items: SCHEMA_ESPACIO },
  },
  required: ['seccion_clave', 'altura_desde_piso_cm', 'tipo_accesorio', 'codigo_accesorio', 'tamano_accesorio_pulgadas', 'espacios'],
  additionalProperties: false,
};

const SCHEMA_SECCION = {
  type: 'object',
  properties: {
    clave: { type: 'string' },
    padre_clave: { type: ['string', 'null'] },
    es_division: { type: 'boolean' },
    direccion: { type: ['string', 'null'], enum: ['COLUMNAS', 'FILAS', null] },
    orden: { type: 'integer' },
    tam_cm: { type: 'number' },
  },
  required: ['clave', 'padre_clave', 'es_division', 'direccion', 'orden', 'tam_cm'],
  additionalProperties: false,
};

const SCHEMA_ACCESORIO_MONTAJE = {
  type: 'object',
  properties: {
    codigo: { type: 'string' },
    tipo: { type: 'string', enum: [...TIPOS_ACCESORIO] },
    medida_pulgadas: { type: ['number', 'null'] },
    cantidad: { type: ['integer', 'null'] },
    especificaciones: { type: ['string', 'null'] },
  },
  required: ['codigo', 'tipo', 'medida_pulgadas', 'cantidad', 'especificaciones'],
  additionalProperties: false,
};

const SCHEMA_RESPUESTA = {
  name: 'respuesta_extractor_pdf_planograma',
  schema: {
    type: 'object',
    properties: {
      cuerpos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            codigo_mueble: { type: ['string', 'null'] },
            categoria: { type: ['string', 'null'] },
            pagina: { type: 'integer' },
            ancho_cm: { type: 'number' },
            alto_cm: { type: 'number' },
            profundidad_cm: { type: ['number', 'null'] },
            secciones: { type: 'array', items: SCHEMA_SECCION },
            niveles: { type: 'array', items: SCHEMA_NIVEL },
            accesorios_montaje: { type: 'array', items: SCHEMA_ACCESORIO_MONTAJE },
            notas: { type: ['string', 'null'] },
          },
          required: ['nombre', 'codigo_mueble', 'categoria', 'pagina', 'ancho_cm', 'alto_cm', 'profundidad_cm', 'secciones', 'niveles', 'accesorios_montaje', 'notas'],
          additionalProperties: false,
        },
      },
      advertencias: { type: 'array', items: { type: 'string' } },
    },
    required: ['cuerpos', 'advertencias'],
    additionalProperties: false,
  },
};

const PROMPT_SISTEMA = `Eres el "Agente Importador de PDF de Planograma" de Cemaco. Recibes la ficha de montaje
de un mueble en PDF (una página por cuerpo: foto o dibujo frontal del mueble con regla de altura,
números de gancho/espacio y SKUs impresos, más un panel lateral de "Montaje" con categorías,
accesorios, medidas y especificaciones). Tu tarea es reconstruir el LAYOUT físico con la mayor
fidelidad posible. El layout es lo principal; los productos son secundarios.

## Qué es cada cosa

- CUERPO: cada mueble/módulo físico ("cuerpo no. 1/1", "cuerpo 2/3"...). Normalmente uno por
  página. Si una página tiene varios cuerpos lado a lado claramente separados, repórtalos aparte.
  - nombre: título del encabezado + cuerpo (ej. "HERRAMIENTAS TG-27 · cuerpo 1/1").
  - codigo_mueble: el código del mueble si aparece (ej. "TG-27"); categoria: la del panel.
  - pagina: número de página (1 = primera).
- MEDIDAS DEL CUERPO en cm:
  - Usa la regla de altura impresa (normalmente en pies: 1', 2', ... 7'; 1 pie = 30.48 cm; las
    marcas pequeñas son pulgadas, 1" = 2.54 cm) para medir alto y alturas.
  - Ancho: dedúcelo de los accesorios. Un código tipo "SUS 4*22" o "SBS 4*22" es una bandeja de
    4 pies de ancho (121.92 cm) por 22 pulgadas de fondo: el ancho del cuerpo es el ancho de sus
    bandejas y la profundidad su fondo. Si no hay pistas, usa la proporción de la imagen contra
    la regla de altura.
  - alto_cm: altura total del cuerpo según la regla (ej. tablero perforado hasta ~7.5' = 229 cm).
- NIVEL: cada línea física que sostiene producto: una bandeja/repisa/canasta, o una FILA de
  ganchos a la misma altura. La bandeja de piso también es un nivel.
  - altura_desde_piso_cm: la BASE del nivel (fondo de la bandeja, o punto donde cuelga el gancho)
    medida con la regla. Debe ser coherente: los niveles de más arriba tienen mayor altura.
  - tipo_accesorio: GANCHO (fila de ganchos), BANDEJA (bandeja/canasta de alambre, repisa con
    divisiones), BARRA, BOTADERO, CANASTA, PARRILLA_DIVISOR u OTRO.
  - codigo_accesorio: el código del panel de Montaje que corresponde al nivel, según sus
    especificaciones (ej. "Ganchos para colocar producto del 1 al 9" → los niveles con ganchos
    1-9 usan "R45-12-212P2"; "Bandeja de piso para el gancho 37" → la bandeja de piso usa "SBS 4*22").
    null si no hay código.
  - tamano_accesorio_pulgadas: la "Medida" del accesorio en pulgadas (ej. 12 para un gancho de
    12", 22 para una bandeja de 22"). null si no se conoce.
- ESPACIO: cada lugar de producto dentro de un nivel, de izquierda a derecha.
  - En bandejas, cada división/compartimento con su número es un espacio. En filas de ganchos,
    cada gancho numerado es un espacio.
  - ganchos: los números impresos que identifican ese espacio (normalmente uno; varios solo si
    el mismo producto ocupa varios números contiguos). Respeta exactamente los números del PDF,
    aunque parezcan tener un error (ej. un número repetido); repórtalo en advertencias.
  - ancho_cm: el ancho real que ocupa el espacio, proporcional a lo que ves contra el ancho del
    cuerpo. Los anchos de un nivel deben sumar como máximo el ancho de su sección.
  - sku_impreso: el código de producto impreso en la etiqueta del espacio (ej. "700160",
    "1171592"), tal cual, solo dígitos/letras. null si no hay ninguno legible. No lo inventes.
  - descripcion_visual: descripción corta de lo que se ve (tipo de producto, marca, color; ej.
    "cinta métrica Truper amarilla 8 m"), para poder buscarlo en el catálogo si falta el SKU.
  - confianza: 0-100, qué tan seguro estás del SKU leído (o de la descripción si no hay SKU).
- SECCIONES: solo si el cuerpo está dividido físicamente en zonas con niveles independientes
  (ej. columnas izquierda/derecha con bandejas a distintas alturas, o una franja superior de
  ganchos separada de una franja inferior con otra distribución de ancho). Si todos los niveles
  ocupan el ancho completo del cuerpo, deja "secciones" VACÍO y seccion_clave = null en cada nivel.
  Cuando hay secciones, son un árbol:
  - Un único nodo raíz (padre_clave = null), que es una división (es_division = true).
  - Una división reparte su espacio entre sus hijas: direccion "COLUMNAS" (izquierda → derecha,
    tam_cm = ancho) o "FILAS" (arriba → abajo, tam_cm = alto). Toda división tiene 2+ hijas.
  - Las hojas (es_division = false, direccion = null) son las secciones con niveles; cada nivel
    indica su hoja en seccion_clave.
  - orden: posición entre hermanas, empezando en 1. La última hija toma lo que sobre.
  - clave: texto corto único (ej. "raiz", "s1", "s2").
- accesorios_montaje: copia del panel "Accesorios" (código, tipo, medida en pulgadas, cantidad,
  especificaciones). Omite las filas vacías tipo "(Tipo de accesorio)" con medida/cantidad 0.
- notas: rotulación, cenefa, cross merchandising u otras especificaciones relevantes del panel.

## Reglas

- No inventes datos. Si algo no se puede leer, deja null y explícalo en advertencias.
- Reporta en advertencias cualquier inconsistencia del PDF (números repetidos o saltados, panel
  que no coincide con la imagen, etc.).
- Las advertencias van en español, cortas y concretas (ej. "Cuerpo 1: el número 36 aparece en dos
  niveles; el panel dice que la bandeja de piso es el 37").`;

// ─── Helpers numéricos ───────────────────────────────────────────────────────

function redondear(valor, decimales = 1) {
  const factor = 10 ** decimales;
  return Math.round(Number(valor) * factor) / factor;
}

function acotar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function numeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

/** Normaliza un código de accesorio o SKU para compararlo (mayúsculas, solo letras y dígitos;
 * "4*22" y "4X22" se consideran iguales). */
function normalizarCodigo(texto) {
  return String(texto ?? '').toUpperCase().replace(/\*/g, 'X').replace(/[^A-Z0-9]/g, '');
}

// ─── Capa 1: normalización del layout ────────────────────────────────────────

function normalizarMedidas(cuerpo, advertir) {
  const ancho = numeroValido(cuerpo.ancho_cm) ? cuerpo.ancho_cm : GONDOLA_DEFAULTS.ancho_cm;
  const alto = numeroValido(cuerpo.alto_cm) ? cuerpo.alto_cm : GONDOLA_DEFAULTS.alto_cm;
  const profundidad = numeroValido(cuerpo.profundidad_cm) ? cuerpo.profundidad_cm : GONDOLA_DEFAULTS.profundidad_cm;
  if (!numeroValido(cuerpo.ancho_cm) || !numeroValido(cuerpo.alto_cm)) {
    advertir('No se pudieron leer las medidas del cuerpo; se usaron las medidas por defecto. Revisalas.');
  }
  return {
    ancho_cm: redondear(acotar(ancho, MIN_TAM_SECCION_CM, LIMITES.ancho)),
    alto_cm: redondear(acotar(alto, MIN_TAM_SECCION_CM, LIMITES.alto)),
    profundidad_cm: redondear(acotar(profundidad, 1, LIMITES.profundidad)),
  };
}

/**
 * Valida el árbol de secciones devuelto por el modelo y lo convierte al formato de nodos que usa
 * `calcularHojas` (id = clave). Devuelve null si la góndola no está dividida o si el árbol es
 * inválido (en ese caso se advierte y el cuerpo se importa sin dividir).
 */
function construirArbolSecciones(secciones, advertir) {
  if (!secciones.length) return null;

  const porClave = new Map();
  for (const s of secciones) {
    if (porClave.has(s.clave)) {
      advertir(`La sección "${s.clave}" está repetida; el cuerpo se importa sin dividir.`);
      return null;
    }
    porClave.set(s.clave, { id: s.clave, esDivision: s.es_division, direccion: s.direccion, orden: s.orden, tamCm: s.tam_cm, padreClave: s.padre_clave, hijos: [] });
  }

  const raices = [...porClave.values()].filter((n) => n.padreClave === null);
  const invalido = (motivo) => {
    advertir(`Las secciones leídas no forman un árbol válido (${motivo}); el cuerpo se importa sin dividir.`);
    return null;
  };
  if (raices.length !== 1) return invalido('debe haber una sola raíz');

  for (const nodo of porClave.values()) {
    if (nodo.padreClave === null) continue;
    const padre = porClave.get(nodo.padreClave);
    if (!padre || !padre.esDivision) return invalido(`"${nodo.id}" cuelga de un nodo que no es división`);
    padre.hijos.push(nodo);
  }

  const visitados = new Set();
  const ok = (function recorrer(nodo) {
    if (visitados.has(nodo.id)) return false;
    visitados.add(nodo.id);
    nodo.hijos.sort((a, b) => a.orden - b.orden);
    nodo.hijos.forEach((h, i) => { h.orden = i + 1; });
    if (nodo.esDivision && (nodo.hijos.length < 2 || !['COLUMNAS', 'FILAS'].includes(nodo.direccion))) return false;
    if (!nodo.esDivision) { nodo.direccion = null; nodo.hijos = []; }
    return nodo.hijos.every(recorrer);
  })(raices[0]);
  if (!ok || visitados.size !== porClave.size) return invalido('divisiones sin dirección, con menos de 2 hijas o nodos sueltos');

  const raiz = raices[0];
  if (!raiz.esDivision) return null; // una sola hoja = góndola sin dividir
  return raiz;
}

/** Ajusta los tam_cm para que ninguna sección quede por debajo del mínimo ni desborde a su padre. */
function ajustarTamanos(raiz, anchoCm, altoCm) {
  (function recorrer(nodo, w, h) {
    if (!nodo.esDivision) return;
    const total = nodo.direccion === 'COLUMNAS' ? w : h;
    const n = nodo.hijos.length;
    let restante = total;
    nodo.hijos.forEach((hijo, i) => {
      const quedan = n - i - 1;
      const maximo = restante - quedan * MIN_TAM_SECCION_CM;
      const tam = i === n - 1 ? restante : acotar(numeroValido(hijo.tamCm) ? hijo.tamCm : total / n, MIN_TAM_SECCION_CM, maximo);
      hijo.tamCm = redondear(tam);
      restante -= tam;
      if (nodo.direccion === 'COLUMNAS') recorrer(hijo, tam, h);
      else recorrer(hijo, w, tam);
    });
  })(raiz, anchoCm, altoCm);
}

function aplanarSecciones(raiz) {
  const filas = [];
  (function recorrer(nodo, padreClave) {
    filas.push({ clave: nodo.id, padre_clave: padreClave, es_division: nodo.esDivision, direccion: nodo.direccion, orden: nodo.orden, tam_cm: nodo.tamCm });
    nodo.hijos.forEach((h) => recorrer(h, nodo.id));
  })(raiz, null);
  return filas;
}

/**
 * Hojas del cuerpo con su franja vertical en cm desde el piso. Góndola sin dividir → una hoja
 * virtual (clave null) del tamaño completo.
 */
function hojasDelCuerpo(raiz, medidas) {
  if (!raiz) return [{ clave: null, indice: 1, ancho: medidas.ancho_cm, piso: 0, techo: medidas.alto_cm }];
  return calcularHojas(raiz, medidas.ancho_cm, medidas.alto_cm).map((h, i) => ({
    clave: h.nodo.id,
    indice: i + 1,
    ancho: redondear(h.ancho),
    piso: redondear(medidas.alto_cm - (h.y + h.alto)),
    techo: redondear(medidas.alto_cm - h.y),
  }));
}

function normalizarEspacios(espacios, anchoDisponible, etiquetaNivel, advertir) {
  const ordenados = [...espacios].sort((a, b) =>
    a.orden_horizontal - b.orden_horizontal || (Math.min(...a.ganchos, Infinity) - Math.min(...b.ganchos, Infinity)));

  let anchos = ordenados.map((e) => (numeroValido(e.ancho_cm) ? e.ancho_cm : anchoDisponible / Math.max(1, ordenados.length)));
  const suma = anchos.reduce((t, a) => t + a, 0);
  if (suma > anchoDisponible * TOLERANCIA_ANCHO) {
    advertir(`${etiquetaNivel}: los espacios sumaban ${redondear(suma)} cm en ${anchoDisponible} cm disponibles; se reescalaron proporcionalmente.`);
    anchos = anchos.map((a) => (a * anchoDisponible) / suma);
  }

  return ordenados.map((e, i) => {
    const ganchos = [...new Set(e.ganchos.filter((g) => Number.isInteger(g) && g > 0))];
    return {
    orden_horizontal: i + 1,
    ganchos,
    facings: Math.max(1, ganchos.length),
    ancho_cm: redondear(Math.max(1, anchos[i])),
    sku_impreso: e.sku_impreso && normalizarCodigo(e.sku_impreso) ? String(e.sku_impreso).trim().replace(/\s+/g, '') : null,
    descripcion_visual: e.descripcion_visual?.trim() || null,
    confianza: acotar(Math.round(e.confianza ?? 0), 0, 100),
    };
  });
}

function buscarAccesorio(codigo, accesorios) {
  const buscado = normalizarCodigo(codigo);
  if (!buscado) return null;
  return accesorios.find((a) => normalizarCodigo(a.codigo) === buscado)
    ?? accesorios.find((a) => {
      const propio = normalizarCodigo(a.codigo);
      return propio && (propio.startsWith(buscado) || buscado.startsWith(propio));
    })
    ?? null;
}

/**
 * Asigna cada nivel a su hoja, acota las alturas a la franja de la hoja, numera `orden` de arriba
 * hacia abajo (hoja por hoja, en el orden de recorrido del sistema) y resuelve el accesorio.
 */
function normalizarNiveles(niveles, hojas, accesorios, advertir) {
  const clavesHoja = new Set(hojas.map((h) => h.clave));
  const accesoriosSinCatalogo = new Set();
  const porHoja = new Map(hojas.map((h) => [h.clave, []]));

  niveles.forEach((nivel) => {
    let clave = hojas.length === 1 ? hojas[0].clave : nivel.seccion_clave;
    if (!clavesHoja.has(clave)) {
      advertir(`Un nivel a ${nivel.altura_desde_piso_cm} cm apuntaba a una sección inexistente o que no es hoja; se asignó a la sección 1.`);
      clave = hojas[0].clave;
    }
    porHoja.get(clave).push(nivel);
  });

  let orden = 0;
  return hojas.flatMap((hoja) => {
    const propios = porHoja.get(hoja.clave).sort((a, b) => b.altura_desde_piso_cm - a.altura_desde_piso_cm);
    return propios.map((nivel) => {
      orden += 1;
      const altura = redondear(acotar(Number(nivel.altura_desde_piso_cm) || 0, hoja.piso, Math.max(hoja.piso, hoja.techo - 1)));
      const accesorio = buscarAccesorio(nivel.codigo_accesorio, accesorios);
      const etiqueta = `Nivel ${orden}${hoja.clave ? ` (sección ${hoja.indice})` : ''}`;
      if (nivel.codigo_accesorio && !accesorio && !accesoriosSinCatalogo.has(nivel.codigo_accesorio)) {
        accesoriosSinCatalogo.add(nivel.codigo_accesorio);
        advertir(`El accesorio "${nivel.codigo_accesorio}" no existe en el catálogo de accesorios; sus niveles se importan solo con el tipo.`);
      }
      return {
        clave: `n${orden}`,
        seccion_clave: hoja.clave,
        orden,
        altura_desde_piso_cm: altura,
        ancho_disponible_cm: hoja.ancho,
        tipo_accesorio: nivel.tipo_accesorio,
        codigo_accesorio: nivel.codigo_accesorio ?? null,
        codigo_accesorio_id: accesorio?.id ?? null,
        tamano_accesorio_pulgadas: numeroValido(nivel.tamano_accesorio_pulgadas) ? nivel.tamano_accesorio_pulgadas : null,
        espacios: normalizarEspacios(nivel.espacios ?? [], hoja.ancho, etiqueta, advertir),
      };
    });
  });
}

/**
 * Avisa de los espacios sin números de gancho legibles: al importarse reciben uno calculado, que
 * puede no coincidir con el de la ficha.
 */
function advertirEspaciosSinGancho(niveles, advertir) {
  const sinGancho = niveles.reduce((t, n) => t + n.espacios.filter((e) => !e.ganchos.length).length, 0);
  if (sinGancho > 0) {
    advertir(`${sinGancho} espacio(s) sin número de gancho legible: el sistema les asignará el siguiente número libre. Revisalos.`);
  }
}

/** Los números de gancho siguen una sola secuencia en todo el PDF: un número repetido entre
 * cuerpos (o dentro de uno) indica una mala lectura. */
function advertirGanchosRepetidos(cuerpos, advertencias) {
  const vistos = new Map(); // número → nombre del primer cuerpo que lo usa
  const repetidos = new Set();
  cuerpos.forEach((c) => c.niveles.forEach((n) => n.espacios.forEach((e) => e.ganchos.forEach((g) => {
    if (vistos.has(g)) repetidos.add(g);
    else vistos.set(g, c.nombre);
  }))));
  if (repetidos.size) {
    const lista = [...repetidos].sort((a, b) => a - b);
    advertencias.push(`Números de gancho repetidos en el PDF: ${lista.slice(0, 20).join(', ')}${lista.length > 20 ? '…' : ''}. Revisá esos espacios antes de importar.`);
  }
}

function normalizarCuerpo(cuerpo, indice, accesorios) {
  const advertencias = [];
  const advertir = (texto) => advertencias.push(texto);

  const medidas = normalizarMedidas(cuerpo, advertir);
  const raiz = construirArbolSecciones(cuerpo.secciones ?? [], advertir);
  if (raiz) ajustarTamanos(raiz, medidas.ancho_cm, medidas.alto_cm);
  const hojas = hojasDelCuerpo(raiz, medidas);
  const niveles = normalizarNiveles(cuerpo.niveles ?? [], hojas, accesorios, advertir);
  advertirEspaciosSinGancho(niveles, advertir);

  return {
    clave: `c${indice + 1}`,
    nombre: (cuerpo.nombre || `Cuerpo ${indice + 1}`).trim().slice(0, 100),
    codigo_mueble: cuerpo.codigo_mueble ?? null,
    categoria: cuerpo.categoria ?? null,
    pagina: cuerpo.pagina,
    ...medidas,
    secciones: raiz ? aplanarSecciones(raiz) : [],
    niveles,
    accesorios_montaje: (cuerpo.accesorios_montaje ?? []).map((a) => ({
      ...a,
      accesorio_id: buscarAccesorio(a.codigo, accesorios)?.id ?? null,
    })),
    notas: cuerpo.notas ?? null,
    advertencias,
  };
}

// ─── Capa 2: identificación de productos ─────────────────────────────────────

function resumenProducto(p) {
  return { sku: p.sku, nombre: p.nombre, marca: p.marca ?? null, ancho_cm: p.ancho_cm ?? null, imagen_url: p.imagen_url ?? null };
}

/** Corre `tareas` (funciones async) con a lo sumo `limite` en paralelo. */
async function enParalelo(tareas, limite) {
  const resultados = new Array(tareas.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, tareas.length) }, trabajador));
  return resultados;
}

/**
 * Identifica cada espacio contra CATI. Estados:
 *   IDENTIFICADO  — el SKU impreso existe en CATI (`producto`).
 *   CANDIDATOS    — no hay SKU válido, pero la descripción devolvió candidatos para elegir.
 *   NO_ENCONTRADO — no hay SKU válido ni candidatos.
 * Un error de CATI nunca rompe la extracción: el espacio queda NO_ENCONTRADO con advertencia.
 */
async function identificarProductos(cuerpos, catiClient, advertenciasGenerales) {
  const espacios = cuerpos.flatMap((c) => c.niveles.flatMap((n) => n.espacios));
  const porSku = new Map();
  const porDescripcion = new Map();
  let fallasCati = 0;

  const skus = [...new Set(espacios.map((e) => e.sku_impreso).filter(Boolean))];
  await enParalelo(skus.map((sku) => async () => {
    const producto = await catiClient.obtenerProducto(sku).catch(() => { fallasCati += 1; return null; });
    porSku.set(sku, producto ? resumenProducto(producto) : null);
  }), CONCURRENCIA_CATI);

  const descripciones = [...new Set(espacios
    .filter((e) => !(e.sku_impreso && porSku.get(e.sku_impreso)) && e.descripcion_visual)
    .map((e) => e.descripcion_visual))];
  await enParalelo(descripciones.map((descripcion) => async () => {
    const candidatos = await catiClient.buscarProductos({ q: descripcion, page: 1, pageSize: MAX_CANDIDATOS })
      .catch(() => { fallasCati += 1; return []; });
    porDescripcion.set(descripcion, (candidatos ?? []).slice(0, MAX_CANDIDATOS).map(resumenProducto));
  }), CONCURRENCIA_CATI);

  espacios.forEach((e) => {
    const producto = e.sku_impreso ? porSku.get(e.sku_impreso) : null;
    const candidatos = producto ? [] : (porDescripcion.get(e.descripcion_visual) ?? []);
    e.producto = producto ?? null;
    e.candidatos = candidatos;
    e.estado_producto = producto ? 'IDENTIFICADO' : (candidatos.length ? 'CANDIDATOS' : 'NO_ENCONTRADO');
  });

  if (fallasCati > 0) {
    advertenciasGenerales.push(`No se pudo consultar CATI para ${fallasCati} producto(s); quedan sin identificar y se pueden asignar luego desde el lienzo.`);
  }
}

// ─── Punto de entrada ────────────────────────────────────────────────────────

/**
 * @param {object} entrada
 * @param {string} entrada.pdfBase64 - PDF en base64 puro (sin el prefijo data:...;base64,)
 * @param {string} entrada.nombreArchivo
 * @param {{ openaiClient: object, catiClient: object, accesorios: Array<{id, codigo}>, modelo: string, razonamiento?: string }} dependencias
 */
async function procesarPdf({ pdfBase64, nombreArchivo }, { openaiClient, catiClient, accesorios, modelo, razonamiento }) {
  const resultado = await openaiClient.completarConArchivo({
    instrucciones: PROMPT_SISTEMA,
    texto: 'Reconstruye el layout de cada cuerpo de este PDF de planograma y devuélvelo en el formato pedido.',
    archivoBase64: pdfBase64,
    nombreArchivo,
    mimeType: 'application/pdf',
    jsonSchema: SCHEMA_RESPUESTA,
    modelo,
    razonamiento,
  });

  const advertencias = [...(resultado.advertencias ?? [])];
  const cuerpos = (resultado.cuerpos ?? []).map((c, i) => normalizarCuerpo(c, i, accesorios));
  if (cuerpos.length === 0) advertencias.push('No se reconoció ningún cuerpo de mueble en el PDF.');
  advertirGanchosRepetidos(cuerpos, advertencias);

  await identificarProductos(cuerpos, catiClient, advertencias);

  return { archivo: nombreArchivo, modelo, cuerpos, advertencias };
}

module.exports = { procesarPdf, SCHEMA_RESPUESTA };
