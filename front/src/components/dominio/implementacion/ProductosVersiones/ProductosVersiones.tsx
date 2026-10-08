import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppTopbar } from '../../layout/AppTopbar/AppTopbar';
import { ProductosImplementacionTable } from '../ProductosImplementacionTable/ProductosImplementacionTable';
import { PanelColumnas } from '../PanelColumnas/PanelColumnas';
import { SeleccionVersionesModal, type TextosSeleccionVersiones } from '../SeleccionVersionesModal/SeleccionVersionesModal';
import { ArchivosVersionModal } from '../ArchivosVersionModal/ArchivosVersionModal';
import { EvidenciaModal } from '../EvidenciaModal/EvidenciaModal';
import { FichaProductoModal } from '../../modales/FichaProductoModal/FichaProductoModal';
import { EstadoVersionBadge } from '../EstadoVersionBadge/EstadoVersionBadge';
import { ImplementableBadge } from '../ImplementableBadge/ImplementableBadge';
import { BotonArchivos, BotonEvidencia } from '../AccionesVersion/AccionesVersion';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { Button } from '../../../ui/Button/Button';
import { ESTADO_META } from '../../EstadoBadge/EstadoBadge';
import { useToast } from '../../../../context/ToastContext';
import { ESTADO_VERSION_IMPLEMENTACION_META } from '../../../../constants/implementacion';
import { usePreferenciasColumnas } from '../../../../hooks/usePreferenciasColumnas';
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
} from '../../../../domain/implementacion/columnasProductos';
import { resumirOrden } from '../../../../domain/orden/ordenAnidado';
import { parsearIdsVersiones, textoPorcentaje } from '../../../../domain/implementacion/miTienda';
import { textoConteo, textoHaceTiempo } from '../../../../utils/formatters';
import type {
  EstadoInventario,
  EstadoVersionImplementacion,
  ProductoImplementacion,
  ResumenVersion,
  TiendaImplementador,
  VersionElegible,
} from '../../../../types/implementacion';
import './ProductosVersiones.css';

const ID_PANEL_COLUMNAS = 'panel-columnas-productos';

function metaEstado(estado: string) {
  return ESTADO_VERSION_IMPLEMENTACION_META[estado as EstadoVersionImplementacion] ?? ESTADO_META[estado] ?? { label: estado, color: 'var(--fg-2)' };
}

// ─── Página ──────────────────────────────────────────────────────────────────

interface ProductosVersionesPaginaProps {
  titulo: string;
  children: (vista: { extendida: boolean; alternarExtendida: () => void }) => ReactNode;
}

/**
 * Marco de página de la tabla de productos por versión (Productos del Implementador y Por versión
 * del Analista): barra superior y vista extendida, en la que la tabla usa toda la pantalla.
 */
export function ProductosVersionesPagina({ titulo, children }: ProductosVersionesPaginaProps) {
  const { mostrarToast } = useToast();
  const [extendida, setExtendida] = useState(false);

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
    <div className={`productos-versiones-pagina${extendida ? ' productos-versiones-pagina--extendida' : ''}`}>
      {!extendida && <AppTopbar titulo={titulo} />}
      <main className="productos-versiones-pagina__contenido">{children({ extendida, alternarExtendida })}</main>
    </div>
  );
}

// ─── Contenido ───────────────────────────────────────────────────────────────

/** Filas y marca de inventario: lo común entre la respuesta del Implementador y la de Por versión. */
type ProductosDeVersiones = EstadoInventario & { data: ProductoImplementacion[] };

type ModalAbierto =
  | { tipo: 'versiones' }
  | { tipo: 'archivos' | 'evidencia'; version: ResumenVersion }
  | { tipo: 'ficha'; sku: string }
  | null;

interface ProductosVersionesProps {
  /** Tienda cuyo inventario se muestra. `null`: Inventario y Estado quedan en "—". */
  tienda: TiendaImplementador | null;
  /** Versiones del selector; `null` mientras cargan. */
  versiones: VersionElegible[] | null;
  /** Resumen de cada versión para la franja (adjuntos, inventario, evidencia, montaje). */
  resumenes: ResumenVersion[];
  productos: ProductosDeVersiones | null;
  cargando: boolean;
  /**
   * Implementador: sin versiones elegidas se ven todos los productos de la tienda.
   * Por versión: hay que elegir al menos una (son las de toda la cadena).
   */
  requiereSeleccion: boolean;
  ruta: { etiqueta: string; a?: string }[];
  titulo: string;
  /** Controles propios de la vista en la cabecera (ej. el selector de tienda de Por versión). */
  controles?: ReactNode;
  textosSelector: TextosSeleccionVersiones;
  /** Texto del selector sin versiones elegidas. */
  textoSinSeleccion: string;
  /** Estado vacío cuando las versiones no tienen ningún producto. */
  vacio: { titulo: string; hint: string };
  extendida: boolean;
  onAlternarExtendida: () => void;
  /** Al cerrar la evidencia se recargan sus conteos. */
  onEvidenciaCerrada: () => void;
}

/**
 * Tabla de productos de una o varias versiones de planograma: filtro por versión (en la URL,
 * `?versiones=`), búsqueda, columnas configurables, franja de la versión y ficha de producto. La
 * comparten Productos del Implementador (tienda fija) y Por versión del Analista (tienda opcional):
 * cualquier cambio aquí aplica a las dos.
 */
export function ProductosVersiones({
  tienda,
  versiones,
  resumenes,
  productos,
  cargando,
  requiereSeleccion,
  ruta,
  titulo,
  controles,
  textosSelector,
  textoSinSeleccion,
  vacio,
  extendida,
  onAlternarExtendida,
  onEvidenciaCerrada,
}: ProductosVersionesProps) {
  const { prefs, actualizar } = usePreferenciasColumnas();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<FiltrosColumna>({});
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [modal, setModal] = useState<ModalAbierto>(null);

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

  // Una versión del link que ya no está entre las elegibles se quita del filtro.
  useEffect(() => {
    if (!versiones || idsEnUrl.length === 0) return;
    const elegibles = new Set(versiones.map((v) => v.versionId));
    const validas = idsEnUrl.filter((id) => elegibles.has(id));
    if (validas.length !== idsEnUrl.length) cambiarVersiones(validas, true);
  }, [versiones, idsEnUrl, cambiarVersiones]);

  const seleccionadas = useMemo(() => {
    const porId = new Map((versiones ?? []).map((v) => [v.versionId, v]));
    return idsEnUrl.map((id) => porId.get(id)).filter((v): v is VersionElegible => Boolean(v));
  }, [versiones, idsEnUrl]);

  const resumenPorId = useMemo(() => new Map(resumenes.map((r) => [r.versionId, r])), [resumenes]);

  const visibles = useMemo(() => columnasVisibles(prefs), [prefs]);
  const invalidos = useMemo(() => filtrosInvalidos(filtros), [filtros]);

  const filas = useMemo(() => {
    const todas = productos?.data ?? [];
    const elegidas = new Set(idsEnUrl);
    const porVersion = elegidas.size ? todas.filter((f) => elegidas.has(f.versionId)) : todas;
    return ordenarProductos(filtrarProductos(porVersion, busqueda, filtros), prefs.criterios);
  }, [productos, idsEnUrl, busqueda, filtros, prefs.criterios]);

  // En Por versión la selección de versiones no es un filtro que se limpie: es lo que se consulta.
  const hayFiltros =
    busqueda.trim() !== '' ||
    (!requiereSeleccion && idsEnUrl.length > 0) ||
    Object.values(filtros).some((v) => v?.trim());
  const inventarioDisponible = productos?.inventarioDisponible ?? true;
  const faltaSeleccion = requiereSeleccion && idsEnUrl.length === 0;

  function limpiarFiltros() {
    setBusqueda('');
    setFiltros({});
    if (!requiereSeleccion) cambiarVersiones([]);
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

  function abrirSelector() {
    setPanelAbierto(false);
    setModal({ tipo: 'versiones' });
  }

  function cerrarModal() {
    const eraEvidencia = modal?.tipo === 'evidencia';
    setModal(null);
    if (eraEvidencia) onEvidenciaCerrada();
  }

  const ayudaExtendida = extendida ? 'Salir de la vista extendida' : 'Vista extendida: la tabla ocupa toda la pantalla';

  const botonExtender = (
    <button
      type="button"
      className={`productos-versiones__boton productos-versiones__extender${extendida ? ' productos-versiones__extender--flotante' : ''}`}
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
  );

  const unica = seleccionadas.length === 1 ? (resumenPorId.get(seleccionadas[0].versionId) ?? null) : null;
  const textoSeleccion =
    seleccionadas.length === 0
      ? textoSinSeleccion
      : seleccionadas.length === 1
        ? `${seleccionadas[0].codigo} · ${seleccionadas[0].nombre}`
        : seleccionadas.map((v) => v.codigo).join(', ');

  return (
    <>
      {!extendida && (
        <div className="productos-versiones__cabecera">
          <div className="productos-versiones__titulos">
            <nav aria-label="Ruta" className="productos-versiones__ruta">
              {ruta.map((paso, i) => (
                <span key={paso.etiqueta} className="productos-versiones__paso">
                  {i > 0 && <span aria-hidden="true">›</span>}
                  {paso.a ? <Link to={paso.a}>{paso.etiqueta}</Link> : <span aria-current="page">{paso.etiqueta}</span>}
                </span>
              ))}
            </nav>
            <h1 className="productos-versiones__titulo">{titulo}</h1>
            <div className="productos-versiones__resumen">
              <span className="productos-versiones__conteo">
                {faltaSeleccion
                  ? 'Ninguna versión elegida'
                  : cargando && !productos
                    ? 'Cargando…'
                    : textoConteo(filas.length, 'producto', 'productos')}
              </span>
              {prefs.criterios.length > 0 && (
                <>
                  <span className="productos-versiones__orden">
                    Ordenado por <strong>{resumirOrden(prefs.criterios, (c) => columnaProducto(c).etiqueta)}</strong>
                  </span>
                  <button
                    type="button"
                    className="productos-versiones__enlace"
                    onClick={() => actualizar((p) => ({ ...p, criterios: [] }))}
                  >
                    Restablecer orden
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="productos-versiones__lado">
            {controles}
            <span className="productos-versiones__nota">
              {tienda ? `Inventario en tienda ${tienda.nombre} · solo lectura` : 'Sin tienda elegida: el inventario se muestra como “—”'}
              {tienda && productos?.inventarioActualizadoEn && ` · actualizado ${textoHaceTiempo(productos.inventarioActualizadoEn)}`}
            </span>
          </div>
        </div>
      )}

      {tienda && productos && !inventarioDisponible && (
        <div className="productos-versiones__advertencia" role="status">
          <strong>{productos.advertencia ?? 'Inventario no disponible en este momento'}.</strong> Las columnas
          Inventario y Estado se muestran vacías.
        </div>
      )}

      {tienda && productos && inventarioDisponible && productos.inventarioDesactualizado && (
        <div className="productos-versiones__advertencia" role="status">
          <strong>{productos.advertencia ?? 'No se pudo actualizar el inventario'}.</strong> Las columnas Inventario y
          Estado corresponden a la última consulta
          {productos.inventarioActualizadoEn && ` (${textoHaceTiempo(productos.inventarioActualizadoEn)})`}.
        </div>
      )}

      {/* En la vista extendida solo queda la tabla: barra, chips y franja se ocultan y la salida es
          un botón flotante (o Esc). */}
      {extendida && botonExtender}

      {!extendida && (
        <div className="productos-versiones__barra">
          <label className="productos-versiones__campo productos-versiones__campo--busqueda">
            <span>Buscar</span>
            <input
              type="search"
              placeholder="SKU, nombre o marca"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
  
          <div className="productos-versiones__campo productos-versiones__campo--version">
            <span id="etiqueta-version-productos">Planograma versión</span>
            <button
              type="button"
              className={`productos-versiones__selector${seleccionadas.length ? ' productos-versiones__selector--activo' : ''}`}
              aria-labelledby="etiqueta-version-productos"
              aria-describedby="valor-version-productos"
              aria-haspopup="dialog"
              onClick={abrirSelector}
            >
              <span id="valor-version-productos" className="productos-versiones__selector-texto" title={textoSeleccion}>
                {textoSeleccion}
              </span>
              {seleccionadas.length > 1 && (
                <span className="productos-versiones__selector-conteo">{seleccionadas.length}</span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </button>
          </div>
  
          {hayFiltros && (
            <button type="button" className="productos-versiones__enlace productos-versiones__limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
  
          <button
            type="button"
            className="productos-versiones__boton"
            aria-expanded={panelAbierto}
            aria-controls={ID_PANEL_COLUMNAS}
            onClick={() => setPanelAbierto((abierto) => !abierto)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16v16H4z" />
              <path d="M9.5 4v16M14.5 4v16" />
            </svg>
            Columnas
            <span className="productos-versiones__boton-conteo">
              {visibles.length} de {CLAVES_COLUMNA.length}
            </span>
          </button>
  
          {botonExtender}
  
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
      )}

      {!extendida && seleccionadas.length > 1 && (
        <div className="productos-versiones__chips">
          <span className="productos-versiones__chips-titulo">Mostrando productos de:</span>
          {seleccionadas.map((v) => {
            const montada = resumenPorId.get(v.versionId)?.montadaEnTienda;
            return (
              <span key={v.versionId} className="productos-versiones__chip">
                <span className="productos-versiones__chip-codigo">{v.codigo}</span>
                <span className="productos-versiones__chip-estado" style={{ color: metaEstado(v.estado).color }}>
                  {metaEstado(v.estado).label}
                </span>
                {tienda && montada === false && <span className="productos-versiones__chip-aviso">no montada</span>}
                <button
                  type="button"
                  className="productos-versiones__chip-quitar"
                  aria-label={`Quitar ${v.codigo} del filtro`}
                  onClick={() => cambiarVersiones(idsEnUrl.filter((id) => id !== v.versionId))}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {!extendida && unica && (
        <div className="productos-versiones__franja">
          <div className="productos-versiones__franja-datos">
            <span className="productos-versiones__franja-nombre">{unica.nombre}</span>
            <span className="productos-versiones__franja-codigo">{unica.codigo}</span>
            <EstadoVersionBadge estado={unica.estado} />
            {tienda && unica.montadaEnTienda != null && (
              <span
                className={`productos-versiones__montaje productos-versiones__montaje--${unica.montadaEnTienda ? 'si' : 'no'}`}
              >
                {unica.montadaEnTienda ? `Montada en ${tienda.codigo}` : `No montada en ${tienda.codigo}`}
              </span>
            )}
            <span className="productos-versiones__franja-inventario">
              {textoConteo(unica.totalProductos, 'producto', 'productos')}
              {tienda &&
                ` · ${
                  inventarioDisponible && unica.conInventario !== null && unica.porcentajeInventario !== null
                    ? `${unica.conInventario} con inventario (${textoPorcentaje(unica.porcentajeInventario)})`
                    : 'inventario no disponible'
                }`}
            </span>
            {tienda && (
              <ImplementableBadge
                implementable={inventarioDisponible ? unica.implementable : null}
                prefijo="Se puede implementar: "
              />
            )}
          </div>
          <div className="productos-versiones__franja-acciones">
            <BotonArchivos planograma={unica} onClick={() => setModal({ tipo: 'archivos', version: unica })} />
            {tienda && unica.montadaEnTienda !== false && (
              <BotonEvidencia planograma={unica} onClick={() => setModal({ tipo: 'evidencia', version: unica })} />
            )}
          </div>
        </div>
      )}

      {faltaSeleccion ? (
        <EmptyState
          titulo="Elige una o más versiones de planograma"
          hint="Se muestran los productos de las versiones elegidas; la tienda es opcional y solo agrega su inventario."
          accion={<Button onClick={abrirSelector}>Elegir versiones</Button>}
        />
      ) : cargando && !productos ? (
        <p className="productos-versiones__cargando">Cargando productos…</p>
      ) : !productos ? null : productos.data.length === 0 ? (
        <EmptyState titulo={vacio.titulo} hint={vacio.hint} />
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
          textos={textosSelector}
          versiones={versiones ?? []}
          seleccionadas={idsEnUrl}
          onAplicar={(ids) => {
            cambiarVersiones(ids);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'ficha' && (
        <FichaProductoModal sku={modal.sku} tienda={tienda ?? undefined} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'archivos' && <ArchivosVersionModal planograma={modal.version} onClose={cerrarModal} />}
      {modal?.tipo === 'evidencia' && tienda && (
        <EvidenciaModal tienda={tienda} planograma={modal.version} onClose={cerrarModal} />
      )}
    </>
  );
}
