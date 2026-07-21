import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { useProductosPorSubcategoria } from '../../../../hooks/useCatalogo';
import { useAgregarPosicion } from '../../../../hooks/usePosiciones';
import type { ProductoCatalogo } from '../../../../types/catalogo';
import type { PosicionInput } from '../../../../types/posicion';
import './ElegirProductoModal.css';

const PAGE_SIZE_PRODUCTOS = 50;

interface ElegirProductoModalProps {
  nivelId: number;
  proximoOrden: number;
  subcategorias: string[];
  onClose: () => void;
  onAgregada: () => void;
}

/** Las subcategorías del planograma pueden venir como "(idCati) nombre" (elegidas con el
 * explorador de jerarquía) o como texto libre (tipeadas a mano) — en ambos casos el valor se
 * manda tal cual al filtro `subcategoria` del catálogo. */
function parseSubcategoria(raw: string): { filtro: string; etiqueta: string } {
  const match = raw.match(/^\((.+?)\)\s*(.*)$/);
  if (match) return { filtro: match[1], etiqueta: match[2] || match[1] };
  return { filtro: raw, etiqueta: raw };
}

export function ElegirProductoModal({
  nivelId,
  proximoOrden,
  subcategorias,
  onClose,
  onAgregada,
}: ElegirProductoModalProps) {
  const { productos, cargando, error, buscar } = useProductosPorSubcategoria();
  const { agregar, enviando } = useAgregarPosicion();
  const [subcategoriaActiva, setSubcategoriaActiva] = useState('');

  function onElegirSubcategoria(raw: string) {
    setSubcategoriaActiva(raw);
    buscar(parseSubcategoria(raw).filtro, PAGE_SIZE_PRODUCTOS);
  }

  async function onElegirProducto(producto: ProductoCatalogo) {
    if (enviando) return;
    const datos: PosicionInput = {
      sku: producto.sku,
      orden_horizontal: proximoOrden,
      ancho_asignado_cm: 1,
      capacidad_maxima: 1,
      facings_horizontal: 1,
      cantidad_apilable: 1,
      unidades_por_facing: 1,
      perfil_redondeo: 'MRP',
      modo: 'PLANOGRAMA',
      decision: 'ACTIVO',
    };
    const resultado = await agregar(nivelId, datos);
    if (resultado) onAgregada();
  }

  return (
    <Modal
      titulo="Elegir producto"
      onClose={onClose}
      ancho="xl"
      footer={
        <Button variante="outline" onClick={onClose} disabled={enviando}>
          Cancelar
        </Button>
      }
    >
      <div className="elegir-producto-modal">
        {subcategorias.length === 0 ? (
          <EmptyState
            titulo="Este planograma no tiene subcategorías"
            hint="Agrega subcategorías de referencia desde la ficha del planograma para poder explorar productos acá."
          />
        ) : (
          <>
            <div className="elegir-producto-modal__chips">
              {subcategorias.map((raw) => (
                <button
                  key={raw}
                  type="button"
                  className={
                    'elegir-producto-modal__chip' +
                    (raw === subcategoriaActiva ? ' elegir-producto-modal__chip--activa' : '')
                  }
                  onClick={() => onElegirSubcategoria(raw)}
                >
                  {parseSubcategoria(raw).etiqueta}
                </button>
              ))}
            </div>

            {!subcategoriaActiva && (
              <p className="elegir-producto-modal__ayuda">Elegí una subcategoría para ver sus productos.</p>
            )}

            {error && (
              <p className="elegir-producto-modal__ayuda">No se pudo consultar el catálogo para esta subcategoría.</p>
            )}

            {subcategoriaActiva && (
              <Table<ProductoCatalogo>
                columns={[
                  { key: 'sku', header: 'SKU', render: (p) => p.sku },
                  { key: 'nombre', header: 'Nombre', render: (p) => p.nombre },
                  { key: 'marca', header: 'Marca', render: (p) => p.marca ?? '—' },
                  { key: 'modelo', header: 'Modelo', render: (p) => p.modelo ?? '—' },
                ]}
                rows={productos}
                rowKey={(p) => p.sku}
                onRowClick={onElegirProducto}
                vacio={
                  <p className="elegir-producto-modal__ayuda">
                    {cargando ? 'Cargando productos…' : 'Sin productos en esta subcategoría.'}
                  </p>
                }
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
