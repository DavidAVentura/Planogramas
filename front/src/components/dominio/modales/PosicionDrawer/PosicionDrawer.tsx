import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Drawer } from '../../../ui/Drawer/Drawer';
import { Button } from '../../../ui/Button/Button';
import {
  useAgregarAccesorioPosicion,
  useEditarPosicion,
  useEliminarAccesorioPosicion,
  usePosicionAccesorios,
  usePosicionDetalle,
} from '../../../../hooks/usePosiciones';
import { useProductoCatalogo } from '../../../../hooks/useCatalogo';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import {
  DECISIONES_POSICION,
  MODOS_POSICION,
  PERFILES_REDONDEO,
  type DecisionPosicion,
  type ModoPosicion,
  type PerfilRedondeo,
} from '../../../../types/posicion';
import './PosicionDrawer.css';

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

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="posicion-drawer__seccion">
      <h3 className="posicion-drawer__seccion-titulo">{titulo}</h3>
      <div className="posicion-drawer__seccion-contenido">{children}</div>
    </section>
  );
}

interface PosicionDrawerProps {
  posicionId: number;
  onClose: () => void;
  onCambio: () => void;
}

export function PosicionDrawer({ posicionId, onClose, onCambio }: PosicionDrawerProps) {
  const { posicion, cargando, recargar } = usePosicionDetalle(posicionId);
  const { producto, cargando: cargandoProducto, error: errorProducto } = useProductoCatalogo(posicion?.sku ?? null);
  const { editar, enviando } = useEditarPosicion();
  const { accesorios, cargando: cargandoAccesorios, recargar: recargarAccesorios } = usePosicionAccesorios(posicionId);
  const { accesorios: catalogoAccesorios, cargando: cargandoCatalogoAccesorios } = useAccesorios();
  const { agregar: agregarAccesorio, enviando: agregandoAccesorio } = useAgregarAccesorioPosicion();
  const { eliminar: eliminarAccesorio, enviando: eliminandoAccesorio } = useEliminarAccesorioPosicion();

  const [anchoCm, setAnchoCm] = useState('');
  const [facings, setFacings] = useState('');
  const [cantidadApilable, setCantidadApilable] = useState('');
  const [unidadesPorFacing, setUnidadesPorFacing] = useState('');
  const [perfilRedondeo, setPerfilRedondeo] = useState<PerfilRedondeo>('MRP');
  const [minEstetico, setMinEstetico] = useState('');
  const [minFinal, setMinFinal] = useState('');
  const [maxFinal, setMaxFinal] = useState('');
  const [crossExterno, setCrossExterno] = useState(false);
  const [montarEnDisplay, setMontarEnDisplay] = useState(false);
  const [modo, setModo] = useState<ModoPosicion>('PLANOGRAMA');
  const [decision, setDecision] = useState<DecisionPosicion>('ACTIVO');
  const [observaciones, setObservaciones] = useState('');
  const [desbordaGondola, setDesbordaGondola] = useState(false);
  const [notaDesborde, setNotaDesborde] = useState('');

  const [accesorioSeleccionado, setAccesorioSeleccionado] = useState('');
  const [notaAccesorio, setNotaAccesorio] = useState('');

  const [dimAnchoCm, setDimAnchoCm] = useState('');
  const [dimAltoCm, setDimAltoCm] = useState('');
  const [dimProfundidadCm, setDimProfundidadCm] = useState('');

  useLayoutEffect(() => {
    if (!posicion) return;
    setAnchoCm(String(posicion.ancho_asignado_cm));
    setFacings(String(posicion.facings_horizontal));
    setCantidadApilable(String(posicion.cantidad_apilable));
    setUnidadesPorFacing(String(posicion.unidades_por_facing));
    setPerfilRedondeo(posicion.perfil_redondeo);
    setMinFinal(posicion.min_final != null ? String(posicion.min_final) : '');
    setMaxFinal(posicion.max_final != null ? String(posicion.max_final) : '');
    setCrossExterno(posicion.cross_externo);
    setMontarEnDisplay(posicion.montar_en_display);
    setModo(posicion.modo);
    setDecision(posicion.decision);
    setObservaciones(posicion.observaciones ?? '');
    setDesbordaGondola(posicion.desborda_gondola);
    setNotaDesborde(posicion.nota_desborde ?? '');
  }, [posicion]);

  useEffect(() => {
    if (!producto) return;
    setDimAnchoCm(producto.ancho_cm != null ? String(producto.ancho_cm) : '');
    setDimAltoCm(producto.alto_cm != null ? String(producto.alto_cm) : '');
    setDimProfundidadCm(producto.profundidad_cm != null ? String(producto.profundidad_cm) : '');
  }, [producto]);

  const facingsNum = Number(facings) || 0;
  const cantidadApilableNum = Number(cantidadApilable) || 0;
  const unidadesPorFacingNum = Number(unidadesPorFacing) || 0;
  const capacidadMaximaCalculada = facingsNum * cantidadApilableNum * unidadesPorFacingNum;
  const minEsteticoBloqueado = unidadesPorFacingNum >= 4;

  // Capacidad máxima y mínimo estético son calculados, no ingresados a mano (ver PosicionDrawer):
  // capacidad_maxima = facings × apilable × unidades_por_facing siempre; min_estetico = 3×facings+1
  // si unidades_por_facing >= 4, o si no, el mismo valor que capacidad_maxima (pero editable en ese caso).
  useEffect(() => {
    setMinEstetico(String(minEsteticoBloqueado ? facingsNum * 3 + 1 : capacidadMaximaCalculada));
  }, [facingsNum, cantidadApilableNum, unidadesPorFacingNum, minEsteticoBloqueado, capacidadMaximaCalculada]);

  if (cargando || !posicion) {
    return (
      <Drawer titulo="Posición" onClose={onClose} ancho="lg">
        <p className="posicion-drawer__cargando">Cargando posición…</p>
      </Drawer>
    );
  }

  const notaDesbordeInvalida = desbordaGondola && !notaDesborde.trim();
  const minMaxInvalido = minFinal !== '' && maxFinal !== '' && Number(minFinal) > Number(maxFinal);

  async function onGuardar() {
    if (notaDesbordeInvalida || minMaxInvalido) return;

    const dimAnchoNum = Number(dimAnchoCm) || 0;
    const anchoAsignadoFinal =
      facingsNum !== 0 && dimAnchoNum !== 0 ? facingsNum * dimAnchoNum : Number(anchoCm);

    const resultado = await editar(posicionId, {
      ancho_asignado_cm: anchoAsignadoFinal,
      facings_horizontal: Number(facings),
      cantidad_apilable: Number(cantidadApilable),
      unidades_por_facing: Number(unidadesPorFacing),
      capacidad_maxima: capacidadMaximaCalculada,
      perfil_redondeo: perfilRedondeo,
      min_estetico: minEstetico ? Number(minEstetico) : null,
      min_final: minFinal ? Number(minFinal) : null,
      max_final: maxFinal ? Number(maxFinal) : null,
      cross_externo: crossExterno,
      montar_en_display: montarEnDisplay,
      modo,
      decision,
      observaciones: observaciones.trim() || null,
      desborda_gondola: desbordaGondola,
      nota_desborde: desbordaGondola ? notaDesborde.trim() : null,
    });

    if (resultado) {
      setAnchoCm(String(anchoAsignadoFinal));
      recargar();
      onCambio();
    }
  }

  function onActualizarMedidas() {
    const dimAnchoNum = Number(dimAnchoCm) || 0;
    if (facingsNum === 0 || dimAnchoNum === 0) return;
    setAnchoCm(String(facingsNum * dimAnchoNum));
  }

  function onFacingsChange(valor: string) {
    setFacings(valor);
    const facingsNuevoNum = Number(valor) || 0;
    const dimAnchoNum = Number(dimAnchoCm) || 0;
    if (facingsNuevoNum === 0 || dimAnchoNum === 0) return;
    setAnchoCm(String(facingsNuevoNum * dimAnchoNum));
  }

  async function onAgregarAccesorio() {
    if (!accesorioSeleccionado) return;
    const agregado = await agregarAccesorio(posicionId, {
      accesorio_id: Number(accesorioSeleccionado),
      nota_libre: notaAccesorio.trim() || null,
    });
    if (agregado) {
      setAccesorioSeleccionado('');
      setNotaAccesorio('');
      recargarAccesorios();
      onCambio();
    }
  }

  async function onQuitarAccesorio(posicionAccesorioId: number) {
    const quitado = await eliminarAccesorio(posicionId, posicionAccesorioId);
    if (quitado) {
      recargarAccesorios();
      onCambio();
    }
  }

  return (
    <Drawer
      titulo={`Posición · SKU ${posicion.sku}`}
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cerrar
          </Button>
          <Button onClick={onGuardar} disabled={enviando || notaDesbordeInvalida || minMaxInvalido}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <Seccion titulo="Producto">
        <div className="posicion-drawer__producto">
          {producto?.imagen_url && <img src={producto.imagen_url} alt={producto.nombre} />}
          <div className="posicion-drawer__producto-info">
            <span className="posicion-drawer__producto-sku">{posicion.sku}</span>
            {cargandoProducto && <span className="posicion-drawer__ayuda">Cargando información del producto…</span>}
            {errorProducto && (
              <span className="posicion-drawer__ayuda">
                No se pudo obtener información del catálogo para este SKU.
              </span>
            )}
            {producto && (
              <>
                <span className="posicion-drawer__producto-nombre">{producto.nombre}</span>
                {producto.marca && <span>Marca: {producto.marca}</span>}
                {producto.subcategoria && <span>Subcategoría: {producto.subcategoria}</span>}
                {(producto.ancho_cm || producto.alto_cm || producto.profundidad_cm) && (
                  <span>
                    Dimensiones: {producto.ancho_cm ?? '—'} × {producto.alto_cm ?? '—'} × {producto.profundidad_cm ?? '—'} cm
                  </span>
                )}
                {producto.precio != null && <span>Precio: Q{producto.precio.toFixed(2)}</span>}
                {producto.sku_sustituto && <span>SKU sustituto recomendado: {producto.sku_sustituto}</span>}
              </>
            )}
          </div>
        </div>

        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>Ancho del producto (cm)</span>
            <input type="number" min="0" step="0.1" value={dimAnchoCm} onChange={(e) => setDimAnchoCm(e.target.value)} />
          </label>
          <label className="posicion-drawer__campo">
            <span>Alto del producto (cm)</span>
            <input type="number" min="0" step="0.1" value={dimAltoCm} onChange={(e) => setDimAltoCm(e.target.value)} />
          </label>
          <label className="posicion-drawer__campo">
            <span>Profundidad del producto (cm)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={dimProfundidadCm}
              onChange={(e) => setDimProfundidadCm(e.target.value)}
            />
          </label>
        </div>
        <Button
          variante="outline"
          type="button"
          onClick={onActualizarMedidas}
          disabled={facingsNum === 0 || Number(dimAnchoCm) === 0}
        >
          Actualizar medidas
        </Button>
        <span className="posicion-drawer__ayuda">
          Estas medidas no se guardan en el catálogo — actualiza el ancho asignado con facings horizontales × ancho
          del producto (o se recalcula solo al guardar), salvo que alguna de las dos sea 0.
        </span>
      </Seccion>

      <Seccion titulo="Espacio y facings">
        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>Ancho asignado (cm)</span>
            <input type="number" min="0.1" step="0.1" value={anchoCm} onChange={(e) => setAnchoCm(e.target.value)} />
          </label>
          <label className="posicion-drawer__campo">
            <span>Facings horizontales</span>
            <input type="number" min="1" step="1" value={facings} onChange={(e) => onFacingsChange(e.target.value)} />
          </label>
        </div>
        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>Cantidad apilable</span>
            <input
              type="number"
              min="1"
              step="1"
              value={cantidadApilable}
              onChange={(e) => setCantidadApilable(e.target.value)}
            />
          </label>
          <label className="posicion-drawer__campo">
            <span>Unidades por facing</span>
            <input
              type="number"
              min="1"
              step="1"
              value={unidadesPorFacing}
              onChange={(e) => setUnidadesPorFacing(e.target.value)}
            />
          </label>
        </div>
      </Seccion>

      <Seccion titulo="Capacidad">
        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>Capacidad máxima (calculada: facings × apilable × unidades por facing)</span>
            <input type="number" value={capacidadMaximaCalculada} disabled />
          </label>
          <label className="posicion-drawer__campo">
            <span>Perfil de redondeo</span>
            <select value={perfilRedondeo} onChange={(e) => setPerfilRedondeo(e.target.value as PerfilRedondeo)}>
              {PERFILES_REDONDEO.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_PERFIL[valor]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Seccion>

      <Seccion titulo="Reposición">
        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>
              Mínimo estético
              {minEsteticoBloqueado ? ' (calculado: 3 × facings + 1)' : ' (editable — por defecto, la capacidad máxima)'}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={minEstetico}
              onChange={(e) => setMinEstetico(e.target.value)}
              disabled={minEsteticoBloqueado}
            />
          </label>
          <label className="posicion-drawer__campo">
            <span>Mínimo final</span>
            <input type="number" min="0" step="1" value={minFinal} onChange={(e) => setMinFinal(e.target.value)} />
          </label>
          <label className="posicion-drawer__campo">
            <span>Máximo final</span>
            <input type="number" min="0" step="1" value={maxFinal} onChange={(e) => setMaxFinal(e.target.value)} />
          </label>
        </div>
        {minMaxInvalido && <p className="posicion-drawer__error">El mínimo final no puede ser mayor al máximo final.</p>}
      </Seccion>

      <Seccion titulo="Montaje">
        <ul className="posicion-drawer__accesorios">
          {accesorios.map((a) => (
            <li key={a.id}>
              <span>
                {a.accesorio.codigo} · {a.accesorio.nombre} ({a.accesorio.tipo})
                {a.nota_libre && ` — ${a.nota_libre}`}
              </span>
              <button type="button" onClick={() => onQuitarAccesorio(a.id)} disabled={eliminandoAccesorio}>
                Quitar
              </button>
            </li>
          ))}
          {!cargandoAccesorios && accesorios.length === 0 && (
            <li className="posicion-drawer__accesorios-vacio">Sin accesorios de montaje asignados.</li>
          )}
        </ul>

        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>Accesorio del catálogo</span>
            <select
              value={accesorioSeleccionado}
              onChange={(e) => setAccesorioSeleccionado(e.target.value)}
              disabled={cargandoCatalogoAccesorios}
            >
              <option value="">Seleccionar accesorio</option>
              {catalogoAccesorios.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} · {a.nombre} ({a.tipo})
                </option>
              ))}
            </select>
          </label>
          <label className="posicion-drawer__campo">
            <span>Nota (opcional)</span>
            <input type="text" value={notaAccesorio} onChange={(e) => setNotaAccesorio(e.target.value)} maxLength={200} />
          </label>
        </div>
        <Button
          variante="outline"
          type="button"
          onClick={onAgregarAccesorio}
          disabled={!accesorioSeleccionado || agregandoAccesorio}
        >
          + Agregar accesorio
        </Button>
      </Seccion>

      <Seccion titulo="Clasificación">
        <div className="posicion-drawer__fila">
          <label className="posicion-drawer__campo">
            <span>Modo</span>
            <select value={modo} onChange={(e) => setModo(e.target.value as ModoPosicion)}>
              {MODOS_POSICION.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_MODO[valor]}
                </option>
              ))}
            </select>
          </label>
          <label className="posicion-drawer__campo">
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
        <label className="posicion-drawer__campo-check">
          <input type="checkbox" checked={crossExterno} onChange={(e) => setCrossExterno(e.target.checked)} />
          <span>Cross externo</span>
        </label>
        <label className="posicion-drawer__campo-check">
          <input type="checkbox" checked={montarEnDisplay} onChange={(e) => setMontarEnDisplay(e.target.checked)} />
          <span>Montar en display</span>
        </label>
        <label className="posicion-drawer__campo">
          <span>Observaciones (opcional)</span>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} rows={3} />
        </label>
      </Seccion>

      <Seccion titulo="Desborde">
        <label className="posicion-drawer__campo-check">
          <input type="checkbox" checked={desbordaGondola} onChange={(e) => setDesbordaGondola(e.target.checked)} />
          <span>Desborda la góndola</span>
        </label>
        <label className="posicion-drawer__campo">
          <span>Nota de desborde {desbordaGondola && '(obligatoria)'}</span>
          <textarea value={notaDesborde} onChange={(e) => setNotaDesborde(e.target.value)} maxLength={500} rows={3} />
        </label>
        {notaDesbordeInvalida && (
          <p className="posicion-drawer__error">La nota de desborde es obligatoria cuando la posición desborda la góndola.</p>
        )}
      </Seccion>
    </Drawer>
  );
}
