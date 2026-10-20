import { useEffect, useMemo, useState } from 'react';
import { ProductosVersionesPagina } from '../../components/dominio/implementacion/ProductosVersiones/ProductosVersiones';
import { PanelColumnas } from '../../components/dominio/implementacion/PanelColumnas/PanelColumnas';
import { ConsolidadoFiltros } from '../../components/dominio/consolidado/ConsolidadoFiltros/ConsolidadoFiltros';
import { ResumenFiltrosCompacto } from '../../components/dominio/consolidado/ConsolidadoFiltros/ResumenFiltrosCompacto';
import { ConsolidadoTable } from '../../components/dominio/consolidado/ConsolidadoTable/ConsolidadoTable';
import { DescargarConsolidadoModal, type OpcionesDescarga } from '../../components/dominio/consolidado/DescargarConsolidadoModal/DescargarConsolidadoModal';
import { BotonFiltros } from '../../components/ui/BotonFiltros/BotonFiltros';
import { Button } from '../../components/ui/Button/Button';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { IconoDescarga } from '../../components/ui/IconoDescarga/IconoDescarga';
import { Paginacion } from '../../components/ui/Paginacion/Paginacion';
import { useToast } from '../../context/ToastContext';
import { useConsolidado } from '../../hooks/useConsolidado';
import { useFiltrosConsolidado } from '../../hooks/useFiltrosConsolidado';
import { cargarPreferenciasConsolidado, guardarPreferenciasConsolidado } from '../../config/preferenciasConsolidado';
import { JERARQUIA_VACIA } from '../../constants/productos';
import {
  CLAVES_COLUMNA_CONSOLIDADO,
  PREFERENCIAS_CONSOLIDADO_INICIALES,
  columnaConsolidado,
  type ClaveColumnaConsolidado,
} from '../../domain/consolidado/columnasConsolidado';
import {
  FILTROS_CONSOLIDADO_INICIALES,
  TAMANOS_PAGINA_CONSOLIDADO,
  TAMANO_PAGINA_INICIAL,
  chipsFiltrosActivos,
  construirQueryExportacion,
  construirQueryListado,
  contarFiltrosActivos,
  detalleErrorListado,
  filtrosEfectivos,
  mensajeErrorDescarga,
  nombreArchivo,
  quitarDeFiltros,
  type QuitarFiltro,
} from '../../domain/consolidado/filtrosConsolidado';
import { columnasVisibles, moverColumna, soltarColumna, alternarVisibilidadBase } from '../../domain/columnas/preferenciasColumnas';
import { consolidadoService } from '../../services/consolidado.service';
import { ApiError } from '../../services/httpClient';
import type {
  FiltrosConsolidado,
  GrupoConsolidado,
  OrdenConsolidado,
  VistaConsolidado,
} from '../../types/consolidado';
import type { FiltroJerarquia } from '../../types/producto';
import './ConsolidadoTiendas.css';

const ID_FILTROS = 'consolidado-filtros';
const ID_PANEL_COLUMNAS = 'consolidado-panel-columnas';
const RETARDO_BUSQUEDA_MS = 300;
const NOTA_PANEL = 'La descarga a Excel incluye solo las columnas marcadas, en este orden.';
const AYUDA_PANEL = 'Marca las que quieres ver y arrástralas para cambiar su orden. Se guarda en este navegador.';

const TITULO_VACIO: Record<VistaConsolidado, string> = {
  PLANOGRAMA: 'No hay combinaciones SKU–tienda con esos filtros',
  CROSS: 'No hay productos como cross con estos filtros',
  IMPULSO: 'No hay productos como impulso con estos filtros',
};

const numeroTexto = (n: number) => n.toLocaleString('es-GT');
const plural = (n: number, singular: string, pluralTexto: string) => `${numeroTexto(n)} ${n === 1 ? singular : pluralTexto}`;

/** Valor que se actualiza `retardo` ms después del último cambio (la búsqueda no pide en cada tecla). */
function useConRetardo<T>(valor: T, retardo: number): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setRetrasado(valor), retardo);
    return () => clearTimeout(temporizador);
  }, [valor, retardo]);
  return retrasado;
}

/** Filas de planograma que se ven en la página (el grupo sin planograma cuenta como una). */
const filasPrincipales = (grupos: GrupoConsolidado[]) => grupos.reduce((s, g) => s + Math.max(g.planograma.length, 1), 0);

/**
 * Consolidado Tiendas (Mantenimiento, solo lectura): todas las combinaciones SKU–tienda–versión de
 * lo que cada tienda monta (versiones publicadas y en piloto), con cross e impulso como sub-filas,
 * rojo para los SKU en más de un planograma, filtros, columnas configurables, modo extendido y
 * descarga a Excel generada en el servidor.
 */
export function ConsolidadoTiendas() {
  return (
    <ProductosVersionesPagina titulo="Consolidado Tiendas">
      {({ extendida, alternarExtendida }) => <Contenido extendida={extendida} onAlternarExtendida={alternarExtendida} />}
    </ProductosVersionesPagina>
  );
}

interface ContenidoProps {
  extendida: boolean;
  onAlternarExtendida: () => void;
}

function Contenido({ extendida, onAlternarExtendida }: ContenidoProps) {
  const { mostrarToast } = useToast();
  const { opciones, cargando: cargandoOpciones, error: errorOpciones, recargar: recargarOpciones } = useFiltrosConsolidado();

  const [filtros, setFiltros] = useState<FiltrosConsolidado>(FILTROS_CONSOLIDADO_INICIALES);
  const [jerarquia, setJerarquia] = useState<FiltroJerarquia>(JERARQUIA_VACIA);
  const [nombresJerarquia, setNombresJerarquia] = useState<string[]>([]);
  const [vista, setVista] = useState<VistaConsolidado>('PLANOGRAMA');
  const [orden, setOrden] = useState<OrdenConsolidado>('sku');
  const [direccion, setDireccion] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TAMANO_PAGINA_INICIAL);
  const [prefs, setPrefs] = useState(cargarPreferenciasConsolidado);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [filtrosVisibles, setFiltrosVisibles] = useState(true);
  const [filtrosVisiblesExtendida, setFiltrosVisiblesExtendida] = useState(false);
  const [modalDescarga, setModalDescarga] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => guardarPreferenciasConsolidado(prefs), [prefs]);

  // El soloDuplicados guardado no aplica fuera de la vista Planograma: ni se manda ni se cuenta.
  const efectivos = filtrosEfectivos(filtros, vista);
  const busqueda = useConRetardo(efectivos.busqueda, RETARDO_BUSQUEDA_MS);
  const query = construirQueryListado({ ...efectivos, busqueda }, jerarquia, vista, page, pageSize, orden, direccion);
  const { datos, cargando, error, recargar } = useConsolidado(query);

  const visibles = columnasVisibles(prefs);
  const filtrosActivos = contarFiltrosActivos(efectivos, jerarquia);
  const barraVisible = extendida ? filtrosVisiblesExtendida : filtrosVisibles;

  // Cambiar cualquier filtro vuelve a la primera página.
  function cambiarFiltros(parciales: Partial<FiltrosConsolidado>) {
    setFiltros((f) => ({ ...f, ...parciales }));
    setPage(1);
  }

  function cambiarJerarquia(nueva: FiltroJerarquia, nombres: string[]) {
    setJerarquia(nueva);
    setNombresJerarquia(nombres);
    setPage(1);
  }

  function cambiarVista(nueva: VistaConsolidado) {
    setVista(nueva);
    setPage(1);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_CONSOLIDADO_INICIALES);
    setJerarquia(JERARQUIA_VACIA);
    setNombresJerarquia([]);
    setPage(1);
  }

  function quitarFiltro(quitar: QuitarFiltro) {
    if (quitar.campo === 'jerarquia') cambiarJerarquia(JERARQUIA_VACIA, []);
    else cambiarFiltros(quitarDeFiltros(filtros, quitar));
  }

  function ordenarPor(nuevo: OrdenConsolidado) {
    if (nuevo === orden) setDireccion((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setOrden(nuevo);
      setDireccion('asc');
    }
    setPage(1);
  }

  async function descargar({ formato, hojas }: OpcionesDescarga) {
    setGenerando(true);
    try {
      const archivo = nombreArchivo(formato, new Date());
      const blob = await consolidadoService.descargar(
        construirQueryExportacion(efectivos, jerarquia, formato, hojas, visibles),
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setModalDescarga(false);
      mostrarToast(`Descarga lista: ${archivo}`, 'success');
    } catch (err) {
      mostrarToast(mensajeErrorDescarga(err instanceof ApiError ? err : new ApiError(0, 'ERROR', 'Error inesperado')), 'error');
    } finally {
      setGenerando(false);
    }
  }

  const nombresChips = useMemo(
    () => ({
      tiendas: new Map((opciones?.tiendas ?? []).map((t) => [t.id, `${t.codigo} · ${t.nombre}`])),
      versiones: new Map((opciones?.versiones ?? []).map((v) => [v.versionId, v.codigo])),
      jerarquia: nombresJerarquia,
    }),
    [opciones, nombresJerarquia],
  );
  const chips = chipsFiltrosActivos(efectivos, jerarquia, vista, nombresChips);

  const resumen = datos?.resumen ?? null;
  const modoPlanograma = vista === 'PLANOGRAMA';
  const sinResultados = datos !== null && datos.total === 0 && !cargando;

  const conteoTexto = cargando && !datos
    ? 'Cargando…'
    : datos
      ? modoPlanograma
        ? plural(datos.total, 'grupo SKU–tienda', 'grupos SKU–tienda')
        : plural(datos.total, vista === 'CROSS' ? 'fila cross' : 'fila impulso', vista === 'CROSS' ? 'filas cross' : 'filas impulso')
      : '';

  const botonColumnas = (
    <button
      type="button"
      className="consolidado__boton"
      aria-expanded={panelAbierto}
      aria-controls={ID_PANEL_COLUMNAS}
      onClick={() => setPanelAbierto((a) => !a)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16v16H4z" />
        <path d="M9.5 4v16M14.5 4v16" />
      </svg>
      Columnas
      <span className="consolidado__boton-conteo">
        {visibles.length} de {CLAVES_COLUMNA_CONSOLIDADO.length}
      </span>
    </button>
  );

  const ayudaExtendida = extendida ? 'Salir del modo extendido' : 'Modo extendido: la tabla ocupa toda la pantalla';
  const botonExtender = (
    <button
      type="button"
      className="consolidado__boton consolidado__boton--icono"
      title={ayudaExtendida}
      aria-label={ayudaExtendida}
      aria-pressed={extendida}
      onClick={onAlternarExtendida}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={extendida ? 'M4 10h6V4M10 10L3 3M20 14h-6v6M14 14l7 7' : 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7'} />
      </svg>
      {extendida && 'Salir'}
    </button>
  );

  return (
    <>
      {!extendida && (
        <div className="consolidado__cabecera">
          <div className="consolidado__titulos">
            <h1 className="consolidado__titulo">Consolidado Tiendas</h1>
            <span className="consolidado__solo-lectura">Solo lectura</span>
          </div>
          {resumen && (
            <p className="consolidado__resumen">
              {plural(resumen.filas, 'fila', 'filas')} · {numeroTexto(resumen.skus)} SKU · {plural(resumen.tiendas, 'tienda', 'tiendas')} ·{' '}
              {numeroTexto(resumen.gruposConVariosPlanogramas)} con más de un planograma
            </p>
          )}
        </div>
      )}

      <div className="consolidado__herramientas">
        <div className="consolidado__fila-herramientas">
          <span className="consolidado__conteo">{conteoTexto}</span>

          {extendida && (
            <ResumenFiltrosCompacto
              chips={chips}
              filtrosVisibles={filtrosVisiblesExtendida}
              controla={ID_FILTROS}
              onQuitar={quitarFiltro}
              onAlternarFiltros={() => setFiltrosVisiblesExtendida((v) => !v)}
            />
          )}

          <div className="consolidado__acciones">
            {botonColumnas}
            <Button variante="outline" onClick={() => setModalDescarga(true)} disabled={!resumen}>
              <span className="consolidado__descargar">
                <IconoDescarga />
                Descargar
              </span>
            </Button>
            {!extendida && (
              <BotonFiltros
                controla={ID_FILTROS}
                abierto={filtrosVisibles}
                activos={filtrosActivos}
                onClick={() => setFiltrosVisibles((v) => !v)}
              />
            )}
            {botonExtender}
          </div>

          {panelAbierto && (
            <PanelColumnas<ClaveColumnaConsolidado>
              id={ID_PANEL_COLUMNAS}
              prefs={prefs}
              etiqueta={(clave) => columnaConsolidado(clave).etiqueta}
              ayuda={AYUDA_PANEL}
              nota={NOTA_PANEL}
              onAlternar={(clave) => setPrefs((p) => alternarVisibilidadBase(p, clave))}
              onMover={(clave, delta) => setPrefs((p) => ({ ...p, orden: moverColumna(p.orden, clave, delta) }))}
              onSoltar={(desde, hacia) => setPrefs((p) => ({ ...p, orden: soltarColumna(p.orden, desde, hacia) }))}
              onMostrarTodas={() => setPrefs((p) => ({ ...p, ocultas: [] }))}
              onRestablecer={() => setPrefs(PREFERENCIAS_CONSOLIDADO_INICIALES)}
              onCerrar={() => setPanelAbierto(false)}
            />
          )}
        </div>

        <ConsolidadoFiltros
          id={ID_FILTROS}
          visible={barraVisible}
          filtros={filtros}
          jerarquia={jerarquia}
          vista={vista}
          opciones={opciones}
          cargandoOpciones={cargandoOpciones}
          errorOpciones={errorOpciones}
          onReintentarOpciones={recargarOpciones}
          hayFiltrosActivos={filtrosActivos > 0}
          onChange={cambiarFiltros}
          onJerarquiaChange={cambiarJerarquia}
          onVistaChange={cambiarVista}
          onLimpiar={limpiarFiltros}
        />
      </div>

      {cargando && !datos && (
        <p className="consolidado__estado" role="status">
          Cargando consolidado…
        </p>
      )}

      {error && !cargando ? (
        <EmptyState
          titulo="No se pudo cargar el consolidado"
          hint={detalleErrorListado(error)}
          accion={<Button variante="outline" onClick={recargar}>Reintentar</Button>}
        />
      ) : sinResultados ? (
        filtrosActivos > 0 || !modoPlanograma ? (
          <EmptyState
            titulo={TITULO_VACIO[vista]}
            hint="Ajusta la tienda, el planograma, la jerarquía o el estado de la versión."
            accion={filtrosActivos > 0 ? <Button variante="outline" onClick={limpiarFiltros}>Limpiar filtros</Button> : undefined}
          />
        ) : (
          <EmptyState
            titulo="Aún no hay productos asignados a tiendas"
            hint="Cuando una versión publicada o en piloto se asigne a una tienda, sus productos aparecerán aquí."
          />
        )
      ) : (
        (datos || cargando) && (
          <ConsolidadoTable
            grupos={datos?.data ?? []}
            vista={vista}
            columnas={visibles}
            orden={orden}
            direccion={direccion}
            onOrdenar={ordenarPor}
            cargando={cargando}
            compacta={extendida}
          />
        )
      )}

      {datos && datos.total > 0 && !error && (
        <Paginacion
          page={datos.page}
          pageSize={datos.pageSize}
          total={datos.total}
          deshabilitado={cargando}
          onChange={setPage}
          pageSizes={TAMANOS_PAGINA_CONSOLIDADO}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          rango={rangoTexto(datos.page, datos.pageSize, datos.total, modoPlanograma, filasPrincipales(datos.data))}
        />
      )}

      <DescargarConsolidadoModal
        abierto={modalDescarga}
        onClose={() => setModalDescarga(false)}
        columnasVisibles={visibles}
        conteos={resumen?.conteos ?? { PLANOGRAMA: 0, CROSS: 0, IMPULSO: 0, AGREGADO: 0 }}
        maximo={resumen?.maximoExportacion ?? 0}
        generando={generando}
        onDescargar={descargar}
        onElegirColumnas={() => {
          setModalDescarga(false);
          setPanelAbierto(true);
        }}
      />
    </>
  );
}

/** "Mostrando 1–50 de N grupos SKU–tienda · M filas" (en Solo cross / impulso: "de N filas"). */
function rangoTexto(page: number, pageSize: number, total: number, modoPlanograma: boolean, filasEnPagina: number): string {
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);
  if (total === 0 || desde > total) return 'Sin resultados en esta página';
  const rango = `Mostrando ${numeroTexto(desde)}–${numeroTexto(hasta)} de ${numeroTexto(total)}`;
  return modoPlanograma
    ? `${rango} ${total === 1 ? 'grupo' : 'grupos'} SKU–tienda · ${plural(filasEnPagina, 'fila', 'filas')}`
    : `${rango} ${total === 1 ? 'fila' : 'filas'}`;
}
