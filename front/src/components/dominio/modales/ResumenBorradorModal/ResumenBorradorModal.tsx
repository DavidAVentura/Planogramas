import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { useAgregarPosicion } from '../../../../hooks/usePosiciones';
import type { ItemBorrador } from '../../../../types/agenteExtractor';
import type { Nivel } from '../../../../types/nivel';
import type { PosicionesDeNivel, PosicionInput } from '../../../../types/posicion';
import './ResumenBorradorModal.css';

interface ResumenBorradorModalProps {
  borrador: ItemBorrador[];
  niveles: Nivel[];
  posicionesPorNivel: Record<number, PosicionesDeNivel>;
  onClose: () => void;
  onConfirmado: () => void;
}

interface FilaResumen extends ItemBorrador {
  nivelId: number | null;
  nivelOrdenResuelto: number | null;
  espacioResuelto: number;
}

/** Resuelve, para cada item del borrador, el nivel y el espacio que se van a usar al insertar:
 * si el usuario no dio nivel, cae en el nivel 1 (regla de negocio pedida); si no dio espacio,
 * usa el siguiente `orden_horizontal` libre de ese nivel — mismo cálculo que `proximoOrden` en
 * PosicionesPanel/ElegirProductoModal. */
function resolverFilas(
  borrador: ItemBorrador[],
  niveles: Nivel[],
  posicionesPorNivel: Record<number, PosicionesDeNivel>,
): FilaResumen[] {
  const nivelPorOrden = new Map(niveles.map((n) => [n.orden, n]));
  const nivelPorDefecto = nivelPorOrden.get(1) ?? niveles[0] ?? null;
  const proximoOrdenPorNivel = new Map<number, number>();

  return borrador.map((item) => {
    const nivel = (item.nivel_orden !== undefined ? nivelPorOrden.get(item.nivel_orden) : undefined) ?? nivelPorDefecto;
    const nivelId = nivel?.id ?? null;

    let espacioResuelto: number;
    if (item.espacio_orden !== undefined) {
      espacioResuelto = item.espacio_orden;
    } else if (nivelId !== null) {
      const base = proximoOrdenPorNivel.get(nivelId) ?? (posicionesPorNivel[nivelId]?.posiciones.length ?? 0) + 1;
      espacioResuelto = base;
      proximoOrdenPorNivel.set(nivelId, base + 1);
    } else {
      espacioResuelto = 1;
    }

    return { ...item, nivelId, nivelOrdenResuelto: nivel?.orden ?? null, espacioResuelto };
  });
}

export function ResumenBorradorModal({
  borrador,
  niveles,
  posicionesPorNivel,
  onClose,
  onConfirmado,
}: ResumenBorradorModalProps) {
  const { agregar } = useAgregarPosicion();
  const [confirmando, setConfirmando] = useState(false);

  const filas = resolverFilas(borrador, niveles, posicionesPorNivel);
  const filasValidas = filas.filter((f) => !f.advertencia && f.nivelId !== null);

  async function onConfirmar() {
    if (confirmando || filasValidas.length === 0) return;
    setConfirmando(true);
    for (const fila of filasValidas) {
      const datos: PosicionInput = {
        sku: fila.sku,
        orden_horizontal: fila.espacioResuelto,
        ancho_asignado_cm: 1,
        capacidad_maxima: 1,
        facings_horizontal: fila.facings_horizontal,
        cantidad_apilable: fila.cantidad_apilable,
        unidades_por_facing: fila.unidades_por_facing,
        perfil_redondeo: fila.perfil_redondeo,
        modo: fila.modo,
        decision: fila.decision,
      };
      await agregar(fila.nivelId as number, datos);
    }
    setConfirmando(false);
    onConfirmado();
  }

  const columnas: TableColumn<FilaResumen>[] = [
    { key: 'sku', header: 'SKU', render: (f) => f.sku },
    { key: 'nombre', header: 'Nombre', render: (f) => f.nombre ?? '—' },
    { key: 'nivel', header: 'Nivel', render: (f) => f.nivelOrdenResuelto ?? '—' },
    { key: 'espacio', header: 'Espacio', render: (f) => f.espacioResuelto },
    { key: 'facings', header: 'Facings', render: (f) => f.facings_horizontal },
    { key: 'apilable', header: 'Apilable', render: (f) => f.cantidad_apilable },
    { key: 'unidFacing', header: 'Unid/facing', render: (f) => f.unidades_por_facing },
    { key: 'modo', header: 'Modo', render: (f) => f.modo },
    { key: 'decision', header: 'Decisión', render: (f) => f.decision },
    { key: 'advertencia', header: 'Advertencia', render: (f) => f.advertencia ?? '—' },
  ];

  return (
    <Modal
      titulo="Resumen de inserciones"
      onClose={onClose}
      ancho="xl"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={confirmando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={onConfirmar} disabled={confirmando || filasValidas.length === 0}>
            {confirmando ? 'Insertando…' : `Confirmar e insertar (${filasValidas.length})`}
          </Button>
        </>
      }
    >
      <div className="resumen-borrador-modal">
        {filas.length === 0 ? (
          <p className="resumen-borrador-modal__ayuda">Todavía no hay productos en el borrador.</p>
        ) : (
          <Table<FilaResumen>
            columns={columnas}
            rows={filas}
            rowKey={(f) => f.sku}
            rowClassName={(f) =>
              f.advertencia || f.nivelId === null ? 'resumen-borrador-modal__fila--advertencia' : undefined
            }
          />
        )}
      </div>
    </Modal>
  );
}
