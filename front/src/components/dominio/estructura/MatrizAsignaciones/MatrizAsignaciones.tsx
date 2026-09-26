import type { CSSProperties, MouseEvent } from 'react';
import { SIGLA_TIPO_TIENDA, TIPO_TIENDA_META } from '../../../../constants/tiendas';
import {
  clave,
  describirCelda,
  resolverPincel,
  textoCelda,
  type MapaAsignaciones,
  type Pincel,
} from '../../../../domain/estructura/asignaciones';
import type { PlanogramaMatriz, TiendaMatriz, VersionMatriz } from '../../../../types/asignacion';
import type { VersionTipo } from '../../../../types/version';
import './MatrizAsignaciones.css';

const TIPOS_BASE: VersionTipo[] = ['GRANDE', 'MEDIANA', 'EXPRESS'];

interface MatrizAsignacionesProps {
  planogramas: PlanogramaMatriz[];
  tiendas: TiendaMatriz[];
  /** Totales de la cadena (no solo lo visible con filtros) para la cobertura de filas y columnas. */
  totalPlanogramas: number;
  totalTiendas: number;
  asignaciones: MapaAsignaciones;
  guardadas: MapaAsignaciones;
  versiones: Map<number, VersionMatriz>;
  pincel: Pincel;
  modoPiloto: boolean;
  editable: boolean;
  onPintar: (p: PlanogramaMatriz, t: TiendaMatriz, inicioDeTrazo: boolean) => void;
  onTerminarTrazo: () => void;
  onMenu: (e: MouseEvent<HTMLButtonElement>, p: PlanogramaMatriz, t: TiendaMatriz) => void;
}

function claseDeCelda(etiqueta: string, esPiloto: boolean, vacia: boolean): string {
  if (vacia) return 'vacia';
  if (esPiloto) return 'piloto';
  return etiqueta === 'Especial' ? 'esp' : etiqueta.toLowerCase();
}

function VersionesDisponibles({ planograma }: { planograma: PlanogramaMatriz }) {
  const bases = planograma.versiones.filter((v) => v.versionBaseId === null);
  const especiales = planograma.versiones.filter((v) => v.versionBaseId !== null && v.estado === 'publicado').length;
  return (
    <span className="matriz-asignaciones__versiones">
      {TIPOS_BASE.map((tipo) => {
        const hay = bases.some((v) => v.tipo === tipo && v.estado === 'publicado');
        return (
          <span
            key={tipo}
            className={`matriz-asignaciones__sigla matriz-asignaciones__sigla--${hay ? SIGLA_TIPO_TIENDA[tipo].toLowerCase() : 'falta'}`}
            title={hay ? `Versión ${SIGLA_TIPO_TIENDA[tipo]} publicada` : `Sin versión ${SIGLA_TIPO_TIENDA[tipo]} publicada`}
          >
            {SIGLA_TIPO_TIENDA[tipo]}
          </span>
        );
      })}
      {especiales > 0 && (
        <span className="matriz-asignaciones__sigla matriz-asignaciones__sigla--esp" title="Versiones especiales publicadas">
          {especiales} esp.
        </span>
      )}
      {bases
        .filter((v) => v.estado === 'piloto')
        .map((v) => (
          <span key={v.id} className="matriz-asignaciones__sigla matriz-asignaciones__sigla--piloto" title={`Versión ${SIGLA_TIPO_TIENDA[v.tipo]} en piloto`}>
            {SIGLA_TIPO_TIENDA[v.tipo]} piloto
          </span>
        ))}
    </span>
  );
}

export function MatrizAsignaciones({
  planogramas,
  tiendas,
  totalPlanogramas,
  totalTiendas,
  asignaciones,
  guardadas,
  versiones,
  pincel,
  modoPiloto,
  editable,
  onPintar,
  onTerminarTrazo,
  onMenu,
}: MatrizAsignacionesProps) {
  const columnas = { '--columnas': tiendas.length } as CSSProperties;
  const asignadasPorTienda = new Map<number, number>();
  const asignadasPorPlanograma = new Map<number, number>();
  for (const [k, valor] of Object.entries(asignaciones)) {
    if (!valor) continue;
    const [planogramaId, tiendaId] = k.split('|').map(Number);
    asignadasPorTienda.set(tiendaId, (asignadasPorTienda.get(tiendaId) ?? 0) + 1);
    asignadasPorPlanograma.set(planogramaId, (asignadasPorPlanograma.get(planogramaId) ?? 0) + 1);
  }

  return (
    <div
      className="matriz-asignaciones"
      role="grid"
      aria-label="Versión de cada planograma por tienda"
      aria-readonly={!editable}
      style={columnas}
      onMouseUp={onTerminarTrazo}
      onMouseLeave={onTerminarTrazo}
    >
      <div role="row" className="matriz-asignaciones__fila matriz-asignaciones__fila--encabezado">
        <div role="columnheader" className="matriz-asignaciones__esquina">Planograma</div>
        {tiendas.map((t) => (
          <div
            key={t.id}
            role="columnheader"
            className={`matriz-asignaciones__tienda matriz-asignaciones__tienda--${t.tipo.toLowerCase()}`}
          >
            <span className="matriz-asignaciones__tienda-codigo">{t.codigo}</span>
            <span className="matriz-asignaciones__tienda-nombre">{t.nombre}</span>
            <span className="matriz-asignaciones__tienda-tipo" style={{ color: TIPO_TIENDA_META[t.tipo].color }}>
              {TIPO_TIENDA_META[t.tipo].label} · {asignadasPorTienda.get(t.id) ?? 0}/{totalPlanogramas}
            </span>
          </div>
        ))}
        <div role="columnheader" className="matriz-asignaciones__esquina matriz-asignaciones__esquina--fin">Tiendas</div>
      </div>

      {planogramas.map((p) => {
        const asignadas = asignadasPorPlanograma.get(p.id) ?? 0;
        return (
          <div key={p.id} role="row" className="matriz-asignaciones__fila">
            <div role="rowheader" className="matriz-asignaciones__planograma">
              <span className="matriz-asignaciones__planograma-nombre">{p.nombre}</span>
              <span className="matriz-asignaciones__planograma-meta">
                {p.departamento}
                <VersionesDisponibles planograma={p} />
              </span>
            </div>

            {tiendas.map((t) => {
              const k = clave(p.id, t.id);
              const d = describirCelda(asignaciones[k], t, versiones);
              const cambiada = (asignaciones[k] ?? '') !== (guardadas[k] ?? '');
              const resultado = editable ? resolverPincel(pincel, modoPiloto, p, t) : null;
              const bloqueo = resultado && 'bloqueo' in resultado ? resultado.bloqueo : null;
              const ayuda = bloqueo ?? (d.distinta ? `Tienda ${TIPO_TIENDA_META[t.tipo].label.toLowerCase()} usando la versión ${d.etiqueta}` : undefined);
              const clases = [
                'matriz-asignaciones__celda',
                `matriz-asignaciones__celda--${claseDeCelda(d.etiqueta, d.esPiloto, d.vacia)}`,
                bloqueo && 'matriz-asignaciones__celda--bloqueada',
                !editable && 'matriz-asignaciones__celda--lectura',
              ].filter(Boolean).join(' ');

              return (
                <div key={t.id} role="gridcell" className="matriz-asignaciones__hueco">
                  <button
                    type="button"
                    className={clases}
                    title={ayuda}
                    aria-label={`${p.nombre} en ${t.nombre}: ${textoCelda(d, t)}${cambiada ? ' (sin guardar)' : ''}`}
                    onMouseDown={(e) => {
                      if (e.button === 0 && editable) onPintar(p, t, true);
                    }}
                    onMouseEnter={(e) => {
                      if (e.buttons === 1 && editable) onPintar(p, t, false);
                    }}
                    onClick={(e) => {
                      // Clic con teclado (Enter/Espacio): el mouse ya pintó en onMouseDown.
                      if (e.detail === 0 && editable) onPintar(p, t, true);
                    }}
                    onContextMenu={(e) => onMenu(e, p, t)}
                  >
                    <span>{d.esEspecial ? 'Especial' : d.etiqueta}</span>
                    {(d.esPiloto || d.esEspecial) && (
                      <span className="matriz-asignaciones__detalle">
                        {d.esPiloto ? 'PILOTO' : d.esNueva ? 'nueva · se crea' : t.codigo}
                      </span>
                    )}
                    {cambiada && <span className="matriz-asignaciones__marca-cambio" aria-hidden="true" />}
                    {d.distinta && (
                      <svg className="matriz-asignaciones__marca-distinta" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v5M12 17h.01" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}

            <div
              role="gridcell"
              className={`matriz-asignaciones__cobertura${asignadas === 0 ? ' matriz-asignaciones__cobertura--nula' : asignadas === totalTiendas ? ' matriz-asignaciones__cobertura--completa' : ''}`}
            >
              {asignadas}/{totalTiendas}
            </div>
          </div>
        );
      })}
    </div>
  );
}
