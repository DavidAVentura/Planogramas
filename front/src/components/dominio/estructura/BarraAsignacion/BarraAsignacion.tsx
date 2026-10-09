import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { BotonSeleccionMultiple } from '../../../ui/BotonSeleccionMultiple/BotonSeleccionMultiple';
import type { ConteoPorElemento, ElementoSeleccionado } from '../../../ui/SeleccionMultipleModal/SeleccionMultipleModal';
import {
  SeleccionPlanogramasModal,
  type PlanogramaSeleccionable,
} from '../../modales/SeleccionPlanogramasModal/SeleccionPlanogramasModal';
import { SeleccionTiendasModal, type TiendaSeleccionable } from '../../modales/SeleccionTiendasModal/SeleccionTiendasModal';
import type { Pincel } from '../../../../domain/estructura/asignaciones';
import type { TipoTienda } from '../../../../types/tienda';
import './BarraAsignacion.css';

export interface FiltrosEstructura {
  busqueda: string;
  departamento: string;
  tipoTienda: TipoTienda | '';
  /** Vacío = todos. */
  planogramas: ElementoSeleccionado[];
  /** Vacío = todas. */
  tiendas: ElementoSeleccionado[];
}

interface BarraAsignacionProps {
  pincel: Pincel;
  modoPiloto: boolean;
  editable: boolean;
  filtros: FiltrosEstructura;
  departamentos: string[];
  /** Opciones de los modales de filtro, con cuántas asignaciones tiene cada una. */
  planogramas: PlanogramaSeleccionable[];
  tiendas: TiendaSeleccionable[];
  tiendasPorPlanograma: ConteoPorElemento;
  planogramasPorTienda: ConteoPorElemento;
  /** Pinceles que se pueden usar (el resto se ve deshabilitado); por defecto todos. */
  pincelesPermitidos?: Pincel[];
  /** El selector Publicado/Piloto no se puede cambiar (ej. al promover una versión a piloto). */
  modoFijo?: boolean;
  onPincel: (pincel: Pincel) => void;
  onModoPiloto: (piloto: boolean) => void;
  onFiltros: (parciales: Partial<FiltrosEstructura>) => void;
}

const PINCELES: { id: Pincel; etiqueta: string; nombre?: string }[] = [
  { id: 'TG', etiqueta: 'TG', nombre: 'Grande' },
  { id: 'TM', etiqueta: 'TM', nombre: 'Mediana' },
  { id: 'TE', etiqueta: 'TE', nombre: 'Express' },
  { id: 'ESP', etiqueta: 'Especial' },
  { id: 'QUITAR', etiqueta: 'Quitar' },
];

function ayudaPincel(id: Pincel, nombre: string | undefined, modoPiloto: boolean): string {
  if (id === 'QUITAR') return 'La tienda deja de usar este planograma';
  if (id === 'ESP') {
    return modoPiloto
      ? 'Versión especial de la tienda que está en piloto'
      : 'Versión especial de la tienda; si no existe se crea publicada al guardar, copia de la versión de su tipo';
  }
  return `Versión ${nombre} ${modoPiloto ? 'en piloto' : 'publicada'}`;
}

/** Cuántos filtros están aplicados; se muestra en el botón para que no pasen desapercibidos con la barra oculta. */
function contarFiltrosActivos(f: FiltrosEstructura): number {
  return [f.busqueda.trim(), f.departamento, f.tipoTienda, f.planogramas.length, f.tiendas.length].filter(Boolean).length;
}

function ModalAyudaAsignar({ onClose }: { onClose: () => void }) {
  return createPortal(
    <Modal titulo="Cómo asignar" onClose={onClose} ancho="sm">
      <ul className="barra-asignacion__ayuda-lista">
        <li>Elige una versión y haz clic o arrastra sobre las celdas que quieras cambiar.</li>
        <li>Cada tienda monta una sola versión por planograma.</li>
        <li>Clic derecho en una celda para ver su historial o su versión.</li>
        <li>En modo Piloto, TG, TM, TE y Especial asignan la versión en piloto de ese tipo, en vez de la publicada.</li>
      </ul>
    </Modal>,
    document.body,
  );
}

export function BarraAsignacion({
  pincel,
  modoPiloto,
  editable,
  filtros,
  departamentos,
  planogramas,
  tiendas,
  tiendasPorPlanograma,
  planogramasPorTienda,
  pincelesPermitidos,
  modoFijo = false,
  onPincel,
  onModoPiloto,
  onFiltros,
}: BarraAsignacionProps) {
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState<'planogramas' | 'tiendas' | null>(null);
  // La barra de filtros arranca oculta; el botón de la derecha de la fila la despliega o la contrae.
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);
  const filtrosActivos = contarFiltrosActivos(filtros);
  const ayudaFiltros = `${filtrosVisibles ? 'Ocultar' : 'Mostrar'} filtros${filtrosActivos ? ` (${filtrosActivos} aplicado${filtrosActivos === 1 ? '' : 's'})` : ''}`;

  return (
    <div className="barra-asignacion">
      <div className="barra-asignacion__herramientas">
        <div className="barra-asignacion__fila">
          {editable && (
            <>
              <div
                role="radiogroup"
                aria-label="Estado de la versión a asignar"
                className={`barra-asignacion__modo${modoPiloto ? ' barra-asignacion__modo--piloto' : ''}`}
              >
                {[false, true].map((piloto) => (
                  <button
                    key={String(piloto)}
                    type="button"
                    role="radio"
                    aria-checked={modoPiloto === piloto}
                    disabled={modoFijo && modoPiloto !== piloto}
                    className={`barra-asignacion__modo-opcion${modoPiloto === piloto ? ' barra-asignacion__modo-opcion--activa' : ''}`}
                    title={piloto ? 'Asignar versiones en piloto: la tienda desmonta su versión actual y monta la piloto' : 'Asignar versiones publicadas'}
                    onClick={() => onModoPiloto(piloto)}
                  >
                    <span className={`barra-asignacion__punto barra-asignacion__punto--${piloto ? 'piloto' : 'publicado'}`} />
                    {piloto ? 'Piloto' : 'Publicado'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                id="barra-asignacion-lbl"
                className="barra-asignacion__etiqueta"
                title="Cómo asignar"
                aria-haspopup="dialog"
                onClick={() => setAyudaAbierta(true)}
              >
                Asignar
                <svg className="barra-asignacion__info" viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 7.2v3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
                </svg>
              </button>
              <div role="group" aria-labelledby="barra-asignacion-lbl" className="barra-asignacion__pinceles">
                {PINCELES.map((b) => {
                  const muestra = modoPiloto && b.nombre ? 'piloto' : b.id.toLowerCase();
                  const permitido = !pincelesPermitidos || pincelesPermitidos.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={pincel === b.id}
                      disabled={!permitido}
                      className={`barra-asignacion__pincel${pincel === b.id ? ' barra-asignacion__pincel--activo' : ''}`}
                      title={ayudaPincel(b.id, b.nombre, modoPiloto)}
                      onClick={() => onPincel(b.id)}
                    >
                      <span className={`barra-asignacion__muestra barra-asignacion__muestra--${muestra}`} />
                      {b.etiqueta}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {!editable && (
            <span className="barra-asignacion__lectura">Vista de solo lectura. Clic derecho en una celda para ver su historial o su versión.</span>
          )}

          <button
            type="button"
            className={`barra-asignacion__boton-filtros${filtrosVisibles ? ' barra-asignacion__boton-filtros--abierto' : ''}${filtrosActivos ? ' barra-asignacion__boton-filtros--con-filtros' : ''}`}
            aria-expanded={filtrosVisibles}
            aria-controls="barra-asignacion-filtros"
            aria-label={ayudaFiltros}
            title={ayudaFiltros}
            onClick={() => setFiltrosVisibles((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5z" />
            </svg>
            {filtrosActivos > 0 && <span className="barra-asignacion__conteo-filtros" aria-hidden="true">{filtrosActivos}</span>}
          </button>
        </div>
      </div>

      {filtrosVisibles && (
        <div id="barra-asignacion-filtros" className="barra-asignacion__filtros">
          <label className="barra-asignacion__buscar">
            <span className="barra-asignacion__oculto">Buscar planograma</span>
            <input
              type="search"
              placeholder="Buscar por nombre o descripción"
              value={filtros.busqueda}
              onChange={(e) => onFiltros({ busqueda: e.target.value })}
            />
          </label>
          <label>
            <span className="barra-asignacion__oculto">Departamento</span>
            <select value={filtros.departamento} onChange={(e) => onFiltros({ departamento: e.target.value })}>
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <BotonSeleccionMultiple
            seleccionados={filtros.planogramas}
            textoVacio="Todos los planogramas"
            plural="planogramas"
            ariaLabel="Filtrar por planograma"
            onClick={() => setSelectorAbierto('planogramas')}
          />
          <BotonSeleccionMultiple
            seleccionados={filtros.tiendas}
            textoVacio="Todas las tiendas"
            plural="tiendas"
            ariaLabel="Filtrar por tienda"
            onClick={() => setSelectorAbierto('tiendas')}
          />
          <label>
            <span className="barra-asignacion__oculto">Tipo de tienda</span>
            <select value={filtros.tipoTienda} onChange={(e) => onFiltros({ tipoTienda: e.target.value as TipoTienda | '' })}>
              <option value="">Todos los tipos</option>
              <option value="GRANDE">Grandes</option>
              <option value="MEDIANA">Medianas</option>
              <option value="EXPRESS">Express</option>
            </select>
          </label>
        </div>
      )}

      {ayudaAbierta && <ModalAyudaAsignar onClose={() => setAyudaAbierta(false)} />}

      {selectorAbierto === 'planogramas' && (
        <SeleccionPlanogramasModal
          planogramas={planogramas}
          seleccionados={filtros.planogramas}
          conteo={tiendasPorPlanograma}
          onAplicar={(seleccion) => onFiltros({ planogramas: seleccion })}
          onClose={() => setSelectorAbierto(null)}
        />
      )}

      {selectorAbierto === 'tiendas' && (
        <SeleccionTiendasModal
          tiendas={tiendas}
          seleccionados={filtros.tiendas}
          conteo={planogramasPorTienda}
          onAplicar={(seleccion) => onFiltros({ tiendas: seleccion })}
          onClose={() => setSelectorAbierto(null)}
        />
      )}
    </div>
  );
}
