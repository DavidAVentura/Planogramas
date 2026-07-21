import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useAgregarPosicion } from '../../../../hooks/usePosiciones';
import { useBuscarProductosCatalogo } from '../../../../hooks/useCatalogo';
import {
  DECISIONES_POSICION,
  MODOS_POSICION,
  PERFILES_REDONDEO,
  type DecisionPosicion,
  type ModoPosicion,
  type PerfilRedondeo,
  type PosicionCampos,
} from '../../../../types/posicion';
import './PosicionFormModal.css';

const ETIQUETAS_PERFIL: Record<PerfilRedondeo, string> = {
  MRP: 'MRP (no se rompe empaque)',
  ZSRE: 'ZSRE (se puede romper)',
};

const ETIQUETAS_MODO: Record<ModoPosicion, string> = {
  PLANOGRAMA: 'Planograma',
  CROSS: 'Cross',
};

const ETIQUETAS_DECISION: Record<DecisionPosicion, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

interface PosicionFormModalProps {
  nivelId: number;
  proximoOrden: number;
  onClose: () => void;
  onGuardada: () => void;
}

export function PosicionFormModal({ nivelId, proximoOrden, onClose, onGuardada }: PosicionFormModalProps) {
  const { agregar, enviando } = useAgregarPosicion();
  const { productos, cargando: buscando, error: errorBusqueda, buscar } = useBuscarProductosCatalogo();

  const [sku, setSku] = useState('');
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [ordenHorizontal, setOrdenHorizontal] = useState(String(proximoOrden));
  const [anchoCm, setAnchoCm] = useState('');
  const [facings, setFacings] = useState('1');
  const [cantidadApilable, setCantidadApilable] = useState('1');
  const [unidadesPorFacing, setUnidadesPorFacing] = useState('1');
  const [capacidadMaxima, setCapacidadMaxima] = useState('');
  const [minEstetico, setMinEstetico] = useState('');
  const [minFinal, setMinFinal] = useState('');
  const [maxFinal, setMaxFinal] = useState('');
  const [perfilRedondeo, setPerfilRedondeo] = useState<PerfilRedondeo>('MRP');
  const [modo, setModo] = useState<ModoPosicion>('PLANOGRAMA');
  const [decision, setDecision] = useState<DecisionPosicion>('ACTIVO');

  function onBuscarCatalogo(valor: string) {
    setBusquedaCatalogo(valor);
    buscar(valor);
  }

  function seleccionarProducto(productoSku: string, anchoProductoCm: number | null) {
    setSku(productoSku);
    setBusquedaCatalogo('');
    if (!anchoCm && anchoProductoCm != null) {
      setAnchoCm(String(anchoProductoCm * Number(facings || '1')));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const campos: PosicionCampos = {
      ancho_asignado_cm: Number(anchoCm),
      facings_horizontal: Number(facings),
      cantidad_apilable: Number(cantidadApilable),
      unidades_por_facing: Number(unidadesPorFacing),
      capacidad_maxima: capacidadMaxima ? Number(capacidadMaxima) : undefined,
      min_estetico: minEstetico ? Number(minEstetico) : undefined,
      min_final: minFinal ? Number(minFinal) : undefined,
      max_final: maxFinal ? Number(maxFinal) : undefined,
      perfil_redondeo: perfilRedondeo,
      modo,
      decision,
    };

    const resultado = await agregar(nivelId, { ...campos, sku: sku.trim(), orden_horizontal: Number(ordenHorizontal) });
    if (resultado) onGuardada();
  }

  return (
    <Modal
      titulo="Agregar posición"
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="posicion-form" disabled={enviando}>
            Agregar
          </Button>
        </>
      }
    >
      <form id="posicion-form" className="posicion-form" onSubmit={onSubmit}>
        <label className="posicion-form__campo">
          <span>Buscar producto en el catálogo (opcional)</span>
          <input
            type="text"
            value={busquedaCatalogo}
            onChange={(e) => onBuscarCatalogo(e.target.value)}
            placeholder="Nombre, marca o SKU"
          />
        </label>
        {buscando && <p className="posicion-form__ayuda">Buscando…</p>}
        {errorBusqueda && (
          <p className="posicion-form__ayuda">No se pudo consultar el catálogo. Escribe el SKU manualmente abajo.</p>
        )}
        {productos.length > 0 && (
          <ul className="posicion-form__resultados">
            {productos.map((p) => (
              <li key={p.sku}>
                <button type="button" onClick={() => seleccionarProducto(p.sku, p.ancho_cm)}>
                  <span className="posicion-form__resultado-sku">{p.sku}</span>
                  <span>{p.nombre}</span>
                  {p.marca && <span className="posicion-form__resultado-marca">{p.marca}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="posicion-form__fila">
          <label className="posicion-form__campo">
            <span>SKU</span>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} required />
          </label>
          <label className="posicion-form__campo">
            <span>Orden horizontal</span>
            <input
              type="number"
              min="1"
              value={ordenHorizontal}
              onChange={(e) => setOrdenHorizontal(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="posicion-form__fila">
          <label className="posicion-form__campo">
            <span>Ancho asignado (cm)</span>
            <input type="number" min="0.1" step="0.1" value={anchoCm} onChange={(e) => setAnchoCm(e.target.value)} required />
          </label>
          <label className="posicion-form__campo">
            <span>Facings horizontales</span>
            <input type="number" min="1" step="1" value={facings} onChange={(e) => setFacings(e.target.value)} required />
          </label>
        </div>

        <div className="posicion-form__fila">
          <label className="posicion-form__campo">
            <span>Cantidad apilable</span>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidadApilable}
              onChange={(e) => setCantidadApilable(e.target.value)}
              required
            />
          </label>
          <label className="posicion-form__campo">
            <span>Unidades por facing</span>
            <input
              type="number"
              min="1"
              step="1"
              value={unidadesPorFacing}
              onChange={(e) => setUnidadesPorFacing(e.target.value)}
              required
            />
          </label>
          <label className="posicion-form__campo">
            <span>Capacidad máxima</span>
            <input
              type="number"
              min="1"
              step="1"
              value={capacidadMaxima}
              onChange={(e) => setCapacidadMaxima(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="posicion-form__fila">
          <label className="posicion-form__campo">
            <span>Mínimo estético (opcional)</span>
            <input type="number" min="0" step="1" value={minEstetico} onChange={(e) => setMinEstetico(e.target.value)} />
          </label>
          <label className="posicion-form__campo">
            <span>Mínimo final (opcional)</span>
            <input type="number" min="0" step="1" value={minFinal} onChange={(e) => setMinFinal(e.target.value)} />
          </label>
          <label className="posicion-form__campo">
            <span>Máximo final (opcional)</span>
            <input type="number" min="0" step="1" value={maxFinal} onChange={(e) => setMaxFinal(e.target.value)} />
          </label>
        </div>

        <div className="posicion-form__fila">
          <label className="posicion-form__campo">
            <span>Perfil de redondeo</span>
            <select value={perfilRedondeo} onChange={(e) => setPerfilRedondeo(e.target.value as PerfilRedondeo)}>
              {PERFILES_REDONDEO.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_PERFIL[valor]}
                </option>
              ))}
            </select>
          </label>
          <label className="posicion-form__campo">
            <span>Modo</span>
            <select value={modo} onChange={(e) => setModo(e.target.value as ModoPosicion)}>
              {MODOS_POSICION.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_MODO[valor]}
                </option>
              ))}
            </select>
          </label>
          <label className="posicion-form__campo">
            <span>Decisión</span>
            <select value={decision} onChange={(e) => setDecision(e.target.value as DecisionPosicion)}>
              {DECISIONES_POSICION.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_DECISION[valor]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </Modal>
  );
}
