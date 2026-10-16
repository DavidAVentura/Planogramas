import { useId, useMemo, useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import { BotonSeleccionMultiple } from '../../../ui/BotonSeleccionMultiple/BotonSeleccionMultiple';
import {
  SeleccionMultipleModal,
  type ElementoSeleccionado,
} from '../../../ui/SeleccionMultipleModal/SeleccionMultipleModal';
import { SeleccionTiendasModal } from '../../modales/SeleccionTiendasModal/SeleccionTiendasModal';
import {
  SeleccionVersionesModal,
  type TextosSeleccionVersiones,
} from '../../modales/SeleccionVersionesModal/SeleccionVersionesModal';
import { EstadoVersionBadge } from '../../implementacion/EstadoVersionBadge/EstadoVersionBadge';
import { CadenaJerarquia } from '../../productos/CadenaJerarquia/CadenaJerarquia';
import { ETIQUETA_VISTA } from '../../../../domain/consolidado/filtrosConsolidado';
import type {
  EstadoVersionMontable,
  FiltrosConsolidado,
  FiltrosDisponiblesConsolidado,
  VistaConsolidado,
} from '../../../../types/consolidado';
import type { FiltroJerarquia } from '../../../../types/producto';
import './ConsolidadoFiltros.css';

const TEXTOS_VERSIONES: TextosSeleccionVersiones = {
  ayuda: 'Versiones publicadas y en piloto asignadas a tiendas.',
  notaSinSeleccion: 'Sin selección se muestran todas las versiones.',
  aplicarSinSeleccion: 'Mostrar todas',
  sinVersiones: 'No hay versiones publicadas ni en piloto asignadas a tiendas.',
  sinCoincidencias: 'Ninguna versión coincide con la búsqueda.',
};

/** Estados que una tienda puede montar; el modal genérico trabaja con ids numéricos. */
const ESTADOS: { id: number; clave: EstadoVersionMontable; nombre: string; detalle: string }[] = [
  { id: 1, clave: 'publicado', nombre: 'Publicada', detalle: 'Versión vigente en las tiendas' },
  { id: 2, clave: 'piloto', nombre: 'Piloto', detalle: 'Versión en prueba en tiendas piloto' },
];

const VISTAS: { valor: VistaConsolidado; ayuda: string }[] = [
  { valor: 'PLANOGRAMA', ayuda: 'Vista normal: una fila por planograma; cross e impulso se despliegan debajo' },
  { valor: 'CROSS', ayuda: 'Lista solo las apariciones como cross, una fila por SKU–tienda–versión' },
  { valor: 'IMPULSO', ayuda: 'Lista solo las apariciones como impulso, una fila por SKU–tienda–versión' },
];

type ModalAbierto = 'tiendas' | 'versiones' | 'estados' | null;

interface ConsolidadoFiltrosProps {
  id: string;
  /**
   * La barra se oculta en vez de desmontarse: las opciones de cada nivel de jerarquía se cargan al
   * elegir el nivel de arriba y se perderían al volver a montarla.
   */
  visible: boolean;
  filtros: FiltrosConsolidado;
  jerarquia: FiltroJerarquia;
  vista: VistaConsolidado;
  /** Tiendas y versiones montables; `null` mientras cargan (o si fallaron). */
  opciones: FiltrosDisponiblesConsolidado | null;
  /** Estado de la carga de `opciones`: mientras carga o si falló, los modales de tienda y versión no se abren. */
  cargandoOpciones: boolean;
  errorOpciones: boolean;
  onReintentarOpciones: () => void;
  hayFiltrosActivos: boolean;
  onChange: (parciales: Partial<FiltrosConsolidado>) => void;
  onJerarquiaChange: (jerarquia: FiltroJerarquia, nombres: string[]) => void;
  onVistaChange: (vista: VistaConsolidado) => void;
  onLimpiar: () => void;
}

/** Barra de filtros del consolidado; las etiquetas quedan solo para lectores de pantalla. */
export function ConsolidadoFiltros({
  id,
  visible,
  filtros,
  jerarquia,
  vista,
  opciones,
  cargandoOpciones,
  errorOpciones,
  onReintentarOpciones,
  hayFiltrosActivos,
  onChange,
  onJerarquiaChange,
  onVistaChange,
  onLimpiar,
}: ConsolidadoFiltrosProps) {
  const [modal, setModal] = useState<ModalAbierto>(null);
  // Al limpiar, un `key` nuevo reinicia las opciones cargadas de la cadena de jerarquía.
  const [claveCadena, setClaveCadena] = useState(0);
  const idVersion = useId();
  const idTipo = useId();

  const sinOpciones = cargandoOpciones || errorOpciones;
  const tiendas = useMemo(() => opciones?.tiendas ?? [], [opciones]);
  const versiones = useMemo(() => opciones?.versiones ?? [], [opciones]);

  const tiendasElegidas: ElementoSeleccionado[] = useMemo(
    () => filtros.tiendaIds.map((tid) => ({ id: tid, nombre: tiendas.find((t) => t.id === tid)?.nombre ?? String(tid) })),
    [filtros.tiendaIds, tiendas],
  );
  const estadosElegidos: ElementoSeleccionado[] = ESTADOS
    .filter((e) => filtros.estados.includes(e.clave))
    .map((e) => ({ id: e.id, nombre: e.nombre }));
  const versionesElegidas = filtros.versionIds.map((vid) => versiones.find((v) => v.versionId === vid) ?? null);

  const conteoSkusPorTienda = useMemo(() => new Map(tiendas.map((t) => [t.id, t.totalSkus])), [tiendas]);

  const textoVersion =
    filtros.versionIds.length === 0
      ? 'Todas las versiones'
      : filtros.versionIds.length === 1
        ? versionesElegidas[0] ? `${versionesElegidas[0].codigo} · ${versionesElegidas[0].nombre}` : String(filtros.versionIds[0])
        : versionesElegidas.map((v, i) => v?.codigo ?? String(filtros.versionIds[i])).join(', ');

  function limpiar() {
    onLimpiar();
    setClaveCadena((c) => c + 1);
  }

  return (
    <div id={id} className="consolidado-filtros" hidden={!visible}>
      <div className="consolidado-filtros__fila">
        <label className="consolidado-filtros__campo consolidado-filtros__campo--busqueda">
          <span className="consolidado-filtros__oculto">Buscar producto</span>
          <input
            type="search"
            placeholder="SKU, nombre o marca"
            value={filtros.busqueda}
            onChange={(e) => onChange({ busqueda: e.target.value })}
          />
        </label>

        <div className="consolidado-filtros__campo">
          <BotonSeleccionMultiple
            seleccionados={tiendasElegidas}
            textoVacio="Todas las tiendas"
            plural="tiendas"
            ariaLabel="Filtrar por tienda"
            disabled={sinOpciones}
            onClick={() => setModal('tiendas')}
          />
        </div>

        <div className="consolidado-filtros__campo">
          <span id={idVersion} className="consolidado-filtros__oculto">
            Planograma versión
          </span>
          <button
            type="button"
            className={`consolidado-filtros__selector${filtros.versionIds.length ? ' consolidado-filtros__selector--activo' : ''}`}
            aria-labelledby={idVersion}
            aria-haspopup="dialog"
            disabled={sinOpciones}
            onClick={() => setModal('versiones')}
          >
            <span className="consolidado-filtros__selector-texto" title={textoVersion}>
              {textoVersion}
            </span>
            {filtros.versionIds.length > 1 && (
              <span className="consolidado-filtros__selector-conteo">{filtros.versionIds.length}</span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>

        <div className="consolidado-filtros__campo">
          <BotonSeleccionMultiple
            seleccionados={estadosElegidos}
            textoVacio="Publicada y piloto"
            plural="estados"
            ariaLabel="Filtrar por estado de la versión"
            onClick={() => setModal('estados')}
          />
        </div>

        {hayFiltrosActivos && (
          <Button variante="ghost" onClick={limpiar}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {errorOpciones && !cargandoOpciones && (
        <p className="consolidado-filtros__aviso" role="alert">
          No se pudieron cargar las tiendas y versiones para filtrar.
          <Button variante="ghost" onClick={onReintentarOpciones}>
            Reintentar
          </Button>
        </p>
      )}

      {filtros.tiendaIds.length > 1 && (
        <ul className="consolidado-filtros__chips" aria-label="Tiendas seleccionadas">
          {tiendasElegidas.map((t) => (
            <li key={t.id} className="consolidado-filtros__chip">
              {t.nombre}
              <button
                type="button"
                aria-label={`Quitar ${t.nombre}`}
                onClick={() => onChange({ tiendaIds: filtros.tiendaIds.filter((x) => x !== t.id) })}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {filtros.versionIds.length > 1 && (
        <div className="consolidado-filtros__versiones">
          <span className="consolidado-filtros__versiones-titulo">Mostrando productos de:</span>
          {filtros.versionIds.map((vid, i) => {
            const v = versionesElegidas[i];
            const codigo = v?.codigo ?? String(vid);
            return (
              <span key={vid} className="consolidado-filtros__version">
                <span className="consolidado-filtros__version-codigo">{codigo}</span>
                {v && <EstadoVersionBadge estado={v.estado} />}
                <button
                  type="button"
                  className="consolidado-filtros__version-quitar"
                  aria-label={`Quitar ${codigo} del filtro`}
                  onClick={() => onChange({ versionIds: filtros.versionIds.filter((x) => x !== vid) })}
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

      <div className="consolidado-filtros__fila consolidado-filtros__fila--jerarquia">
        <CadenaJerarquia key={claveCadena} jerarquia={jerarquia} onChange={onJerarquiaChange} />

        <div className="consolidado-filtros__tipo" role="radiogroup" aria-labelledby={idTipo}>
          <span id={idTipo} className="consolidado-filtros__rotulo">
            Tipo de aparición
          </span>
          {VISTAS.map((v) => (
            <label key={v.valor} className="consolidado-filtros__opcion-tipo" title={v.ayuda}>
              <input
                type="radio"
                name={`${id}-tipo`}
                value={v.valor}
                checked={vista === v.valor}
                onChange={() => onVistaChange(v.valor)}
              />
              <span>{ETIQUETA_VISTA[v.valor]}</span>
            </label>
          ))}
        </div>
      </div>

      <label
        className="consolidado-filtros__duplicados"
        title={vista === 'PLANOGRAMA' ? undefined : 'Solo aplica en la vista Planograma'}
      >
        <input
          type="checkbox"
          checked={filtros.soloDuplicados}
          disabled={vista !== 'PLANOGRAMA'}
          onChange={(e) => onChange({ soloDuplicados: e.target.checked })}
        />
        Solo con más de un planograma
      </label>

      {modal === 'tiendas' && !sinOpciones && (
        <SeleccionTiendasModal
          tiendas={tiendas}
          seleccionados={tiendasElegidas}
          conteo={{ porId: conteoSkusPorTienda, singular: 'producto', plural: 'productos' }}
          onAplicar={(elegidas) => onChange({ tiendaIds: elegidas.map((t) => t.id) })}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'versiones' && !sinOpciones && (
        <SeleccionVersionesModal
          textos={TEXTOS_VERSIONES}
          versiones={versiones}
          seleccionadas={filtros.versionIds}
          onAplicar={(versionIds) => onChange({ versionIds })}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'estados' && (
        <SeleccionMultipleModal
          titulo="Filtrar por estado de la versión"
          elementos={ESTADOS}
          obtenerId={(e) => e.id}
          obtenerNombre={(e) => e.nombre}
          textoBusqueda={(e) => e.nombre}
          placeholderBusqueda="Buscar estado"
          ordenes={[{ id: 'nombre', etiqueta: 'Nombre', comparar: (a, b) => a.nombre.localeCompare(b.nombre, 'es') }]}
          renderDetalle={(e) => e.detalle}
          seleccionados={estadosElegidos}
          textoVacio="No hay estados"
          onAplicar={(elegidos) =>
            onChange({ estados: ESTADOS.filter((e) => elegidos.some((s) => s.id === e.id)).map((e) => e.clave) })
          }
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
