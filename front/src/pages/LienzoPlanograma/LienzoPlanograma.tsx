import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { Breadcrumb } from '../../components/dominio/layout/Breadcrumb/Breadcrumb';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { LienzoTopbar } from '../../components/dominio/lienzoEditor/LienzoTopbar/LienzoTopbar';
import { LienzoToolbar } from '../../components/dominio/lienzoEditor/LienzoToolbar/LienzoToolbar';
import { LienzoCatalogoPanel } from '../../components/dominio/lienzoEditor/LienzoCatalogoPanel/LienzoCatalogoPanel';
import { LienzoCanvas } from '../../components/dominio/lienzoEditor/LienzoCanvas/LienzoCanvas';
import { ModalExportarLienzo } from '../../components/dominio/lienzoEditor/ModalExportarLienzo/ModalExportarLienzo';
import { BarraAccionesPosicion } from '../../components/dominio/editor/BarraAccionesPosicion/BarraAccionesPosicion';
import { AgenteExtractorBubble } from '../../components/dominio/editor/AgenteExtractorBubble/AgenteExtractorBubble';
import { GondolaModal } from '../../components/dominio/modales/GondolaModal/GondolaModal';
import { EliminarGondolaModal } from '../../components/dominio/modales/EliminarGondolaModal/EliminarGondolaModal';
import { NivelModal } from '../../components/dominio/modales/NivelModal/NivelModal';
import { EliminarNivelModal } from '../../components/dominio/modales/EliminarNivelModal/EliminarNivelModal';
import { AsignarSkuModal } from '../../components/dominio/modales/AsignarSkuModal/AsignarSkuModal';
import { PosicionDrawer } from '../../components/dominio/modales/PosicionDrawer/PosicionDrawer';
import { MoverPosicionModal } from '../../components/dominio/modales/MoverPosicionModal/MoverPosicionModal';
import { CopiarPosicionModal } from '../../components/dominio/modales/CopiarPosicionModal/CopiarPosicionModal';
import { EliminarPosicionModal } from '../../components/dominio/modales/EliminarPosicionModal/EliminarPosicionModal';
import { FichaProductoModal } from '../../components/dominio/modales/FichaProductoModal/FichaProductoModal';
import { DetalleGondolaPanel } from '../../components/dominio/lienzoEditor/DetalleGondolaPanel/DetalleGondolaPanel';
import { GondolaEscalaLienzo } from '../../components/dominio/lienzoEditor/GondolaEscalaLienzo/GondolaEscalaLienzo';
import { useEditarSecciones, useSeccionesDeVersion, useSkusDeVersion } from '../../hooks/useSecciones';
import type { DireccionSeccion } from '../../types/seccion';
import { CHROME_GONDOLA_PX, PX_POR_CM, calcularAnchoFramePx } from '../../components/dominio/lienzoEditor/constantesLienzo';
import { POSICION_PENDIENTE_ANCHO_CM } from '../../constants/valoresPorDefecto';
import { usePlanogramaDetalle } from '../../hooks/usePlanogramas';
import { useVersionesDePlanograma } from '../../hooks/useVersiones';
import { useGondolasDeVersion } from '../../hooks/useGondolas';
import { useNivelesDeVersion } from '../../hooks/useNiveles';
import { useAgregarPosicion, useCopiarPosicion, useEditarPosicion, useMoverPosicion, usePosicionesDeNiveles } from '../../hooks/usePosiciones';
import { useCanvasViewport, type LimiteRectangulo } from '../../hooks/useCanvasViewport';
import { useTemaLienzo } from '../../hooks/useTemaLienzo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { catalogoService } from '../../services/catalogo.service';
import { posicionesService } from '../../services/posiciones.service';
import { calcularAnchoAsignado } from '../../utils/posicionCalculos';
import { adaptarCapacidad, adaptarGondola, adaptarProductoDePosicion } from '../../domain/lienzo/adaptadorDominioReal';
import type { ProductoCatalogo } from '../../domain/lienzo/lienzo.types';
import type { GondolaListItem } from '../../types/gondola';
import type { Nivel } from '../../types/nivel';
import type { PosicionConProducto, PosicionInput } from '../../types/posicion';
import './LienzoPlanograma.css';

/** Alto de referencia (px) que se asume por góndola al calcular "ajustar a pantalla". */
const ALTO_REFERENCIA_GONDOLA_PX = 420;
/** Separación horizontal (px) entre góndolas la primera vez que aparecen en el lienzo. */
const SEPARACION_GONDOLA_PX = 90;

/** Espacio extra (px) que suma el marco del dibujo a escala: encabezado, regla, postes y márgenes. */
const MARCO_ESCALA_PX = { ancho: 80, alto: 90 };

function calcularLimite(
  gondolas: { x: number; y: number; anchoCm: number; altoCm?: number; niveles: { posiciones: unknown[] }[] }[],
  aEscala = true,
): LimiteRectangulo {
  if (gondolas.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 400 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const g of gondolas) {
    const ancho = aEscala ? g.anchoCm * PX_POR_CM + MARCO_ESCALA_PX.ancho : calcularAnchoFramePx(g.anchoCm, g.niveles);
    const alto = aEscala ? (g.altoCm ?? 213) * PX_POR_CM + MARCO_ESCALA_PX.alto : ALTO_REFERENCIA_GONDOLA_PX;
    minX = Math.min(minX, g.x);
    minY = Math.min(minY, g.y);
    maxX = Math.max(maxX, g.x + ancho);
    maxY = Math.max(maxY, g.y + alto);
  }
  return { minX, minY, maxX, maxY };
}

/** Las subcategorías pueden venir como "(idCati) nombre" o texto libre — mismo parseo que `AsignarSkuModal`. */
function parseSubcategoria(raw: string): string {
  const match = raw.match(/^\((.+?)\)/);
  return match ? match[1] : raw;
}

export function LienzoPlanograma() {
  const { id, versionId, gondolaId: gondolaIdParam } = useParams<{ id: string; versionId: string; gondolaId?: string }>();
  const planogramaId = Number(id);
  const versionIdNumerico = Number(versionId);
  // Detalle de góndola: misma página, enfocada en una sola góndola y con el panel lateral.
  const gondolaEnfocadaId = gondolaIdParam ? Number(gondolaIdParam) : null;
  const rutaLienzo = `/planogramas/${planogramaId}/versiones/${versionIdNumerico}/lienzo`;
  const navigate = useNavigate();
  const { puedeEscribir } = useAuth();
  const { mostrarToast } = useToast();

  const { planograma, cargando: cargandoPlanograma } = usePlanogramaDetalle(planogramaId);
  const { versiones, cargando: cargandoVersiones } = useVersionesDePlanograma(planogramaId);
  const version = versiones.find((v) => v.id === versionIdNumerico);
  const cargandoInicial = cargandoPlanograma || cargandoVersiones;

  const { gondolas, recargar: recargarGondolas } = useGondolasDeVersion(versionIdNumerico);
  const { niveles, recargar: recargarNiveles } = useNivelesDeVersion(gondolas, true);
  const { porNivel: posicionesPorNivel, recargar: recargarPosiciones } = usePosicionesDeNiveles(niveles);
  const { editar: editarPosicion } = useEditarPosicion();
  const { copiar: copiarPosicion } = useCopiarPosicion();
  const { mover: moverPosicion } = useMoverPosicion();
  const { agregar: agregarPosicion } = useAgregarPosicion();
  const { porGondola: seccionesPorGondola, recargar: recargarSecciones } = useSeccionesDeVersion(gondolas);
  const editarSecciones = useEditarSecciones();
  const [mostrarGanchos, setMostrarGanchos] = useState(false);
  const [seccionSeleccionadaId, setSeccionSeleccionadaId] = useState<number | null>(null);
  const { datos: skusVersion, recargar: recargarSkus, editar: editarSku } = useSkusDeVersion(
    versionIdNumerico,
    gondolaEnfocadaId !== null || mostrarGanchos,
  );

  // Totales por SKU y ganchos se recalculan en el backend: se vuelven a pedir cuando cambia algo
  // de la estructura o de las posiciones (solo si se están mostrando).
  useEffect(() => {
    recargarSkus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicionesPorNivel, niveles, seccionesPorGondola]);

  const viewport = useCanvasViewport();
  const { tema, alternarTema } = useTemaLienzo();

  const [posicionesEnCanvas, setPosicionesEnCanvas] = useState<Record<number, { x: number; y: number }>>({});
  const [catalogoVisible, setCatalogoVisible] = useState(true);
  const [cuadriculaActiva, setCuadriculaActiva] = useState(true);
  const [buscarSku, setBuscarSku] = useState('');
  const [exportarAbierto, setExportarAbierto] = useState(false);
  const [posicionSeleccionadaId, setPosicionSeleccionadaId] = useState<string | null>(null);

  const [modalGondola, setModalGondola] = useState<'crear' | GondolaListItem | null>(null);
  const [gondolaAEliminar, setGondolaAEliminar] = useState<GondolaListItem | null>(null);
  const [modalNivel, setModalNivel] = useState<{
    gondolaId: number;
    gondolaAnchoCm: number;
    nivel: Nivel | null;
    proximoOrden: number;
    seccionId?: number | null;
  } | null>(null);
  const [nivelAEliminar, setNivelAEliminar] = useState<Nivel | null>(null);
  const [posicionPendiente, setPosicionPendiente] = useState<PosicionConProducto | null>(null);
  const [posicionDetalleId, setPosicionDetalleId] = useState<number | null>(null);
  const [posicionAMover, setPosicionAMover] = useState<PosicionConProducto | null>(null);
  const [posicionACopiar, setPosicionACopiar] = useState<PosicionConProducto | null>(null);
  const [posicionAEliminar, setPosicionAEliminar] = useState<PosicionConProducto | null>(null);
  const [fichaSku, setFichaSku] = useState<string | null>(null);

  // Ubica cada góndola nueva de izquierda a derecha la primera vez que aparece — la posición
  // en el lienzo es un dato puramente visual/local, el dominio real no la registra.
  useEffect(() => {
    setPosicionesEnCanvas((actual) => {
      let cambio = false;
      const copia = { ...actual };
      let cursorX = 40;
      for (const g of gondolas) {
        if (!copia[g.id]) {
          copia[g.id] = { x: cursorX, y: 40 };
          cambio = true;
        }
        cursorX += g.ancho_cm * PX_POR_CM + CHROME_GONDOLA_PX + SEPARACION_GONDOLA_PX;
      }
      return cambio ? copia : actual;
    });
  }, [gondolas]);

  const gondolasLienzo = useMemo(
    () =>
      gondolas
        .filter((g) => gondolaEnfocadaId === null || g.id === gondolaEnfocadaId)
        .map((g) =>
          adaptarGondola(
            g,
            niveles.filter((n) => n.gondolaId === g.id),
            posicionesPorNivel,
            gondolaEnfocadaId === null ? (posicionesEnCanvas[g.id] ?? { x: 40, y: 40 }) : { x: 40, y: 40 },
            seccionesPorGondola[g.id] ?? null,
          ),
        ),
    [gondolas, niveles, posicionesPorNivel, posicionesEnCanvas, seccionesPorGondola, gondolaEnfocadaId],
  );
  const gondolaEnfocada = gondolaEnfocadaId === null ? null : (gondolas.find((g) => g.id === gondolaEnfocadaId) ?? null);

  const productosPorSku = useMemo(() => {
    const mapa = new Map<string, ProductoCatalogo>();
    Object.values(posicionesPorNivel).forEach((datos) => {
      datos.posiciones.forEach((p) => {
        if (p.sku && !mapa.has(p.sku)) {
          const adaptado = adaptarProductoDePosicion(p);
          if (adaptado) mapa.set(p.sku, adaptado);
        }
      });
    });
    return mapa;
  }, [posicionesPorNivel]);

  function encontrarPosicionReal(idTexto: string): PosicionConProducto | null {
    const id = Number(idTexto);
    for (const datos of Object.values(posicionesPorNivel)) {
      const encontrada = datos.posiciones.find((p) => p.id === id);
      if (encontrada) return encontrada;
    }
    return null;
  }

  /** Nivel adyacente dentro de la MISMA góndola — usado por "Duplicar" (CU-04-04/05). */
  function nivelSiguienteId(posicion: PosicionConProducto): number | null {
    const nivelActual = niveles.find((n) => n.id === posicion.nivelId);
    if (!nivelActual) return null;
    const nivelesDeLaGondola = niveles.filter((n) => n.gondolaId === nivelActual.gondolaId).sort((a, b) => a.orden - b.orden);
    const indice = nivelesDeLaGondola.findIndex((n) => n.id === nivelActual.id);
    return nivelesDeLaGondola[indice + 1]?.id ?? nivelesDeLaGondola[indice - 1]?.id ?? null;
  }

  function onRecargarTodo() {
    recargarNiveles();
    recargarGondolas();
    recargarPosiciones();
    recargarSecciones();
  }

  function onExpandirGondola(gondolaIdTexto: string) {
    setSeccionSeleccionadaId(null);
    navigate(gondolaEnfocadaId === null ? `${rutaLienzo}/gondola/${gondolaIdTexto}` : rutaLienzo);
  }

  async function onDividirSeccion(direccion: DireccionSeccion, seccionId: number | null) {
    if (!gondolaEnfocada) return;
    const ok = await editarSecciones.dividir(gondolaEnfocada.id, { direccion, ...(seccionId ? { seccion_id: seccionId } : {}) });
    if (ok) {
      recargarSecciones();
      recargarNiveles();
    }
  }

  async function onRedimensionarSeccion(nodoId: number, tamCm: number) {
    if (await editarSecciones.redimensionar(nodoId, tamCm)) {
      recargarSecciones();
      recargarNiveles();
    }
  }

  async function onQuitarSeccion(seccionId: number) {
    if (await editarSecciones.quitar(seccionId)) {
      setSeccionSeleccionadaId(null);
      recargarSecciones();
      recargarNiveles();
    }
  }

  function onSeleccionarPosicion(idTexto: string) {
    const posicion = encontrarPosicionReal(idTexto);
    if (!posicion) return;
    if (posicion.modo === 'PENDIENTE') {
      setPosicionPendiente(posicion);
      return;
    }
    setPosicionSeleccionadaId(idTexto);
  }

  /** Doble clic sobre una posición: va directo al panel de edición, sin pasar por seleccionar + "Editar" en la barra de acciones. */
  function onAbrirDetallePosicion(idTexto: string) {
    const posicion = encontrarPosicionReal(idTexto);
    if (!posicion) return;
    if (posicion.modo === 'PENDIENTE') {
      setPosicionPendiente(posicion);
      return;
    }
    setPosicionSeleccionadaId(idTexto);
    setPosicionDetalleId(posicion.id);
  }

  async function onCambiarFacings(posicion: PosicionConProducto, nuevoFacings: number) {
    if (nuevoFacings < 1) return;
    const anchoNuevo = calcularAnchoAsignado(nuevoFacings, posicion.producto?.ancho_cm ?? null, posicion.ancho_asignado_cm);
    const resultado = await editarPosicion(posicion.id, { facings_horizontal: nuevoFacings, ancho_asignado_cm: anchoNuevo });
    if (resultado) recargarPosiciones();
  }

  async function onDuplicarPosicion(posicion: PosicionConProducto) {
    const nivelDestinoId = nivelSiguienteId(posicion);
    if (nivelDestinoId === null) return;
    const ordenDestino = (posicionesPorNivel[nivelDestinoId]?.posiciones.length ?? 0) + 1;
    const resultado = await copiarPosicion(posicion.id, nivelDestinoId, ordenDestino);
    if (resultado) recargarPosiciones();
  }

  async function onSoltarProductoEnNivel(nivelIdTexto: string, sku: string) {
    const nivelId = Number(nivelIdTexto);
    try {
      const producto = await catalogoService.obtenerProducto(sku);
      const datos: PosicionInput = {
        sku: producto.sku,
        nombre_detectado: null,
        confidence: 100,
        datos_vision: null,
        orden_horizontal: (posicionesPorNivel[nivelId]?.posiciones.length ?? 0) + 1,
        ancho_asignado_cm: calcularAnchoAsignado(1, producto.ancho_cm, 1),
        capacidad_maxima: 1,
        facings_horizontal: 1,
        cantidad_apilable: 1,
        unidades_por_facing: 1,
        perfil_redondeo: 'MRP',
        modo: 'PLANOGRAMA',
        decision: 'ACTIVO',
      };
      const resultado = await agregarPosicion(nivelId, datos);
      if (resultado) onRecargarTodo();
    } catch {
      mostrarToast('No se pudo obtener el producto del catálogo', 'error');
    }
  }

  /** Inserta una posición PENDIENTE vacía (sin SKU) en el hueco elegido — mismo botón "+" que
   * `onAgregarNivel` para niveles, pero horizontal, entre dos productos. Se comporta igual que
   * una posición PENDIENTE generada por IA: al hacer clic abre `AsignarSkuModal`, solo que sin
   * detección ni alternativas sugeridas (esa parte del modal queda vacía). */
  async function onAgregarPosicionPendiente(nivelIdTexto: string, ordenDestino: number) {
    const nivelId = Number(nivelIdTexto);
    const datos: PosicionInput = {
      sku: null,
      nombre_detectado: null,
      confidence: 100,
      datos_vision: null,
      orden_horizontal: ordenDestino,
      ancho_asignado_cm: POSICION_PENDIENTE_ANCHO_CM,
      capacidad_maxima: 1,
      facings_horizontal: 1,
      cantidad_apilable: 1,
      unidades_por_facing: 1,
      perfil_redondeo: 'MRP',
      modo: 'PENDIENTE',
      decision: 'ACTIVO',
    };
    const resultado = await agregarPosicion(nivelId, datos);
    if (resultado) recargarPosiciones();
  }

  async function onSoltarPosicionEnNivel(posicionIdTexto: string, nivelDestinoIdTexto: string) {
    const posicion = encontrarPosicionReal(posicionIdTexto);
    const nivelDestinoId = Number(nivelDestinoIdTexto);
    if (!posicion) return;
    const mismoNivel = posicion.nivelId === nivelDestinoId;
    const posicionesDestino = posicionesPorNivel[nivelDestinoId]?.posiciones.length ?? 0;
    const ordenDestino = mismoNivel ? posicionesDestino : posicionesDestino + 1;
    const resultado = await moverPosicion(posicion.id, nivelDestinoId, ordenDestino);
    if (resultado) recargarPosiciones();
  }

  async function onAsignarSkuPorDrop(posicionIdTexto: string, sku: string) {
    const id = Number(posicionIdTexto);
    try {
      await posicionesService.asignarSku(id, { sku, subcategorias: (planograma?.subcategorias ?? []).map(parseSubcategoria) });
      recargarPosiciones();
      mostrarToast('SKU asignado', 'success');
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'No se pudo asignar el SKU', 'error');
    }
  }

  function onAgregarNivel(gondolaIdTexto: string, ordenDestino: number, seccionId?: number | null) {
    const gondola = gondolas.find((g) => g.id === Number(gondolaIdTexto));
    if (!gondola) return;
    // En una góndola dividida el nivel nuevo toma el ancho de su sección.
    const hoja = seccionId ? seccionesPorGondola[gondola.id]?.hojas.find((h) => h.id === seccionId) : undefined;
    setModalNivel({
      gondolaId: gondola.id,
      gondolaAnchoCm: hoja?.anchoCm ?? gondola.ancho_cm,
      nivel: null,
      proximoOrden: ordenDestino,
      seccionId: seccionId ?? null,
    });
  }

  /** "+ Agregar nivel" del panel de detalle: al final (abajo) de la sección. */
  function onAgregarNivelEnSeccion(seccionId: number | null) {
    if (!gondolaEnfocada) return;
    const delaSeccion = niveles.filter((n) => n.gondolaId === gondolaEnfocada.id && (seccionId === null || (n.seccionId ?? null) === seccionId));
    const ordenDestino = delaSeccion.reduce((max, n) => Math.max(max, n.orden), 0) + 1;
    onAgregarNivel(String(gondolaEnfocada.id), ordenDestino, seccionId);
  }

  function onEditarNivel(nivelIdTexto: string) {
    const nivel = niveles.find((n) => n.id === Number(nivelIdTexto));
    if (!nivel) return;
    const gondola = gondolas.find((g) => g.id === nivel.gondolaId);
    if (!gondola) return;
    setModalNivel({ gondolaId: gondola.id, gondolaAnchoCm: gondola.ancho_cm, nivel, proximoOrden: nivel.orden });
  }

  function onEliminarNivel(nivelIdTexto: string) {
    const nivel = niveles.find((n) => n.id === Number(nivelIdTexto));
    if (nivel) setNivelAEliminar(nivel);
  }

  function onEditarGondola(gondolaIdTexto: string) {
    const gondola = gondolas.find((g) => g.id === Number(gondolaIdTexto));
    if (gondola) setModalGondola(gondola);
  }

  function onEliminarGondola(gondolaIdTexto: string) {
    const gondola = gondolas.find((g) => g.id === Number(gondolaIdTexto));
    if (gondola) setGondolaAEliminar(gondola);
  }

  function onMoverGondola(gondolaIdTexto: string, x: number, y: number) {
    setPosicionesEnCanvas((actual) => ({ ...actual, [Number(gondolaIdTexto)]: { x, y } }));
  }

  function onAgregarGondola() {
    setModalGondola('crear');
  }

  function onAjustarZoom() {
    viewport.ajustarAContenido(calcularLimite(gondolasLienzo));
  }

  // Se ajusta el zoom recién cuando cada góndola ya tiene una posición asignada en el lienzo —
  // si se dispara antes (con `posicionesEnCanvas` todavía vacío), todas las góndolas comparten
  // el mismo punto por defecto y el encuadre calculado queda mal (ver efecto de arriba).
  const layoutListo = gondolas.length > 0 && gondolas.every((g) => Boolean(posicionesEnCanvas[g.id]));
  useEffect(() => {
    if (!layoutListo) return;
    const t = setTimeout(() => viewport.ajustarAContenido(calcularLimite(gondolasLienzo)), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutListo]);

  // Al entrar o salir del detalle de una góndola, se vuelve a encuadrar lo que se ve.
  useEffect(() => {
    if (!layoutListo) return;
    const t = setTimeout(() => viewport.ajustarAContenido(calcularLimite(gondolasLienzo)), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gondolaEnfocadaId]);

  function onBuscarSkuSubmit(valor: string) {
    const q = valor.trim().toLowerCase();
    if (!q) return;
    for (const gondolaLienzo of gondolasLienzo) {
      for (const nivelLienzo of gondolaLienzo.niveles) {
        for (const posicionLienzo of nivelLienzo.posiciones) {
          const nombre = posicionLienzo.sku ? (productosPorSku.get(posicionLienzo.sku)?.nombre ?? '') : (posicionLienzo.nombreDetectado ?? '');
          if ((posicionLienzo.sku && posicionLienzo.sku.toLowerCase().includes(q)) || nombre.toLowerCase().includes(q)) {
            viewport.centrarEn(gondolaLienzo.x + (gondolaLienzo.anchoCm * PX_POR_CM) / 2, gondolaLienzo.y + 200);
            onSeleccionarPosicion(posicionLienzo.id);
            mostrarToast(`Encontrado en ${gondolaLienzo.nombre} · Nivel ${nivelLienzo.orden}`, 'success');
            return;
          }
        }
      }
    }
    mostrarToast('No se encontró ese SKU en el lienzo', 'info');
  }

  const posicionSeleccionada = posicionSeleccionadaId ? encontrarPosicionReal(posicionSeleccionadaId) : null;
  const nivelDeSeleccionada = posicionSeleccionada ? niveles.find((n) => n.id === posicionSeleccionada.nivelId) : null;

  // El lienzo no tiene "góndola activa" (a diferencia del editor por pestañas): el agente
  // extractor por fotos usa la de la posición seleccionada o, si no hay ninguna, la primera.
  const gondolaActivaParaAgente = gondolas.find((g) => g.id === nivelDeSeleccionada?.gondolaId) ?? gondolas[0];

  if (!cargandoInicial && (!planograma || !version)) {
    return (
      <div className="lienzo-planograma">
        <AppTopbar titulo="Planogramas" />
        <div className="lienzo-planograma__tematizado" data-tema={tema}>
          <div className="lienzo-planograma__no-encontrado">
            <EmptyState titulo="Esta versión no existe" hint="Puede que haya sido eliminada o que el enlace esté mal." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lienzo-planograma">
      <AppTopbar
        titulo="Planogramas"
        breadcrumb={
          <Breadcrumb
            segmentos={[
              { label: 'Planogramas', to: '/planogramas' },
              { label: cargandoPlanograma ? '…' : (planograma?.nombre ?? ''), to: `/planogramas/${planogramaId}` },
              ...(gondolaEnfocadaId === null
                ? [{ label: cargandoVersiones ? '…' : `${version?.codigo ?? ''} · Lienzo` }]
                : [
                    { label: cargandoVersiones ? '…' : `${version?.codigo ?? ''} · Lienzo`, to: rutaLienzo },
                    { label: gondolaEnfocada?.nombre ?? '…' },
                  ]),
            ]}
          />
        }
      />

      {/* Todo lo de acá para abajo vive en su propio tema claro/oscuro (ver LienzoPlanograma.css)
          — el AppTopbar compartido de arriba queda afuera a propósito, sin cambios. */}
      <div className="lienzo-planograma__tematizado" data-tema={tema}>
        <LienzoTopbar
          onIrAEditor={() => navigate(`/planogramas/${planogramaId}/versiones/${versionIdNumerico}/editor`)}
          buscarSku={buscarSku}
          onBuscarSkuChange={setBuscarSku}
          onBuscarSkuSubmit={onBuscarSkuSubmit}
          zoomPorcentaje={Math.round(viewport.view.scale * 100)}
          onZoomIn={() => viewport.fijarEscala(viewport.view.scale * 1.15)}
          onZoomOut={() => viewport.fijarEscala(viewport.view.scale / 1.15)}
          onZoomCambiar={(pct) => viewport.fijarEscala(pct / 100)}
          onAjustarZoom={onAjustarZoom}
          cuadriculaActiva={cuadriculaActiva}
          onToggleCuadricula={() => setCuadriculaActiva((v) => !v)}
          tema={tema}
          onAlternarTema={alternarTema}
        />

        {posicionSeleccionada && (
          <BarraAccionesPosicion
            posicion={posicionSeleccionada}
            nivelOrden={nivelDeSeleccionada?.orden ?? posicionSeleccionada.nivelId}
            onCambiarFacings={onCambiarFacings}
            onDuplicar={onDuplicarPosicion}
            onCopiar={setPosicionACopiar}
            onMover={setPosicionAMover}
            onEditar={(p) => setPosicionDetalleId(p.id)}
            onFicha={setFichaSku}
            onQuitar={setPosicionAEliminar}
            onDeseleccionar={() => setPosicionSeleccionadaId(null)}
          />
        )}

        <div className="lienzo-planograma__workspace">
          <LienzoToolbar
            catalogoVisible={catalogoVisible}
            onToggleCatalogo={() => setCatalogoVisible((v) => !v)}
            onAgregarGondola={onAgregarGondola}
            onExportar={() => setExportarAbierto(true)}
          />

          <LienzoCatalogoPanel
            subcategorias={planograma?.subcategorias ?? []}
            colapsado={!catalogoVisible}
            onAbrirFicha={setFichaSku}
          />

          <LienzoCanvas
            contenedorRef={viewport.contenedorRef}
            view={viewport.view}
            enPan={viewport.enPan}
            mostrarCuadricula={cuadriculaActiva}
            handlers={viewport.handlers}
          >
            {gondolasLienzo.map((gondola) => (
              <GondolaEscalaLienzo
                key={gondola.id}
                gondola={gondola}
                scale={viewport.view.scale}
                puedeEscribir={puedeEscribir}
                posicionSeleccionadaId={posicionSeleccionadaId}
                resolverProducto={(sku) => productosPorSku.get(sku)}
                resolverCapacidad={(nivelLienzo) => {
                  const datos = posicionesPorNivel[Number(nivelLienzo.id)];
                  return datos ? adaptarCapacidad(datos.capacidad) : { ocupadoCm: 0, disponibleCm: 0, libreCm: 0, sobreOcupado: false };
                }}
                resolverDesborda={(posicionLienzo) => posicionLienzo.desbordaGondola}
                resolverGanchos={mostrarGanchos && skusVersion ? (posicionId) => skusVersion.ganchosPorPosicion[posicionId] : undefined}
                onExpandir={onExpandirGondola}
                expandida={gondolaEnfocadaId !== null}
                seccionSeleccionadaId={gondolaEnfocadaId !== null ? seccionSeleccionadaId : null}
                onSeleccionarSeccion={gondolaEnfocadaId !== null ? setSeccionSeleccionadaId : undefined}
                onMoverGondola={onMoverGondola}
                onEditarGondola={onEditarGondola}
                onEliminarGondola={onEliminarGondola}
                onAgregarNivel={onAgregarNivel}
                onEditarNivel={onEditarNivel}
                onEliminarNivel={onEliminarNivel}
                onSeleccionarPosicion={onSeleccionarPosicion}
                onAbrirDetallePosicion={onAbrirDetallePosicion}
                onAbrirFichaPosicion={setFichaSku}
                onSoltarProductoEnNivel={onSoltarProductoEnNivel}
                onSoltarPosicionEnNivel={onSoltarPosicionEnNivel}
                onAsignarSkuPorDrop={onAsignarSkuPorDrop}
                onAgregarPosicionPendiente={onAgregarPosicionPendiente}
              />
            ))}
          </LienzoCanvas>

          {gondolaEnfocada && (
            <DetalleGondolaPanel
              gondola={gondolaEnfocada}
              estructura={seccionesPorGondola[gondolaEnfocada.id]}
              niveles={niveles.filter((n) => n.gondolaId === gondolaEnfocada.id)}
              posicionesPorNivelId={Object.fromEntries(Object.entries(posicionesPorNivel).map(([nivelId, d]) => [nivelId, d.posiciones.length]))}
              puedeEscribir={puedeEscribir}
              seccionSeleccionadaId={seccionSeleccionadaId}
              onSeleccionarSeccion={setSeccionSeleccionadaId}
              onDividir={onDividirSeccion}
              onRedimensionar={onRedimensionarSeccion}
              onQuitarSeccion={onQuitarSeccion}
              onAgregarNivel={onAgregarNivelEnSeccion}
              skus={skusVersion}
              onEditarSku={editarSku}
              onIrAPosicion={(posicionId) => onSeleccionarPosicion(String(posicionId))}
              mostrarGanchos={mostrarGanchos}
              onAlternarGanchos={() => setMostrarGanchos((v) => !v)}
            />
          )}
        </div>

        {exportarAbierto && (
          <ModalExportarLienzo datos={{ planograma, version, gondolas, niveles, posicionesPorNivel }} onClose={() => setExportarAbierto(false)} />
        )}
      </div>

      {modalGondola && (
        <GondolaModal
          versionId={versionIdNumerico}
          gondola={modalGondola === 'crear' ? null : modalGondola}
          onClose={() => setModalGondola(null)}
          onGuardada={(gondola) => {
            setModalGondola(null);
            recargarGondolas();
            setPosicionesEnCanvas((actual) => (actual[gondola.id] ? actual : { ...actual, [gondola.id]: { x: 40, y: 40 } }));
          }}
        />
      )}

      {gondolaAEliminar && (
        <EliminarGondolaModal
          gondola={gondolaAEliminar}
          onClose={() => setGondolaAEliminar(null)}
          onEliminada={() => {
            setGondolaAEliminar(null);
            recargarGondolas();
          }}
        />
      )}

      {modalNivel && (
        <NivelModal
          gondolaId={modalNivel.gondolaId}
          gondolaAnchoCm={modalNivel.gondolaAnchoCm}
          nivel={modalNivel.nivel}
          proximoOrden={modalNivel.proximoOrden}
          seccionId={modalNivel.seccionId}
          onClose={() => setModalNivel(null)}
          onGuardada={() => {
            setModalNivel(null);
            onRecargarTodo();
          }}
        />
      )}

      {nivelAEliminar && (
        <EliminarNivelModal
          nivel={nivelAEliminar}
          onClose={() => setNivelAEliminar(null)}
          onEliminado={() => {
            setNivelAEliminar(null);
            recargarNiveles();
            recargarGondolas();
          }}
        />
      )}

      {posicionPendiente && (
        <AsignarSkuModal
          posicion={posicionPendiente}
          subcategorias={planograma?.subcategorias ?? []}
          onClose={() => setPosicionPendiente(null)}
          onAsignado={() => {
            setPosicionPendiente(null);
            recargarPosiciones();
          }}
        />
      )}

      {posicionDetalleId !== null && (
        <PosicionDrawer posicionId={posicionDetalleId} onClose={() => setPosicionDetalleId(null)} onCambio={recargarPosiciones} />
      )}

      {posicionAMover && (
        <MoverPosicionModal
          posicion={posicionAMover}
          nivelActualId={posicionAMover.nivelId}
          gondolas={gondolas}
          gondolaActualId={niveles.find((n) => n.id === posicionAMover.nivelId)?.gondolaId ?? gondolas[0]?.id}
          onClose={() => setPosicionAMover(null)}
          onMovida={() => {
            setPosicionAMover(null);
            recargarPosiciones();
          }}
        />
      )}

      {posicionACopiar && (
        <CopiarPosicionModal
          posicion={posicionACopiar}
          nivelActualId={posicionACopiar.nivelId}
          gondolas={gondolas}
          gondolaActualId={niveles.find((n) => n.id === posicionACopiar.nivelId)?.gondolaId ?? gondolas[0]?.id}
          onClose={() => setPosicionACopiar(null)}
          onCopiada={() => {
            setPosicionACopiar(null);
            recargarPosiciones();
          }}
        />
      )}

      {posicionAEliminar && (
        <EliminarPosicionModal
          posicion={posicionAEliminar}
          onClose={() => setPosicionAEliminar(null)}
          onEliminada={() => {
            setPosicionAEliminar(null);
            setPosicionSeleccionadaId(null);
            recargarPosiciones();
          }}
        />
      )}

      {fichaSku && <FichaProductoModal sku={fichaSku} onClose={() => setFichaSku(null)} />}

      {!cargandoInicial && (
        <AgenteExtractorBubble
          puedeEscribir={puedeEscribir}
          versionId={versionIdNumerico}
          gondolas={gondolas}
          gondolaActiva={gondolaActivaParaAgente}
          categoria={planograma?.departamento ?? ''}
          subcategorias={planograma?.subcategorias ?? []}
          onConfirmado={onRecargarTodo}
          onCrearGondola={() => setModalGondola('crear')}
          modoVoz
        />
      )}
    </div>
  );
}
