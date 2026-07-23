import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { useAgregarPosicion } from '../../../../hooks/usePosiciones';
import { useAgregarNivel } from '../../../../hooks/useNiveles';
import { useToast } from '../../../../context/ToastContext';
import type { AccionAgregarNivel, AccionAgregarProducto, AccionBorrador } from '../../../../types/agenteExtractor';
import type { Nivel, NivelInput, TipoAccesorio } from '../../../../types/nivel';
import type { PosicionesDeNivel, PosicionInput } from '../../../../types/posicion';
import './ResumenBorradorModal.css';

interface ResumenBorradorModalProps {
  borrador: AccionBorrador[];
  gondolaId: number;
  niveles: Nivel[];
  posicionesPorNivel: Record<number, PosicionesDeNivel>;
  onClose: () => void;
  onConfirmado: () => void;
}

interface FilaNivel {
  key: string;
  tipoFila: 'nivel';
  accion: AccionAgregarNivel;
}

interface FilaProducto {
  key: string;
  tipoFila: 'producto';
  accion: AccionAgregarProducto;
  nivelOrdenResuelto: number | null;
  nivelEsNuevo: boolean;
  espacioResuelto: number;
}

type FilaResumen = FilaNivel | FilaProducto;

/** Resuelve, para cada acción del borrador, el nivel y el espacio que se van a usar al aplicar:
 * si el producto no da nivel, cae en el nivel 1 (regla de negocio pedida); si no da espacio, usa
 * el siguiente `orden_horizontal` libre de ese nivel. El "próximo espacio libre" se indexa por
 * `orden` de nivel (no por `nivelId`) porque un nivel todavía no creado no tiene id — así dos
 * productos que van al mismo nivel nuevo no colisionan en el mismo espacio. */
function resolverFilas(
  borrador: AccionBorrador[],
  niveles: Nivel[],
  posicionesPorNivel: Record<number, PosicionesDeNivel>,
): FilaResumen[] {
  const nivelPorOrden = new Map(niveles.map((n) => [n.orden, n]));
  const nivelPorDefecto = nivelPorOrden.get(1) ?? niveles[0] ?? null;
  const ordenesNuevos = new Set(
    borrador
      .filter((a): a is AccionAgregarNivel => a.tipo_accion === 'agregar_nivel' && !a.advertencia)
      .map((a) => a.orden),
  );
  const proximoEspacioPorOrdenNivel = new Map<number, number>();

  return borrador.map((accion, indice) => {
    if (accion.tipo_accion === 'agregar_nivel') {
      return { key: `nivel-${indice}-${accion.orden}`, tipoFila: 'nivel', accion };
    }

    const nivelReal = accion.nivel_orden !== undefined ? nivelPorOrden.get(accion.nivel_orden) : undefined;
    const nivelEsNuevo = !nivelReal && accion.nivel_orden !== undefined && ordenesNuevos.has(accion.nivel_orden);
    const nivelOrdenResuelto = nivelReal?.orden ?? (nivelEsNuevo ? (accion.nivel_orden as number) : nivelPorDefecto?.orden ?? null);

    let espacioResuelto: number;
    if (accion.espacio_orden !== undefined) {
      espacioResuelto = accion.espacio_orden;
    } else if (nivelOrdenResuelto !== null) {
      const base =
        proximoEspacioPorOrdenNivel.get(nivelOrdenResuelto) ??
        (nivelReal ? (posicionesPorNivel[nivelReal.id]?.posiciones.length ?? 0) + 1 : 1);
      espacioResuelto = base;
      proximoEspacioPorOrdenNivel.set(nivelOrdenResuelto, base + 1);
    } else {
      espacioResuelto = 1;
    }

    return {
      key: `producto-${indice}-${accion.sku}`,
      tipoFila: 'producto',
      accion,
      nivelOrdenResuelto,
      nivelEsNuevo,
      espacioResuelto,
    };
  });
}

function esFilaValida(fila: FilaResumen): boolean {
  if (fila.tipoFila === 'nivel') return !fila.accion.advertencia;
  return !fila.accion.advertencia && fila.nivelOrdenResuelto !== null;
}

export function ResumenBorradorModal({
  borrador,
  gondolaId,
  niveles,
  posicionesPorNivel,
  onClose,
  onConfirmado,
}: ResumenBorradorModalProps) {
  const { agregar: agregarPosicion } = useAgregarPosicion();
  const { agregar: agregarNivel } = useAgregarNivel();
  const { mostrarToast } = useToast();
  const [confirmando, setConfirmando] = useState(false);

  const filas = resolverFilas(borrador, niveles, posicionesPorNivel);
  const filasValidas = filas.filter(esFilaValida);

  async function onConfirmar() {
    if (confirmando || filasValidas.length === 0) return;
    setConfirmando(true);

    // Sembrado con los niveles reales; cada acción "agregar_nivel" exitosa agrega el suyo antes
    // de que se procesen las acciones "agregar_producto" que lo referencian (misma iteración,
    // en el orden del array — así se garantiza que el nivel exista antes de insertar en él).
    const nivelIdPorOrden = new Map(niveles.map((n) => [n.orden, n.id]));
    let productosOmitidos = 0;

    for (const fila of filasValidas) {
      if (fila.tipoFila === 'nivel') {
        const datos: NivelInput = {
          orden: fila.accion.orden,
          altura_desde_piso_cm: fila.accion.altura_desde_piso_cm as number,
          tipo_accesorio: fila.accion.tipo_accesorio as TipoAccesorio,
          // El schema de creación del backend no admite `null` en estos dos campos (solo el de
          // edición) — ver el mismo mapeo en NivelModal.tsx.
          codigo_accesorio_id: fila.accion.codigo_accesorio_id ?? undefined,
          tamano_accesorio_pulgadas: fila.accion.tamano_accesorio_pulgadas ?? undefined,
          ancho_disponible_cm: fila.accion.ancho_disponible_cm as number,
          notas: fila.accion.notas ?? null,
        };
        const nivelCreado = await agregarNivel(gondolaId, datos);
        if (nivelCreado) nivelIdPorOrden.set(nivelCreado.orden, nivelCreado.id);
        continue;
      }

      const nivelId = fila.nivelOrdenResuelto !== null ? nivelIdPorOrden.get(fila.nivelOrdenResuelto) : undefined;
      if (nivelId === undefined) {
        productosOmitidos += 1;
        continue;
      }

      const datos: PosicionInput = {
        sku: fila.accion.sku,
        orden_horizontal: fila.espacioResuelto,
        ancho_asignado_cm: 1,
        capacidad_maxima: 1,
        facings_horizontal: fila.accion.facings_horizontal,
        cantidad_apilable: fila.accion.cantidad_apilable,
        unidades_por_facing: fila.accion.unidades_por_facing,
        perfil_redondeo: fila.accion.perfil_redondeo,
        modo: fila.accion.modo,
        decision: fila.accion.decision,
      };
      await agregarPosicion(nivelId, datos);
    }

    setConfirmando(false);
    if (productosOmitidos > 0) {
      mostrarToast(
        `${productosOmitidos} producto(s) no se insertaron porque su nivel no se pudo crear.`,
        'error',
      );
    }
    onConfirmado();
  }

  const columnas: TableColumn<FilaResumen>[] = [
    { key: 'accion', header: 'Acción', render: (f) => (f.tipoFila === 'nivel' ? 'Nivel nuevo' : 'Producto') },
    {
      key: 'skuNivel',
      header: 'SKU / Nivel',
      render: (f) => (f.tipoFila === 'nivel' ? `Nivel ${f.accion.orden}` : f.accion.sku),
    },
    {
      key: 'detalle',
      header: 'Detalle',
      render: (f) =>
        f.tipoFila === 'nivel'
          ? `${f.accion.tipo_accesorio ?? '—'} · alto ${f.accion.altura_desde_piso_cm ?? '—'}cm · ancho ${
              f.accion.ancho_disponible_cm ?? '—'
            }cm`
          : f.accion.nombre ?? '—',
    },
    {
      key: 'nivelDestino',
      header: 'Nivel destino',
      render: (f) => {
        if (f.tipoFila === 'nivel' || f.nivelOrdenResuelto === null) return '—';
        return f.nivelEsNuevo ? `${f.nivelOrdenResuelto} (nuevo)` : f.nivelOrdenResuelto;
      },
    },
    { key: 'espacio', header: 'Espacio', render: (f) => (f.tipoFila === 'producto' ? f.espacioResuelto : '—') },
    { key: 'facings', header: 'Facings', render: (f) => (f.tipoFila === 'producto' ? f.accion.facings_horizontal : '—') },
    { key: 'apilable', header: 'Apilable', render: (f) => (f.tipoFila === 'producto' ? f.accion.cantidad_apilable : '—') },
    {
      key: 'unidFacing',
      header: 'Unid/facing',
      render: (f) => (f.tipoFila === 'producto' ? f.accion.unidades_por_facing : '—'),
    },
    { key: 'modo', header: 'Modo', render: (f) => (f.tipoFila === 'producto' ? f.accion.modo : '—') },
    { key: 'decision', header: 'Decisión', render: (f) => (f.tipoFila === 'producto' ? f.accion.decision : '—') },
    { key: 'advertencia', header: 'Advertencia', render: (f) => f.accion.advertencia ?? '—' },
  ];

  return (
    <Modal
      titulo="Resumen de acciones"
      onClose={onClose}
      ancho="xl"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={confirmando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={onConfirmar} disabled={confirmando || filasValidas.length === 0}>
            {confirmando ? 'Aplicando…' : `Confirmar y aplicar (${filasValidas.length})`}
          </Button>
        </>
      }
    >
      <div className="resumen-borrador-modal">
        {filas.length === 0 ? (
          <p className="resumen-borrador-modal__ayuda">Todavía no hay acciones en el borrador.</p>
        ) : (
          <Table<FilaResumen>
            columns={columnas}
            rows={filas}
            rowKey={(f) => f.key}
            rowClassName={(f) => (!esFilaValida(f) ? 'resumen-borrador-modal__fila--advertencia' : undefined)}
          />
        )}
      </div>
    </Modal>
  );
}
