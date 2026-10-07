import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { SinTiendaElegida } from '../../components/dominio/implementacion/SinTiendaElegida/SinTiendaElegida';
import { ProductosImplementacionTable } from '../../components/dominio/implementacion/ProductosImplementacionTable/ProductosImplementacionTable';
import { PanelColumnas } from '../../components/dominio/implementacion/PanelColumnas/PanelColumnas';
import { SeleccionVersionesModal } from '../../components/dominio/implementacion/SeleccionVersionesModal/SeleccionVersionesModal';
import { ArchivosVersionModal } from '../../components/dominio/implementacion/ArchivosVersionModal/ArchivosVersionModal';
import { EvidenciaModal } from '../../components/dominio/implementacion/EvidenciaModal/EvidenciaModal';
import { FichaProductoModal } from '../../components/dominio/modales/FichaProductoModal/FichaProductoModal';
import { EstadoVersionBadge } from '../../components/dominio/implementacion/EstadoVersionBadge/EstadoVersionBadge';
import { ImplementableBadge } from '../../components/dominio/implementacion/ImplementableBadge/ImplementableBadge';
import { BotonArchivos, BotonEvidencia } from '../../components/dominio/implementacion/AccionesVersion/AccionesVersion';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { useTiendaImplementador } from '../../context/TiendaImplementadorContext';
import { useToast } from '../../context/ToastContext';
import { useProductosImplementacion, useResumenImplementacion } from '../../hooks/useImplementacion';
import { usePreferenciasColumnas } from '../../hooks/usePreferenciasColumnas';
import { ESTADO_VERSION_IMPLEMENTACION_META } from '../../constants/implementacion';
import {
  CLAVES_COLUMNA,
  PREFERENCIAS_INICIALES,
  alternarOrden,
  alternarVisibilidad,
  columnaProducto,
  columnasVisibles,
  filtrarProductos,
  filtrosInvalidos,
  moverColumna,
  ordenarProductos,
  soltarColumna,
  type ClaveColumna,
  type FiltrosColumna,
} from '../../domain/implementacion/columnasProductos';
import { resumirOrden } from '../../domain/orden/ordenAnidado';
import { parsearIdsVersiones, textoPorcentaje } from '../../domain/implementacion/miTienda';
import { textoConteo, textoHaceTiempo } from '../../utils/formatters';
import type { PlanogramaImplementacion, TiendaImplementador } from '../../types/implementacion';
import './ProductosTienda.css';

const ID_PANEL_COLUMNAS = 'panel-columnas-productos';

type ModalAbierto =
  | { tipo: 'versiones' }
  | { tipo: 'archivos' | 'evidencia'; planograma: PlanogramaImplementacion }
  | { tipo: 'ficha'; sku: string }
  | null;

export function ProductosTienda() {
  const { tienda } = useTiendaImplementador();
  const { mostrarToast } = useToast();
  const [extendida, setExtendida] = useState(false);

  // Vista extendida: sin barra superior ni título; la tabla usa todo el alto y ancho de la pantalla.
  const alternarExtendida = useCallback(() => {
    mostrarToast(extendida ? 'Vista normal' : 'Vista extendida · Esc para salir');
    setExtendida(!extendida);
  }, [extendida, mostrarToast]);

  // Esc sale de la vista extendida, salvo que lo esté usando un modal o el panel de columnas.
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

  return (
    <div className={`productos-tienda${extendida ? ' productos-tienda--extendida' : ''}`}>
      {!extendida && <AppTopbar titulo="Productos" />}
      <main className="productos-tienda__contenido">
        {tienda ? (
          <ContenidoProductos
            key={tienda.id}
            tienda={tienda}
            extendida={extendida}
            onAlternarExtendida={alternarExtendida}
          />
        ) : (
          <SinTiendaElegida />
        )}
      </main>
    </div>
  );
}

interface ContenidoProductosProps {
  tienda: TiendaImplementador;
  extendida: boolean;
  onAlternarExtendida: () => void;
}

function ContenidoProductos({ tienda, extendida, onAlternarExtendida }: ContenidoProductosProps) {
  const { resumen, recargar: recargarResumen } = useResumenImplementacion(tienda.id);
  const { productos, cargando } = useProductosImplementacion(tienda.id);
  const { prefs, actualizar } = usePreferenciasColumnas();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<FiltrosColumna>({});
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [modal, setModal] = useState<ModalAbierto>(null);

  const versionesAsignadas = useMemo(() => resumen?.planogramas ?? [], [resumen]);
  const idsEnUrl = useMemo(() => parsearIdsVersiones(searchParams.get('versiones')), [searchParams]);

  const cambiarVersiones = useCallback(
    (ids: number[], reemplazar = false) => {
      setSearchParams(
        (actual) => {
          const siguiente = new URLSearchParams(actual);
          if (ids.length) siguiente.set('versiones', ids.join(','));
          else siguiente.delete('versiones');
          return siguiente;
        },
        { replace: reemplazar },
      );
    },
    [setSearchParams],
  );

  // Una versión del link que ya no está asignada a la tienda se quita del filtro.
  useEffect(() => {
    if (!resumen || idsEnUrl.length === 0) return;
    const asignadas = new Set(resumen.planogramas.map((p) => p.versionId));
    const validas = idsEnUrl.filter((id) => asignadas.has(id));
    if (validas.length !== idsEnUrl.length) cambiarVersiones(validas, true);
  }, [resumen, idsEnUrl, cambiarVersiones]);

  const seleccionadas = useMemo(() => {
    const porId = new Map(versionesAsignadas.map((v) => [v.versionId, v]));
    return idsEnUrl.map((id) => porId.get(id)).filter((v): v is PlanogramaImplementacion => Boolean(v));
  }, [versionesAsignadas, idsEnUrl]);

  const visibles = useMemo(() => columnasVisibles(prefs), [prefs]);
  const invalidos = useMemo(() => filtrosInvalidos(filtros), [filtros]);

  const filas = useMemo(() => {
    const todas = productos?.data ?? [];
    const elegidas = new Set(idsEnUrl);
    const porVersion = elegidas.size ? todas.filter((f) => elegidas.has(f.versionId)) : todas;
    return ordenarProductos(filtrarProductos(porVersion, busqueda, filtros), prefs.criterios);
  }, [productos, idsEnUrl, busqueda, filtros, prefs.criterios]);

  const hayFiltros = busqueda.trim() !== '' || idsEnUrl.length > 0 || Object.values(filtros).some((v) => v?.trim());
  const inventarioDisponible = productos?.inventarioDisponible ?? true;

  function limpiarFiltros() {
    setBusqueda('');
    setFiltros({});
    cambiarVersiones([]);
  }

  function filtrarColumna(clave: ClaveColumna, valor: string) {
    setFiltros((actual) => {
      const siguiente = { ...actual };
      if (valor) siguiente[clave] = valor;
      else delete siguiente[clave];
      return siguiente;
    });
  }

  // Ocultar una columna también quita su filtro (el criterio de orden lo quita alternarVisibilidad).
  function alternarColumna(clave: ClaveColumna) {
    const siguiente = alternarVisibilidad(prefs, clave);
    if (siguiente === prefs) return;
    actualizar(() => siguiente);
    if (siguiente.ocultas.includes(clave)) filtrarColumna(clave, '');
  }

  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);

  function cerrarModal() {
    const eraEvidencia = modal?.tipo === 'evidencia';
    setModal(null);
    if (eraEvidencia) recargarResumen();
  }

  const ayudaExtendida = extendida ? 'Salir de la vista extendida' : 'Vista extendida: la tabla ocupa toda la pantalla';

  const unica = seleccionadas.length === 1 ? seleccionadas[0] : null;
  const textoSeleccion =
    seleccionadas.length === 0
      ? 'Todos los de mi tienda'
      : unica
        ? `${unica.codigo} · ${unica.nombre}`
        : seleccionadas.map((v) => v.codigo).join(', ');

  return (
    <>
      {!extendida && (
        <div className="productos-tienda__cabecera">
          <div className="productos-tienda__titulos">
            <nav aria-label="Ruta" className="productos-tienda__ruta">
              <Link to="/mi-tienda">Mi tienda</Link>
              <span aria-hidden="true">›</span>
              <span aria-current="page">Productos</span>
            </nav>
            <h1 className="productos-tienda__titulo">Productos</h1>
            <div className="productos-tienda__resumen">
              <span className="productos-tienda__conteo">
                {cargando && !productos ? 'Cargando…' : textoConteo(filas.length, 'producto', 'productos')}
              </span>
              {prefs.criterios.length > 0 && (
                <>
                  <span className="productos-tienda__orden">
                    Ordenado por <strong>{resumirOrden(prefs.criterios, (c) => columnaProducto(c).etiqueta)}</strong>
                  </span>
                  <button
                    type="button"
                    className="productos-tienda__enlace"
                    onClick={() => actualizar((p) => ({ ...p, criterios: [] }))}
                  >
                    Restablecer orden
                  </button>
                </>
              )}
            </div>
          </div>
          <span className="productos-tienda__nota">
            Inventario en tienda {tienda.nombre} · solo lectura
            {productos?.inventarioActualizadoEn && ` · actualizado ${textoHaceTiempo(productos.inventarioActualizadoEn)}`}
          </span>
        </div>
      )}

      {productos && !inventarioDisponible && (
        <div className="productos-tienda__advertencia" role="status">
          <strong>{productos.advertencia ?? 'Inventario no disponible en este momento'}.</strong> Las columnas
          Inventario y Estado se muestran vacías.
        </div>
      )}

      {productos && inventarioDisponible && productos.inventarioDesactualizado && (
        <div className="productos-tienda__advertencia" role="status">
          <strong>{productos.advertencia ?? 'No se pudo actualizar el inventario'}.</strong> Las columnas Inventario y
          Estado corresponden a la última consulta
          {productos.inventarioActualizadoEn && ` (${textoHaceTiempo(productos.inventarioActualizadoEn)})`}.
        </div>
      )}

      <div className="productos-tienda__barra">
        <label className="productos-tienda__campo productos-tienda__campo--busqueda">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="SKU, nombre o marca"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        <div className="productos-tienda__campo productos-tienda__campo--version">
          <span id="etiqueta-version-productos">Planograma versión</span>
          <button
            type="button"
            className={`productos-tienda__selector${seleccionadas.length ? ' productos-tienda__selector--activo' : ''}`}
            aria-labelledby="etiqueta-version-productos"
            aria-describedby="valor-version-productos"
            aria-haspopup="dialog"
            onClick={() => {
              setPanelAbierto(false);
              setModal({ tipo: 'versiones' });
            }}
          >
            <span id="valor-version-productos" className="productos-tienda__selector-texto" title={textoSeleccion}>
              {textoSeleccion}
            </span>
            {seleccionadas.length > 1 && (
              <span className="productos-tienda__selector-conteo">{seleccionadas.length}</span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>

        {hayFiltros && (
          <button type="button" className="productos-tienda__enlace productos-tienda__limpiar" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}

        <button
          type="button"
          className="productos-tienda__columnas"
          aria-expanded={panelAbierto}
          aria-controls={ID_PANEL_COLUMNAS}
          onClick={() => setPanelAbierto((abierto) => !abierto)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16v16H4z" />
            <path d="M9.5 4v16M14.5 4v16" />
          </svg>
          Columnas
          <span className="productos-tienda__columnas-conteo">
            {visibles.length} de {CLAVES_COLUMNA.length}
          </span>
        </button>

        <button
          type="button"
          className="productos-tienda__columnas productos-tienda__extender"
          title={ayudaExtendida}
          aria-label={ayudaExtendida}
          aria-pressed={extendida}
          onClick={onAlternarExtendida}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={extendida ? 'M4 10h6V4M10 10L3 3M20 14h-6v6M14 14l7 7' : 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7'} />
          </svg>
          {extendida ? 'Salir' : 'Extender'}
        </button>

        {panelAbierto && (
          <PanelColumnas
            id={ID_PANEL_COLUMNAS}
            prefs={prefs}
            onAlternar={alternarColumna}
            onMover={(clave, delta) => actualizar((p) => ({ ...p, orden: moverColumna(p.orden, clave, delta) }))}
            onSoltar={(desde, hacia) => actualizar((p) => ({ ...p, orden: soltarColumna(p.orden, desde, hacia) }))}
            onMostrarTodas={() => actualizar((p) => ({ ...p, ocultas: [] }))}
            onRestablecer={() =>
              actualizar((p) => ({ ...p, orden: PREFERENCIAS_INICIALES.orden, ocultas: PREFERENCIAS_INICIALES.ocultas }))
            }
            onCerrar={cerrarPanel}
          />
        )}
      </div>

      {seleccionadas.length > 1 && (
        <div className="productos-tienda__chips">
          <span className="productos-tienda__chips-titulo">Mostrando productos de:</span>
          {seleccionadas.map((v) => (
            <span key={v.versionId} className="productos-tienda__chip">
              <span className="productos-tienda__chip-codigo">{v.codigo}</span>
              <span
                className="productos-tienda__chip-estado"
                style={{ color: ESTADO_VERSION_IMPLEMENTACION_META[v.estado]?.color }}
              >
                {ESTADO_VERSION_IMPLEMENTACION_META[v.estado]?.label ?? v.estado}
              </span>
              <button
                type="button"
                className="productos-tienda__chip-quitar"
                aria-label={`Quitar ${v.codigo} del filtro`}
                onClick={() => cambiarVersiones(idsEnUrl.filter((id) => id !== v.versionId))}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {unica && (
        <div className="productos-tienda__franja">
          <div className="productos-tienda__franja-datos">
            <span className="productos-tienda__franja-nombre">{unica.nombre}</span>
            <span className="productos-tienda__franja-codigo">{unica.codigo}</span>
            <EstadoVersionBadge estado={unica.estado} />
            <span className="productos-tienda__franja-inventario">
              {textoConteo(unica.totalProductos, 'producto', 'productos')} ·{' '}
              {resumen?.inventarioDisponible && unica.conInventario !== null && unica.porcentajeInventario !== null
                ? `${unica.conInventario} con inventario (${textoPorcentaje(unica.porcentajeInventario)})`
                : 'inventario no disponible'}
            </span>
            <ImplementableBadge
              implementable={resumen?.inventarioDisponible ? unica.implementable : null}
              prefijo="Se puede implementar: "
            />
          </div>
          <div className="productos-tienda__franja-acciones">
            <BotonArchivos planograma={unica} onClick={() => setModal({ tipo: 'archivos', planograma: unica })} />
            <BotonEvidencia planograma={unica} onClick={() => setModal({ tipo: 'evidencia', planograma: unica })} />
          </div>
        </div>
      )}

      {cargando && !productos ? (
        <p className="productos-tienda__cargando">Cargando productos…</p>
      ) : !productos ? null : productos.data.length === 0 ? (
        <EmptyState
          titulo="Tu tienda no tiene productos en planogramas"
          hint="Aparecerán cuando tenga versiones asignadas con productos."
        />
      ) : (
        <ProductosImplementacionTable
          filas={filas}
          columnas={visibles}
          orden={prefs.criterios}
          filtros={filtros}
          filtrosInvalidos={invalidos}
          onOrdenar={(clave) => actualizar((p) => ({ ...p, criterios: alternarOrden(p.criterios, clave) }))}
          onFiltrar={filtrarColumna}
          onMoverColumna={(desde, hacia) => actualizar((p) => ({ ...p, orden: soltarColumna(p.orden, desde, hacia) }))}
          extendida={extendida}
          onAbrirProducto={(fila) => {
            setPanelAbierto(false);
            setModal({ tipo: 'ficha', sku: fila.sku });
          }}
          vacio={<EmptyState titulo="No hay productos con esos filtros" hint="Ajusta o limpia los filtros." />}
        />
      )}

      {modal?.tipo === 'versiones' && (
        <SeleccionVersionesModal
          tiendaNombre={tienda.nombre}
          versiones={versionesAsignadas}
          seleccionadas={idsEnUrl}
          onAplicar={(ids) => {
            cambiarVersiones(ids);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'ficha' && <FichaProductoModal sku={modal.sku} tienda={tienda} onClose={() => setModal(null)} />}
      {modal?.tipo === 'archivos' && <ArchivosVersionModal planograma={modal.planograma} onClose={cerrarModal} />}
      {modal?.tipo === 'evidencia' && (
        <EvidenciaModal tienda={tienda} planograma={modal.planograma} onClose={cerrarModal} />
      )}
    </>
  );
}
