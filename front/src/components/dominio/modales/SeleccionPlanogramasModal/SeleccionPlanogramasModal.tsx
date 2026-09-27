import { usePlanogramasVigentes } from '../../../../hooks/usePlanogramas';
import { textoConteo } from '../../../../utils/formatters';
import {
  SeleccionMultipleModal,
  type ConteoPorElemento,
  type ElementoSeleccionado,
  type OpcionOrdenSeleccion,
} from '../../../ui/SeleccionMultipleModal/SeleccionMultipleModal';

/** Lo mínimo que necesita el selector; sirve para `PlanogramaListItem` y para la matriz de Estructura. */
export interface PlanogramaSeleccionable {
  id: number;
  nombre: string;
  departamento: string;
  totalVersiones: number;
}

interface SeleccionPlanogramasModalProps {
  /** Planogramas a ofrecer. Si se omite, el modal carga todos los no archivados. */
  planogramas?: PlanogramaSeleccionable[];
  seleccionados: ElementoSeleccionado[];
  conteo?: ConteoPorElemento;
  onAplicar: (seleccionados: ElementoSeleccionado[]) => void;
  onClose: () => void;
}

const porNombre = (a: PlanogramaSeleccionable, b: PlanogramaSeleccionable) => a.nombre.localeCompare(b.nombre, 'es');

// Departamento y versiones desempatan por nombre para que el orden sea estable.
const ORDENES: OpcionOrdenSeleccion<PlanogramaSeleccionable>[] = [
  { id: 'nombre', etiqueta: 'Nombre', comparar: porNombre },
  { id: 'departamento', etiqueta: 'Departamento', comparar: (a, b) => a.departamento.localeCompare(b.departamento, 'es') || porNombre(a, b) },
  { id: 'versiones', etiqueta: 'Versiones', comparar: (a, b) => a.totalVersiones - b.totalVersiones || porNombre(a, b) },
];

/** Selector múltiple de planogramas: devuelve en `onAplicar` la lista elegida. */
export function SeleccionPlanogramasModal({ planogramas, ...resto }: SeleccionPlanogramasModalProps) {
  if (planogramas) return <ListaPlanogramas planogramas={planogramas} cargando={false} {...resto} />;
  return <PlanogramasVigentes {...resto} />;
}

type PropsLista = Omit<SeleccionPlanogramasModalProps, 'planogramas'>;

function PlanogramasVigentes(props: PropsLista) {
  const { planogramas, cargando } = usePlanogramasVigentes();
  return <ListaPlanogramas planogramas={planogramas} cargando={cargando} {...props} />;
}

function ListaPlanogramas({
  planogramas,
  cargando,
  seleccionados,
  conteo,
  onAplicar,
  onClose,
}: PropsLista & { planogramas: PlanogramaSeleccionable[]; cargando: boolean }) {
  return (
    <SeleccionMultipleModal
      titulo="Filtrar por planograma"
      elementos={planogramas}
      cargando={cargando}
      obtenerId={(p) => p.id}
      obtenerNombre={(p) => p.nombre}
      textoBusqueda={(p) => `${p.nombre} ${p.departamento}`}
      placeholderBusqueda="Buscar por nombre o departamento"
      ordenes={ORDENES}
      renderDetalle={(p) => p.departamento}
      renderMeta={(p) => [
        textoConteo(p.totalVersiones, 'versión', 'versiones'),
        ...(conteo ? [textoConteo(conteo.porId.get(p.id) ?? 0, conteo.singular, conteo.plural)] : []),
      ]}
      seleccionados={seleccionados}
      textoVacio="No hay planogramas vigentes"
      onAplicar={onAplicar}
      onClose={onClose}
    />
  );
}
