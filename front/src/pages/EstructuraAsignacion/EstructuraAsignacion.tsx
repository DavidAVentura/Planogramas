import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { BarraAsignacion, type FiltrosEstructura } from '../../components/dominio/estructura/BarraAsignacion/BarraAsignacion';
import { MatrizAsignaciones } from '../../components/dominio/estructura/MatrizAsignaciones/MatrizAsignaciones';
import { BarraCambiosAsignacion } from '../../components/dominio/estructura/BarraCambiosAsignacion/BarraCambiosAsignacion';
import { MenuCeldaAsignacion } from '../../components/dominio/estructura/MenuCeldaAsignacion/MenuCeldaAsignacion';
import {
  AvisoContextoEstructura,
  type VarianteAviso,
} from '../../components/dominio/estructura/AvisoContextoEstructura/AvisoContextoEstructura';
import { ResumenAsignacionModal, type CambioResumen } from '../../components/dominio/modales/ResumenAsignacionModal/ResumenAsignacionModal';
import { HistorialAsignacionModal } from '../../components/dominio/modales/HistorialAsignacionModal/HistorialAsignacionModal';
import { VersionResumenModal } from '../../components/dominio/modales/VersionResumenModal/VersionResumenModal';
import { MontajeTiendaModal } from '../../components/dominio/modales/MontajeTiendaModal/MontajeTiendaModal';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { useGuardarEdicion, useMatrizAsignaciones } from '../../hooks/useAsignaciones';
import { usePromoverAPiloto } from '../../hooks/useVersiones';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  aCambioApi,
  clave,
  clavesCambiadas,
  conVistaPreviaPiloto,
  describirCelda,
  formatoEdicion,
  grupoDeCambio,
  indexarVersiones,
  mapaInicial,
  pilotoQueSeArchiva,
  pincelDeVersion,
  resolverPincel,
  resolverPromocion,
  textoCelda,
  tiendasConVersion,
  varianteDeCelda,
  type MapaAsignaciones,
  type Pincel,
} from '../../domain/estructura/asignaciones';
import { leerContexto, type ModoEstructura } from '../../domain/estructura/contexto';
import type { PlanogramaMatriz, TiendaMatriz, VersionMatriz } from '../../types/asignacion';
import './EstructuraAsignacion.css';

const FILTROS_INICIALES: FiltrosEstructura = { busqueda: '', departamento: '', tipoTienda: '', planogramas: [], tiendas: [] };

/** Cuántos valores distintos de `valor` tiene cada `clave` (ej. tiendas por planograma). */
function contarDistintos<T>(filas: T[], clave: (f: T) => number, valor: (f: T) => number): Map<number, number> {
  const conjuntos = new Map<number, Set<number>>();
  filas.forEach((f) => {
    const k = clave(f);
    const conjunto = conjuntos.get(k) ?? new Set<number>();
    conjunto.add(valor(f));
    conjuntos.set(k, conjunto);
  });
  return new Map([...conjuntos].map(([k, s]) => [k, s.size]));
}

interface MenuAbierto {
  planograma: PlanogramaMatriz;
  tienda: TiendaMatriz;
  x: number;
  y: number;
}

type CeldaAbierta = { planograma: PlanogramaMatriz; tienda: TiendaMatriz };

interface Aviso {
  variante: VarianteAviso;
  titulo: string;
  texto: string;
  conteo?: string;
  nota?: string | null;
  textoVolver: string;
}

function tiendasTexto(n: number): string {
  return n === 1 ? '1 tienda' : `${n} tiendas`;
}

function etiquetaPincelPiloto(v: VersionMatriz): string {
  const sigla = pincelDeVersion(v);
  return sigla === 'ESP' ? 'Especial piloto' : `${sigla} piloto`;
}

/**
 * Modo efectivo según el estado real de la versión: promover solo si sigue en desarrollo y el
 * ajuste de piloto solo si está en piloto (una versión ya promovida pasa a "piloto"). Si no aplica,
 * Estructura queda solo filtrada al planograma.
 */
function modoEfectivo(pedido: ModoEstructura, version: VersionMatriz | null): ModoEstructura {
  if (pedido === 'filtro' || !version) return 'filtro';
  if (version.estado === 'piloto') return 'piloto';
  if (pedido === 'promover' && version.estado === 'en_desarrollo') return 'promover';
  return 'filtro';
}

export function EstructuraAsignacion() {
  const { puedeEscribir } = useAuth();
  const { mostrarToast } = useToast();
  const [params, setParams] = useSearchParams();
  const contexto = useMemo(() => leerContexto(params), [params]);
  // Con contexto se pide el planograma aunque aún no tenga versiones montables (promover su primera versión).
  const { matriz: matrizApi, cargando, recargar } = useMatrizAsignaciones(contexto?.planogramaId);
  const { guardar, enviando } = useGuardarEdicion();
  const { promover, enviando: promoviendo } = usePromoverAPiloto();

  // Versión que se promueve o cuyas tiendas piloto se ajustan, tal como viene del backend.
  const versionContexto = useMemo(
    () => (contexto?.versionId ? matrizApi?.planogramas.flatMap((p) => p.versiones).find((v) => v.id === contexto.versionId) ?? null : null),
    [contexto, matrizApi],
  );
  const modo = contexto ? modoEfectivo(contexto.modo, versionContexto) : null;
  const promocion = modo === 'promover' ? versionContexto : null;
  const [recienPromovida, setRecienPromovida] = useState(false);

  // Durante una promoción la versión en desarrollo se ve como piloto (vista previa de cómo quedará).
  const matriz = useMemo(
    () => (matrizApi && promocion ? { ...matrizApi, planogramas: conVistaPreviaPiloto(matrizApi.planogramas, promocion.id) } : matrizApi),
    [matrizApi, promocion],
  );
  const planogramaContexto = matriz?.planogramas.find((p) => p.id === contexto?.planogramaId) ?? null;

  const versiones = useMemo(() => indexarVersiones(matriz?.planogramas ?? []), [matriz]);
  const [guardadas, setGuardadas] = useState<MapaAsignaciones>({});
  const [asignaciones, setAsignaciones] = useState<MapaAsignaciones>({});
  const [pilaDeshacer, setPilaDeshacer] = useState<MapaAsignaciones[]>([]);
  const [pincel, setPincel] = useState<Pincel>('TG');
  const [modoPiloto, setModoPiloto] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosEstructura>(FILTROS_INICIALES);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [menu, setMenu] = useState<MenuAbierto | null>(null);
  const [celdaHistorial, setCeldaHistorial] = useState<CeldaAbierta | null>(null);
  const [versionAbierta, setVersionAbierta] = useState<{ versionId: number; tienda: TiendaMatriz } | null>(null);
  const [montajeAbierto, setMontajeAbierto] = useState<(CeldaAbierta & { version: VersionMatriz }) | null>(null);
  const [extendida, setExtendida] = useState(false);

  // Al arrastrar se pintan varias celdas en un solo paso de "Deshacer": el ref guarda el mapa
  // vigente entre eventos (el estado de React no se actualiza a tiempo) y si el trazo ya apiló.
  const asignacionesRef = useRef(asignaciones);
  asignacionesRef.current = asignaciones;
  const trazoApilado = useRef(false);

  useEffect(() => {
    if (!matriz) return;
    const inicial = mapaInicial(matriz.asignaciones, versiones);
    setGuardadas(inicial);
    setAsignaciones(inicial);
    setPilaDeshacer([]);
  }, [matriz, versiones]);

  const cambios = useMemo(() => clavesCambiadas(asignaciones, guardadas), [asignaciones, guardadas]);

  // Al llegar desde el detalle de un planograma: filtrar a ese planograma (con todas las tiendas) y,
  // al promover o ajustar un piloto, arrancar en modo Piloto con el pincel de la versión. Se aplica
  // una vez por contexto, así el usuario puede cambiar filtros después.
  const contextoAplicado = useRef<string | null>(null);
  useEffect(() => {
    if (!matrizApi || !contexto) return;
    const llave = `${params.toString()}|${modo}`;
    if (contextoAplicado.current === llave) return;
    contextoAplicado.current = llave;

    const p = matrizApi.planogramas.find((x) => x.id === contexto.planogramaId);
    if (!p) {
      mostrarToast('Ese planograma no tiene versiones para asignar en Estructura', 'info');
      return;
    }
    setFiltros({ ...FILTROS_INICIALES, planogramas: [{ id: p.id, nombre: p.nombre }] });
    if (modo !== 'filtro' && versionContexto) {
      setModoPiloto(true);
      setPincel(pincelDeVersion(versionContexto));
    } else if (contexto.modo !== 'filtro') {
      mostrarToast('La versión ya no está en ese estado; se muestra el planograma filtrado', 'info');
    }
  }, [matrizApi, contexto, params, modo, versionContexto, mostrarToast]);

  // Vista extendida: sin barra superior ni título; la matriz usa todo el alto y ancho de la pantalla.
  const alternarExtendida = useCallback(() => {
    mostrarToast(extendida ? 'Vista normal' : 'Vista extendida · doble clic en la esquina o Esc para salir');
    setExtendida(!extendida);
    setMenu(null);
  }, [extendida, mostrarToast]);

  // Esc sale de la vista extendida, salvo que lo esté usando un modal o el menú de una celda.
  useEffect(() => {
    if (!extendida) return;
    function alPresionar(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      alternarExtendida();
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [extendida, alternarExtendida]);

  // Avisar antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (cambios.length === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [cambios.length]);

  const tiendasVisibles = useMemo(() => {
    const elegidas = new Set(filtros.tiendas.map((t) => t.id));
    return (matriz?.tiendas ?? []).filter(
      (t) => (!filtros.tipoTienda || t.tipo === filtros.tipoTienda) && (elegidas.size === 0 || elegidas.has(t.id)),
    );
  }, [matriz, filtros.tipoTienda, filtros.tiendas]);
  const planogramasVisibles = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    const elegidos = new Set(filtros.planogramas.map((p) => p.id));
    return (matriz?.planogramas ?? []).filter(
      (p) =>
        (!filtros.departamento || p.departamento === filtros.departamento) &&
        (!q || p.nombre.toLowerCase().includes(q) || (p.descripcion ?? '').toLowerCase().includes(q)) &&
        (elegidos.size === 0 || elegidos.has(p.id)),
    );
  }, [matriz, filtros.busqueda, filtros.departamento, filtros.planogramas]);

  // Opciones de los modales de filtro: siempre la matriz completa, con sus asignaciones guardadas.
  const opcionesPlanogramas = useMemo(
    () =>
      (matriz?.planogramas ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        departamento: p.departamento,
        totalVersiones: p.versiones.length,
        versiones: p.versiones,
      })),
    [matriz],
  );
  const tiendasPorPlanograma = useMemo(
    () => contarDistintos(matriz?.asignaciones ?? [], (a) => a.planogramaId, (a) => a.tiendaId),
    [matriz],
  );
  const planogramasPorTienda = useMemo(
    () => contarDistintos(matriz?.asignaciones ?? [], (a) => a.tiendaId, (a) => a.planogramaId),
    [matriz],
  );
  const departamentos = useMemo(
    () => [...new Set((matriz?.planogramas ?? []).map((p) => p.departamento))].sort((a, b) => a.localeCompare(b, 'es')),
    [matriz],
  );

  const resolver = useCallback(
    (p: PlanogramaMatriz, t: TiendaMatriz) =>
      promocion && contexto
        ? resolverPromocion(pincel, promocion, contexto.planogramaId, guardadas, p, t)
        : resolverPincel(pincel, modoPiloto, p, t),
    [pincel, modoPiloto, promocion, contexto, guardadas],
  );

  const pintar = useCallback(
    (p: PlanogramaMatriz, t: TiendaMatriz, inicioDeTrazo: boolean) => {
      if (inicioDeTrazo) trazoApilado.current = false;
      const resultado = resolver(p, t);
      if ('bloqueo' in resultado) return;
      const k = clave(p.id, t.id);
      const actual = asignacionesRef.current;
      if ((actual[k] ?? '') === resultado.valor) return;
      if (!trazoApilado.current) {
        trazoApilado.current = true;
        setPilaDeshacer((pila) => [...pila, actual]);
      }
      const nuevo = { ...actual };
      if (resultado.valor) nuevo[k] = resultado.valor;
      else delete nuevo[k];
      asignacionesRef.current = nuevo;
      setAsignaciones(nuevo);
    },
    [resolver],
  );

  const terminarTrazo = useCallback(() => {
    trazoApilado.current = false;
  }, []);

  function abrirMenu(e: MouseEvent<HTMLButtonElement>, p: PlanogramaMatriz, t: TiendaMatriz) {
    e.preventDefault();
    // Con la tecla de menú no hay cursor: se ancla debajo de la celda.
    const rect = e.currentTarget.getBoundingClientRect();
    const conCursor = e.clientX !== 0 || e.clientY !== 0;
    setMenu({ planograma: p, tienda: t, x: conCursor ? e.clientX : rect.left, y: conCursor ? e.clientY : rect.bottom + 4 });
  }

  function deshacer() {
    if (pilaDeshacer.length === 0) return;
    setAsignaciones(pilaDeshacer[pilaDeshacer.length - 1]);
    setPilaDeshacer(pilaDeshacer.slice(0, -1));
  }

  function descartar() {
    setAsignaciones(guardadas);
    setPilaDeshacer([]);
  }

  const resumenCambios = useMemo<CambioResumen[]>(() => {
    if (!matriz) return [];
    const planogramas = new Map(matriz.planogramas.map((p) => [p.id, p]));
    const tiendas = new Map(matriz.tiendas.map((t) => [t.id, t]));
    return cambios.flatMap((k) => {
      const [planogramaId, tiendaId] = k.split('|').map(Number);
      const p = planogramas.get(planogramaId);
      const t = tiendas.get(tiendaId);
      if (!p || !t) return [];
      const antes = describirCelda(guardadas[k], t, versiones);
      const despues = describirCelda(asignaciones[k], t, versiones);
      return [{
        clave: k,
        grupo: grupoDeCambio(antes, despues),
        planograma: p.nombre,
        tiendaCodigo: t.codigo,
        tiendaNombre: t.nombre,
        antes: { texto: textoCelda(antes, t), variante: varianteDeCelda(antes) },
        despues: { texto: textoCelda(despues, t), variante: varianteDeCelda(despues) },
        distinta: despues.distinta,
      }];
    });
  }, [matriz, cambios, guardadas, asignaciones, versiones]);

  /** Tiendas que montan la versión del contexto en la matriz actual (con cambios sin guardar). */
  const tiendasDeLaVersion = contexto && versionContexto ? tiendasConVersion(asignaciones, contexto.planogramaId, versionContexto.id).length : 0;

  function pedirGuardado() {
    // Promover exige al menos una tienda, y una versión en piloto no puede quedar sin tiendas.
    if (versionContexto && (modo === 'promover' || modo === 'piloto') && tiendasDeLaVersion === 0) {
      mostrarToast(
        modo === 'promover'
          ? `Asigna al menos una tienda para promover ${versionContexto.codigo} a piloto`
          : `${versionContexto.codigo} está en piloto: debe quedar al menos una tienda`,
        'error',
      );
      return;
    }
    setResumenAbierto(true);
  }

  async function confirmarPromocion(motivo: string) {
    if (!promocion || !contexto) return;
    const tiendaIds = tiendasConVersion(asignaciones, contexto.planogramaId, promocion.id);
    const resultado = await promover(promocion.id, tiendaIds, motivo);
    if (!resultado) return;
    setResumenAbierto(false);
    setRecienPromovida(true);
    // La versión ya está en piloto: Estructura sigue en el ajuste de sus tiendas piloto.
    setParams({ planogramaId: String(contexto.planogramaId), versionId: String(promocion.id), modo: 'piloto' }, { replace: true });
    recargar();
  }

  async function confirmarGuardado(motivo: string) {
    if (promocion) return confirmarPromocion(motivo);
    const resultado = await guardar(cambios.map((k) => aCambioApi(k, asignaciones[k] ?? '')), motivo);
    if (!resultado) return;
    setResumenAbierto(false);
    mostrarToast(
      `${resultado.cambios === 1 ? '1 asignación guardada' : `${resultado.cambios} asignaciones guardadas`} · edición ${formatoEdicion(resultado.edicionId)}`,
      'success',
    );
    // Recargar trae las especiales recién creadas con su id real.
    recargar();
  }

  const especialesNuevas = cambios.filter((k) => asignaciones[k]?.startsWith('n')).length;
  const totalAsignaciones = Object.keys(guardadas).length;
  const enPiloto = Object.values(guardadas).filter((v) => versiones.get(Number(v.slice(1)))?.estado === 'piloto').length;

  const aviso = useMemo<Aviso | null>(() => {
    if (!contexto || !planogramaContexto) return null;
    const conteo = tiendasTexto(tiendasDeLaVersion);
    if (modo === 'promover' && promocion) {
      const anterior = pilotoQueSeArchiva(planogramaContexto, promocion);
      return {
        variante: 'piloto',
        titulo: `Promover ${promocion.codigo} a piloto`,
        texto: `Pinta con ${etiquetaPincelPiloto(promocion)} las tiendas donde se probará y guarda. La versión pasa a piloto al guardar con al menos una tienda.`,
        conteo: tiendasDeLaVersion === 0 ? 'Sin tiendas' : conteo,
        nota: anterior
          ? `Al guardar se archiva ${anterior.codigo}, el piloto actual de este tipo; sus tiendas que no pases al nuevo vuelven a la versión publicada.`
          : null,
        textoVolver: 'Cancelar',
      };
    }
    if (modo === 'piloto' && versionContexto) {
      return recienPromovida
        ? {
            variante: 'listo',
            titulo: `${versionContexto.codigo} ya está en piloto`,
            texto: 'Puedes seguir ajustando sus tiendas piloto aquí o volver al planograma.',
            conteo,
            textoVolver: 'Volver al planograma',
          }
        : {
            variante: 'piloto',
            titulo: `Tiendas piloto de ${versionContexto.codigo}`,
            texto: `Pinta con ${etiquetaPincelPiloto(versionContexto)} para sumar tiendas; para sacar una, píntala con su versión publicada o con Quitar. Debe quedar al menos una.`,
            conteo,
            textoVolver: 'Volver al planograma',
          };
    }
    const usan = Object.keys(guardadas).filter((k) => k.startsWith(`${planogramaContexto.id}|`)).length;
    return {
      variante: 'filtro',
      titulo: `Estructura de ${planogramaContexto.nombre}`,
      texto: 'Filtrada a este planograma con todas las tiendas. Asigna versiones o revisa cómo quedó; quita el filtro para ver los demás planogramas.',
      conteo: `${usan} de ${tiendasTexto(matriz?.tiendas.length ?? 0)}`,
      textoVolver: 'Volver al planograma',
    };
  }, [contexto, planogramaContexto, modo, promocion, versionContexto, recienPromovida, tiendasDeLaVersion, guardadas, matriz]);

  const menuDescripcion = menu ? describirCelda(asignaciones[clave(menu.planograma.id, menu.tienda.id)], menu.tienda, versiones) : null;
  // Las fotos del montaje cuelgan de la versión guardada en la tienda, no de un cambio sin guardar.
  const menuMontaje = menu ? describirCelda(guardadas[clave(menu.planograma.id, menu.tienda.id)], menu.tienda, versiones) : null;

  return (
    <div className={`estructura-asignacion${extendida ? ' estructura-asignacion--extendida' : ''}`}>
      {!extendida && <AppTopbar titulo="Estructura" />}

      <div className="estructura-asignacion__contenido">
        {!extendida && aviso && contexto && (
          <AvisoContextoEstructura {...aviso} volverA={`/planogramas/${contexto.planogramaId}`} />
        )}

        {!extendida && !aviso && (
          <div className="estructura-asignacion__cabecera">
            <span className="estructura-asignacion__eyebrow">Estructura de surtido</span>
            <div className="estructura-asignacion__titulo">
              <h1>¿Qué versión usa cada tienda?</h1>
              {matriz && (
                <span>
                  {matriz.planogramas.length} planogramas activos · {matriz.tiendas.length} tiendas · {totalAsignaciones} asignaciones, {enPiloto} en piloto
                </span>
              )}
            </div>
          </div>
        )}

        <BarraAsignacion
          pincel={pincel}
          modoPiloto={modoPiloto}
          editable={puedeEscribir}
          filtros={filtros}
          departamentos={departamentos}
          planogramas={opcionesPlanogramas}
          tiendas={matriz?.tiendas ?? []}
          tiendasPorPlanograma={{ porId: tiendasPorPlanograma, singular: 'tienda', plural: 'tiendas' }}
          planogramasPorTienda={{ porId: planogramasPorTienda, singular: 'planograma', plural: 'planogramas' }}
          pincelesPermitidos={promocion ? [pincelDeVersion(promocion), 'QUITAR'] : undefined}
          modoFijo={Boolean(promocion)}
          onPincel={setPincel}
          onModoPiloto={setModoPiloto}
          onFiltros={(parciales) => setFiltros((f) => ({ ...f, ...parciales }))}
        />

        {cargando && !matriz && <p className="estructura-asignacion__cargando">Cargando estructura…</p>}

        {matriz && matriz.planogramas.length === 0 && (
          <EmptyState titulo="No hay planogramas con versiones publicadas o en piloto" hint="Publica una versión desde el detalle del planograma para asignarla a tiendas." />
        )}

        {matriz && matriz.planogramas.length > 0 && planogramasVisibles.length === 0 && (
          <EmptyState titulo="Ningún planograma coincide con los filtros" />
        )}

        {matriz && planogramasVisibles.length > 0 && tiendasVisibles.length === 0 && (
          <EmptyState titulo="Ninguna tienda coincide con los filtros" />
        )}

        {matriz && planogramasVisibles.length > 0 && tiendasVisibles.length > 0 && (
          <MatrizAsignaciones
            planogramas={planogramasVisibles}
            tiendas={tiendasVisibles}
            totalPlanogramas={matriz.planogramas.length}
            totalTiendas={matriz.tiendas.length}
            asignaciones={asignaciones}
            guardadas={guardadas}
            versiones={versiones}
            resolver={resolver}
            editable={puedeEscribir}
            onPintar={pintar}
            onTerminarTrazo={terminarTrazo}
            onMenu={abrirMenu}
            extendida={extendida}
            onAlternarExtendida={alternarExtendida}
          />
        )}

        {puedeEscribir && matriz && (
          <BarraCambiosAsignacion
            cambios={cambios.length}
            especialesNuevas={especialesNuevas}
            puedeDeshacer={pilaDeshacer.length > 0}
            onDeshacer={deshacer}
            onDescartar={descartar}
            onGuardar={pedirGuardado}
          />
        )}
      </div>

      {menu && menuDescripcion && (
        <MenuCeldaAsignacion
          x={menu.x}
          y={menu.y}
          planograma={menu.planograma.nombre}
          tienda={menu.tienda.codigo}
          estado={textoCelda(menuDescripcion, menu.tienda)}
          motivoSinVersion={
            menuDescripcion.vacia ? 'La tienda no usa este planograma' : menuDescripcion.esNueva ? 'La especial se crea al guardar' : null
          }
          motivoSinMontaje={menuMontaje?.version ? null : 'La tienda no tiene este planograma montado'}
          onHistorial={() => {
            setCeldaHistorial({ planograma: menu.planograma, tienda: menu.tienda });
            setMenu(null);
          }}
          onVerVersion={() => {
            if (menuDescripcion.version) setVersionAbierta({ versionId: menuDescripcion.version.id, tienda: menu.tienda });
            setMenu(null);
          }}
          onMontaje={() => {
            if (menuMontaje?.version) setMontajeAbierto({ planograma: menu.planograma, tienda: menu.tienda, version: menuMontaje.version });
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}

      {resumenAbierto && cambios.length > 0 && (
        <ResumenAsignacionModal
          cambios={resumenCambios}
          enviando={enviando || promoviendo}
          onConfirmar={confirmarGuardado}
          onClose={() => setResumenAbierto(false)}
        />
      )}

      {celdaHistorial && (() => {
        const k = clave(celdaHistorial.planograma.id, celdaHistorial.tienda.id);
        const guardada = describirCelda(guardadas[k], celdaHistorial.tienda, versiones);
        const actual = describirCelda(asignaciones[k], celdaHistorial.tienda, versiones);
        const chip = (d: typeof actual) => ({ texto: textoCelda(d, celdaHistorial.tienda), variante: varianteDeCelda(d) });
        return (
          <HistorialAsignacionModal
            planograma={celdaHistorial.planograma}
            tienda={celdaHistorial.tienda}
            versiones={versiones}
            actual={chip(guardada)}
            pendiente={(asignaciones[k] ?? '') !== (guardadas[k] ?? '') ? { antes: chip(guardada), despues: chip(actual) } : null}
            onClose={() => setCeldaHistorial(null)}
          />
        );
      })()}

      {versionAbierta && (
        <VersionResumenModal
          versionId={versionAbierta.versionId}
          tienda={versionAbierta.tienda}
          onClose={() => setVersionAbierta(null)}
        />
      )}

      {montajeAbierto && (
        <MontajeTiendaModal
          planograma={montajeAbierto.planograma}
          version={montajeAbierto.version}
          tienda={montajeAbierto.tienda}
          onClose={() => setMontajeAbierto(null)}
        />
      )}
    </div>
  );
}
