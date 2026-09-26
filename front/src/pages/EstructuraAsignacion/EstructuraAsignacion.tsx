import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { BarraAsignacion, type FiltrosEstructura } from '../../components/dominio/estructura/BarraAsignacion/BarraAsignacion';
import { MatrizAsignaciones } from '../../components/dominio/estructura/MatrizAsignaciones/MatrizAsignaciones';
import { BarraCambiosAsignacion } from '../../components/dominio/estructura/BarraCambiosAsignacion/BarraCambiosAsignacion';
import { MenuCeldaAsignacion } from '../../components/dominio/estructura/MenuCeldaAsignacion/MenuCeldaAsignacion';
import { ResumenAsignacionModal, type CambioResumen } from '../../components/dominio/modales/ResumenAsignacionModal/ResumenAsignacionModal';
import { HistorialAsignacionModal } from '../../components/dominio/modales/HistorialAsignacionModal/HistorialAsignacionModal';
import { VersionResumenModal } from '../../components/dominio/modales/VersionResumenModal/VersionResumenModal';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { useGuardarEdicion, useMatrizAsignaciones } from '../../hooks/useAsignaciones';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  aCambioApi,
  clave,
  clavesCambiadas,
  describirCelda,
  formatoEdicion,
  grupoDeCambio,
  indexarVersiones,
  mapaInicial,
  resolverPincel,
  textoCelda,
  varianteDeCelda,
  type MapaAsignaciones,
  type Pincel,
} from '../../domain/estructura/asignaciones';
import type { PlanogramaMatriz, TiendaMatriz } from '../../types/asignacion';
import './EstructuraAsignacion.css';

const FILTROS_INICIALES: FiltrosEstructura = { busqueda: '', departamento: '', tipoTienda: '' };

interface MenuAbierto {
  planograma: PlanogramaMatriz;
  tienda: TiendaMatriz;
  x: number;
  y: number;
}

type CeldaAbierta = { planograma: PlanogramaMatriz; tienda: TiendaMatriz };

export function EstructuraAsignacion() {
  const { puedeEscribir } = useAuth();
  const { mostrarToast } = useToast();
  const { matriz, cargando, recargar } = useMatrizAsignaciones();
  const { guardar, enviando } = useGuardarEdicion();

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

  // Avisar antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (cambios.length === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [cambios.length]);

  const tiendasVisibles = useMemo(
    () => (matriz?.tiendas ?? []).filter((t) => !filtros.tipoTienda || t.tipo === filtros.tipoTienda),
    [matriz, filtros.tipoTienda],
  );
  const planogramasVisibles = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return (matriz?.planogramas ?? []).filter(
      (p) => (!filtros.departamento || p.departamento === filtros.departamento) && (!q || p.nombre.toLowerCase().includes(q)),
    );
  }, [matriz, filtros.busqueda, filtros.departamento]);
  const departamentos = useMemo(
    () => [...new Set((matriz?.planogramas ?? []).map((p) => p.departamento))].sort((a, b) => a.localeCompare(b, 'es')),
    [matriz],
  );

  const pintar = useCallback(
    (p: PlanogramaMatriz, t: TiendaMatriz, inicioDeTrazo: boolean) => {
      if (inicioDeTrazo) trazoApilado.current = false;
      const resultado = resolverPincel(pincel, modoPiloto, p, t);
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
    [pincel, modoPiloto],
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

  async function confirmarGuardado(motivo: string) {
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

  const menuDescripcion = menu ? describirCelda(asignaciones[clave(menu.planograma.id, menu.tienda.id)], menu.tienda, versiones) : null;

  return (
    <div className="estructura-asignacion">
      <AppTopbar titulo="Estructura" />

      <div className="estructura-asignacion__contenido">
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

        <BarraAsignacion
          pincel={pincel}
          modoPiloto={modoPiloto}
          editable={puedeEscribir}
          filtros={filtros}
          departamentos={departamentos}
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

        {matriz && planogramasVisibles.length > 0 && (
          <MatrizAsignaciones
            planogramas={planogramasVisibles}
            tiendas={tiendasVisibles}
            totalPlanogramas={matriz.planogramas.length}
            totalTiendas={matriz.tiendas.length}
            asignaciones={asignaciones}
            guardadas={guardadas}
            versiones={versiones}
            pincel={pincel}
            modoPiloto={modoPiloto}
            editable={puedeEscribir}
            onPintar={pintar}
            onTerminarTrazo={terminarTrazo}
            onMenu={abrirMenu}
          />
        )}

        {puedeEscribir && matriz && (
          <BarraCambiosAsignacion
            cambios={cambios.length}
            especialesNuevas={especialesNuevas}
            puedeDeshacer={pilaDeshacer.length > 0}
            onDeshacer={deshacer}
            onDescartar={descartar}
            onGuardar={() => setResumenAbierto(true)}
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
          onHistorial={() => {
            setCeldaHistorial({ planograma: menu.planograma, tienda: menu.tienda });
            setMenu(null);
          }}
          onVerVersion={() => {
            if (menuDescripcion.version) setVersionAbierta({ versionId: menuDescripcion.version.id, tienda: menu.tienda });
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}

      {resumenAbierto && cambios.length > 0 && (
        <ResumenAsignacionModal
          cambios={resumenCambios}
          enviando={enviando}
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
    </div>
  );
}
