import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import './SeleccionMultipleModal.css';

/** Elemento elegido: el nombre solo se guarda para mostrarlo fuera del modal. */
export interface ElementoSeleccionado {
  id: number;
  nombre: string;
}

/** Conteo opcional por elemento que un selector muestra en cada fila (ej. productos o tiendas). */
export interface ConteoPorElemento {
  porId: Map<number, number>;
  singular: string;
  plural: string;
}

export interface OpcionOrdenSeleccion<T> {
  id: string;
  etiqueta: string;
  comparar: (a: T, b: T) => number;
}

interface SeleccionMultipleModalProps<T> {
  titulo: string;
  elementos: T[];
  cargando?: boolean;
  obtenerId: (elemento: T) => number;
  obtenerNombre: (elemento: T) => string;
  /** Texto contra el que se compara la búsqueda (ej. nombre + departamento). */
  textoBusqueda: (elemento: T) => string;
  placeholderBusqueda: string;
  /** La primera opción es el orden inicial. */
  ordenes: OpcionOrdenSeleccion<T>[];
  /** Línea secundaria bajo el nombre. */
  renderDetalle?: (elemento: T) => ReactNode;
  /** Datos cortos alineados a la derecha de cada fila. */
  renderMeta?: (elemento: T) => ReactNode[];
  seleccionados: ElementoSeleccionado[];
  textoVacio: string;
  onAplicar: (seleccionados: ElementoSeleccionado[]) => void;
  onClose: () => void;
}

/**
 * Modal para elegir varios elementos de una lista con búsqueda y orden. La selección es un
 * borrador: solo se entrega a `onAplicar` al confirmar. Se monta en `document.body` para que
 * ningún contenedor de la barra de filtros lo recorte.
 */
export function SeleccionMultipleModal<T>({
  titulo,
  elementos,
  cargando = false,
  obtenerId,
  obtenerNombre,
  textoBusqueda,
  placeholderBusqueda,
  ordenes,
  renderDetalle,
  renderMeta,
  seleccionados,
  textoVacio,
  onAplicar,
  onClose,
}: SeleccionMultipleModalProps<T>) {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<{ id: string; dir: 'asc' | 'desc' }>({ id: ordenes[0].id, dir: 'asc' });
  const [elegidos, setElegidos] = useState<Map<number, string>>(
    () => new Map(seleccionados.map((s) => [s.id, s.nombre])),
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const comparar = (ordenes.find((o) => o.id === orden.id) ?? ordenes[0]).comparar;
    const signo = orden.dir === 'asc' ? 1 : -1;
    return elementos
      .filter((e) => !q || textoBusqueda(e).toLowerCase().includes(q))
      .sort((a, b) => signo * comparar(a, b));
  }, [elementos, busqueda, orden, ordenes, textoBusqueda]);

  function ordenarPor(id: string) {
    setOrden((actual) => (actual.id === id ? { id, dir: actual.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' }));
  }

  function alternar(elemento: T) {
    const id = obtenerId(elemento);
    setElegidos((actual) => {
      const nuevo = new Map(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.set(id, obtenerNombre(elemento));
      return nuevo;
    });
  }

  const todosVisiblesElegidos = visibles.length > 0 && visibles.every((e) => elegidos.has(obtenerId(e)));

  function alternarVisibles() {
    setElegidos((actual) => {
      const nuevo = new Map(actual);
      visibles.forEach((e) => {
        if (todosVisiblesElegidos) nuevo.delete(obtenerId(e));
        else nuevo.set(obtenerId(e), obtenerNombre(e));
      });
      return nuevo;
    });
  }

  function aplicar() {
    onAplicar([...elegidos].map(([id, nombre]) => ({ id, nombre })));
    onClose();
  }

  return createPortal(
    <Modal
      titulo={titulo}
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <span className="seleccion-multiple__conteo">
            {elegidos.size === 0
              ? 'Ninguno seleccionado'
              : elegidos.size === 1
                ? '1 seleccionado'
                : `${elegidos.size} seleccionados`}
          </span>
          {elegidos.size > 0 && (
            <Button variante="ghost" onClick={() => setElegidos(new Map())}>
              Limpiar selección
            </Button>
          )}
          <Button variante="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={aplicar}>Aplicar</Button>
        </>
      }
    >
      <div className="seleccion-multiple__controles">
        <input
          type="search"
          className="seleccion-multiple__busqueda"
          placeholder={placeholderBusqueda}
          aria-label={placeholderBusqueda}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
        <div className="seleccion-multiple__orden" role="group" aria-label="Ordenar por">
          <span>Ordenar por</span>
          {ordenes.map(({ id, etiqueta }) => {
            const activo = orden.id === id;
            return (
              <button
                key={id}
                type="button"
                className={`seleccion-multiple__orden-btn${activo ? ' seleccion-multiple__orden-btn--activo' : ''}`}
                aria-pressed={activo}
                onClick={() => ordenarPor(id)}
              >
                {etiqueta}
                {activo && <span aria-hidden="true">{orden.dir === 'asc' ? ' ↑' : ' ↓'}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {cargando ? (
        <p className="seleccion-multiple__cargando">Cargando…</p>
      ) : visibles.length === 0 ? (
        <EmptyState
          titulo={elementos.length === 0 ? textoVacio : 'Ningún resultado coincide'}
          hint={elementos.length === 0 ? undefined : 'Prueba con otro texto de búsqueda.'}
        />
      ) : (
        <div className="seleccion-multiple__lista">
          <label className="seleccion-multiple__fila seleccion-multiple__fila--todos">
            <input type="checkbox" checked={todosVisiblesElegidos} onChange={alternarVisibles} />
            <span>{busqueda.trim() ? `Todos los resultados (${visibles.length})` : `Todos (${visibles.length})`}</span>
          </label>
          {visibles.map((e) => {
            const id = obtenerId(e);
            return (
              <label key={id} className="seleccion-multiple__fila">
                <input type="checkbox" checked={elegidos.has(id)} onChange={() => alternar(e)} />
                <span className="seleccion-multiple__nombre">
                  {obtenerNombre(e)}
                  {renderDetalle && <span className="seleccion-multiple__detalle">{renderDetalle(e)}</span>}
                </span>
                {renderMeta?.(e).map((meta, i) => (
                  <span key={i} className="seleccion-multiple__meta">
                    {meta}
                  </span>
                ))}
              </label>
            );
          })}
        </div>
      )}
    </Modal>,
    document.body,
  );
}
