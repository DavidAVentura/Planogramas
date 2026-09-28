import { TIPOS_TIENDA, TIPO_TIENDA_META } from '../../../../constants/tiendas';
import type { TipoTienda } from '../../../../types/tienda';
import { textoConteo } from '../../../../utils/formatters';
import {
  SeleccionMultipleModal,
  type ConteoPorElemento,
  type ElementoSeleccionado,
  type OpcionOrdenSeleccion,
} from '../../../ui/SeleccionMultipleModal/SeleccionMultipleModal';

/** Lo mínimo que necesita el selector; sirve para `Tienda` y para `TiendaMatriz`. */
export interface TiendaSeleccionable {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoTienda;
  marca: string | null;
}

interface SeleccionTiendasModalProps {
  tiendas: TiendaSeleccionable[];
  seleccionados: ElementoSeleccionado[];
  conteo?: ConteoPorElemento;
  onAplicar: (seleccionados: ElementoSeleccionado[]) => void;
  onClose: () => void;
}

const SIN_MARCA = 'Sin marca';

const porNombre = (a: TiendaSeleccionable, b: TiendaSeleccionable) => a.nombre.localeCompare(b.nombre, 'es');

// Tipo sigue el orden de tamaño (Express → Grande), no el alfabético. Los empates van por nombre.
const ORDENES: OpcionOrdenSeleccion<TiendaSeleccionable>[] = [
  { id: 'nombre', etiqueta: 'Nombre', comparar: porNombre },
  { id: 'tipo', etiqueta: 'Tipo', comparar: (a, b) => TIPOS_TIENDA.indexOf(a.tipo) - TIPOS_TIENDA.indexOf(b.tipo) || porNombre(a, b) },
  { id: 'marca', etiqueta: 'Marca', comparar: (a, b) => (a.marca ?? SIN_MARCA).localeCompare(b.marca ?? SIN_MARCA, 'es') || porNombre(a, b) },
  { id: 'codigo', etiqueta: 'Código', comparar: (a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }) },
];

/** Selector múltiple de tiendas: devuelve en `onAplicar` la lista elegida. */
export function SeleccionTiendasModal({ tiendas, seleccionados, conteo, onAplicar, onClose }: SeleccionTiendasModalProps) {
  return (
    <SeleccionMultipleModal
      titulo="Filtrar por tienda"
      elementos={tiendas}
      obtenerId={(t) => t.id}
      obtenerNombre={(t) => t.nombre}
      textoBusqueda={(t) => `${t.nombre} ${t.codigo} ${t.marca ?? ''} ${TIPO_TIENDA_META[t.tipo].label}`}
      placeholderBusqueda="Buscar por nombre, código, marca o tipo"
      ordenes={ORDENES}
      renderDetalle={(t) => `${t.codigo} · ${t.marca ?? SIN_MARCA}`}
      renderMeta={(t) => [
        TIPO_TIENDA_META[t.tipo].label,
        ...(conteo ? [textoConteo(conteo.porId.get(t.id) ?? 0, conteo.singular, conteo.plural)] : []),
      ]}
      seleccionados={seleccionados}
      textoVacio="No hay tiendas"
      onAplicar={onAplicar}
      onClose={onClose}
    />
  );
}
