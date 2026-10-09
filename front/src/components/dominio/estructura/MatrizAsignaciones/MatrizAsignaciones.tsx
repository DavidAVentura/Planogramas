import type { CSSProperties, MouseEvent } from 'react';
import { TIPO_TIENDA_META } from '../../../../constants/tiendas';
import {
  clave,
  describirCelda,
  textoCelda,
  type MapaAsignaciones,
  type ResultadoPincel,
} from '../../../../domain/estructura/asignaciones';
import type { PlanogramaMatriz, TiendaMatriz, VersionMatriz } from '../../../../types/asignacion';
import { VersionesPlanograma } from '../VersionesPlanograma/VersionesPlanograma';
import { IdentidadPlanograma } from '../../IdentidadPlanograma/IdentidadPlanograma';
import './MatrizAsignaciones.css';

interface MatrizAsignacionesProps {
  planogramas: PlanogramaMatriz[];
  tiendas: TiendaMatriz[];
  /** Totales de la cadena (no solo lo visible con filtros) para la cobertura de filas y columnas. */
  totalPlanogramas: number;
  totalTiendas: number;
  asignaciones: MapaAsignaciones;
  guardadas: MapaAsignaciones;
  versiones: Map<number, VersionMatriz>;
  /** Qué dejaría el pincel activo en una celda, o por qué no se puede (se muestra como ayuda). */
  resolver: (p: PlanogramaMatriz, t: TiendaMatriz) => ResultadoPincel;
  editable: boolean;
  onPintar: (p: PlanogramaMatriz, t: TiendaMatriz, inicioDeTrazo: boolean) => void;
  onTerminarTrazo: () => void;
  onMenu: (e: MouseEvent<HTMLButtonElement>, p: PlanogramaMatriz, t: TiendaMatriz) => void;
  /** Vista extendida: la matriz ocupa toda la pantalla. Se alterna con doble clic en la esquina. */
  extendida: boolean;
  onAlternarExtendida: () => void;
}

function claseDeCelda(etiqueta: string, esPiloto: boolean, vacia: boolean): string {
  if (vacia) return 'vacia';
  if (esPiloto) return 'piloto';
  return etiqueta === 'Especial' ? 'esp' : etiqueta.toLowerCase();
}

export function MatrizAsignaciones({
  planogramas,
  tiendas,
  totalPlanogramas,
  totalTiendas,
  asignaciones,
  guardadas,
  versiones,
  resolver,
  editable,
  onPintar,
  onTerminarTrazo,
  onMenu,
  extendida,
  onAlternarExtendida,
}: MatrizAsignacionesProps) {
  const columnas = { '--columnas': tiendas.length } as CSSProperties;
  const ayudaExtendida = extendida ? 'Doble clic para salir de la vista extendida' : 'Doble clic para la vista extendida';
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
      className={`matriz-asignaciones${extendida ? ' matriz-asignaciones--extendida' : ''}`}
      role="grid"
      aria-label="Versión de cada planograma por tienda"
      aria-readonly={!editable}
      style={columnas}
      onMouseUp={onTerminarTrazo}
      onMouseLeave={onTerminarTrazo}
    >
      <div role="row" className="matriz-asignaciones__fila matriz-asignaciones__fila--encabezado">
        <div role="columnheader" className="matriz-asignaciones__esquina">
          <button
            type="button"
            className="matriz-asignaciones__extender"
            title={ayudaExtendida}
            aria-label={ayudaExtendida}
            aria-pressed={extendida}
            onDoubleClick={onAlternarExtendida}
            onClick={(e) => {
              // Con teclado (Enter/Espacio) basta una pulsación; con el mouse se exige doble clic.
              if (e.detail === 0) onAlternarExtendida();
            }}
          >
            <span>Planograma activo</span>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d={extendida ? 'M4 10h6V4M10 10L3 3M20 14h-6v6M14 14l7 7' : 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7'} />
            </svg>
          </button>
        </div>
        {tiendas.map((t) => {
          const asignadas = asignadasPorTienda.get(t.id) ?? 0;
          const clase = `matriz-asignaciones__tienda matriz-asignaciones__tienda--${t.tipo.toLowerCase()}`;
          // Vista extendida: encabezado compacto, solo el código y los planogramas asignados. El nombre
          // y el tipo quedan en el title; el tipo también se ve en el color del borde superior.
          if (extendida) {
            const detalle = `${t.nombre} · ${TIPO_TIENDA_META[t.tipo].label} · ${asignadas} de ${totalPlanogramas} planogramas asignados`;
            return (
              <div key={t.id} role="columnheader" className={`${clase} matriz-asignaciones__tienda--compacta`} title={detalle} aria-label={`${t.codigo}: ${detalle}`}>
                <span className="matriz-asignaciones__tienda-codigo">{t.codigo}</span>
                <span className="matriz-asignaciones__tienda-asignadas">{asignadas}/{totalPlanogramas}</span>
              </div>
            );
          }
          return (
            <div key={t.id} role="columnheader" className={clase}>
              <span className="matriz-asignaciones__tienda-codigo">{t.codigo}</span>
              <span className="matriz-asignaciones__tienda-nombre">{t.nombre}</span>
              <span className="matriz-asignaciones__tienda-tipo" style={{ color: TIPO_TIENDA_META[t.tipo].color }}>
                {TIPO_TIENDA_META[t.tipo].label} · {asignadas}/{totalPlanogramas}
              </span>
            </div>
          );
        })}
        <div role="columnheader" className="matriz-asignaciones__esquina matriz-asignaciones__esquina--fin">Tiendas</div>
      </div>

      {planogramas.map((p) => {
        const asignadas = asignadasPorPlanograma.get(p.id) ?? 0;
        return (
          <div key={p.id} role="row" className="matriz-asignaciones__fila">
            <div role="rowheader" className="matriz-asignaciones__planograma">
              <IdentidadPlanograma nombre={p.nombre} descripcion={p.descripcion} variante="compacta" />
              <span className="matriz-asignaciones__planograma-meta">
                {p.departamento}
                <VersionesPlanograma versiones={p.versiones} />
              </span>
            </div>

            {tiendas.map((t) => {
              const k = clave(p.id, t.id);
              const d = describirCelda(asignaciones[k], t, versiones);
              const cambiada = (asignaciones[k] ?? '') !== (guardadas[k] ?? '');
              const resultado = editable ? resolver(p, t) : null;
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
