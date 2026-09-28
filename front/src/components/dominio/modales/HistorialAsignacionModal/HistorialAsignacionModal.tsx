import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { ChipVersion } from '../../estructura/ChipVersion/ChipVersion';
import { useHistorialAsignacion } from '../../../../hooks/useAsignaciones';
import { TIPO_TIENDA_META } from '../../../../constants/tiendas';
import {
  ACCION_META,
  ORIGEN_LEGIBLE,
  describirAuditada,
  formatoEdicion,
  type VarianteChip,
} from '../../../../domain/estructura/asignaciones';
import { formatearFechaHora } from '../../../../utils/formatters';
import type { PlanogramaMatriz, TiendaMatriz, VersionMatriz } from '../../../../types/asignacion';
import './HistorialAsignacionModal.css';

type Chip = { texto: string; variante: VarianteChip };

interface HistorialAsignacionModalProps {
  planograma: PlanogramaMatriz;
  tienda: TiendaMatriz;
  versiones: Map<number, VersionMatriz>;
  /** Lo que la tienda tiene guardado hoy. */
  actual: Chip;
  /** Cambio de la celda todavía sin guardar, si lo hay. */
  pendiente: { antes: Chip; despues: Chip } | null;
  onClose: () => void;
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

export function HistorialAsignacionModal({ planograma, tienda, versiones, actual, pendiente, onClose }: HistorialAsignacionModalProps) {
  const { eventos, cargando } = useHistorialAsignacion(planograma.id, tienda.id);

  return (
    <Modal
      titulo={`Historial · ${planograma.nombre}`}
      ancho="lg"
      claseModal="historial-asignacion"
      onClose={onClose}
      footer={
        <>
          <span className="historial-asignacion__pie">
            {cargando ? 'Cargando…' : `${eventos.length} ${eventos.length === 1 ? 'movimiento' : 'movimientos'} · más reciente primero`}
          </span>
          <Button variante="outline" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="historial-asignacion__celda">
        <span className="mono">{tienda.codigo}</span>
        <strong>{tienda.nombre}</strong>
        <span>· Tienda {TIPO_TIENDA_META[tienda.tipo].label.toLowerCase()} · Hoy usa</span>
        <ChipVersion texto={actual.texto} variante={actual.variante} />
      </div>

      {pendiente && (
        <div className="historial-asignacion__pendiente">
          Cambio sin guardar:
          <ChipVersion texto={pendiente.antes.texto} variante={pendiente.antes.variante} />→
          <ChipVersion texto={pendiente.despues.texto} variante={pendiente.despues.variante} />
          <span>Aún no queda en el historial.</span>
        </div>
      )}

      {!cargando && eventos.length === 0 && (
        <EmptyState titulo="Sin movimientos registrados" hint="Esta tienda nunca ha usado ni probado este planograma." />
      )}

      <ol className="historial-asignacion__linea">
        {eventos.map((ev) => {
          const meta = ACCION_META[ev.accion];
          const antes = describirAuditada(ev.anterior, tienda, versiones);
          const despues = describirAuditada(ev.nueva, tienda, versiones);
          const origen = ORIGEN_LEGIBLE[ev.origen];
          return (
            <li key={ev.id} className={`historial-asignacion__evento historial-asignacion__evento--${meta.variante}`}>
              <div className="historial-asignacion__cabecera">
                <span className="historial-asignacion__accion">{meta.etiqueta}</span>
                <span className="historial-asignacion__fecha">{formatearFechaHora(ev.fecha)}</span>
                <span className="historial-asignacion__edicion" title="Todos los cambios guardados juntos comparten este id">
                  {formatoEdicion(ev.edicionId)} · {ev.cambiosEnEdicion} {ev.cambiosEnEdicion === 1 ? 'cambio' : 'cambios'}
                </span>
              </div>
              <div className="historial-asignacion__transicion">
                <span className="historial-asignacion__version">
                  <ChipVersion texto={antes.texto} variante={antes.variante} />
                  <span className="mono">{ev.anterior?.codigo ?? '—'}</span>
                </span>
                <span aria-label="pasa a">→</span>
                <span className="historial-asignacion__version">
                  <ChipVersion texto={despues.texto} variante={despues.variante} />
                  <span className="mono">{ev.nueva?.codigo ?? '—'}</span>
                </span>
              </div>
              <div className="historial-asignacion__usuario">
                <span className="historial-asignacion__avatar" aria-hidden="true">{iniciales(ev.usuario.nombre)}</span>
                <strong>{ev.usuario.nombre}</strong>
                <span className="mono">N.º {ev.usuario.numero}</span>
                {origen && <span className="historial-asignacion__origen">{origen}</span>}
              </div>
              {ev.motivo && <p className="historial-asignacion__motivo">{ev.motivo}</p>}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}
