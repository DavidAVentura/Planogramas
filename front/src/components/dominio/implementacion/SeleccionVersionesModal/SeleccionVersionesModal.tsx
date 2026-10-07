import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EstadoVersionBadge } from '../EstadoVersionBadge/EstadoVersionBadge';
import { contieneTexto } from '../../../../domain/implementacion/filtrosColumna';
import { textoConteo } from '../../../../utils/formatters';
import type { VersionElegible } from '../../../../types/implementacion';
import './SeleccionVersionesModal.css';

/** Textos que cambian entre la vista del Implementador y la vista Por versión. */
export interface TextosSeleccionVersiones {
  /** Qué versiones aparecen en la lista. */
  ayuda: string;
  /** Qué pasa si se aplica sin ninguna marcada. */
  notaSinSeleccion: string;
  /** Botón de aplicar sin ninguna marcada. */
  aplicarSinSeleccion: string;
  sinVersiones: string;
  sinCoincidencias: string;
}

interface SeleccionVersionesModalProps {
  textos: TextosSeleccionVersiones;
  versiones: VersionElegible[];
  seleccionadas: number[];
  onAplicar: (versionIds: number[]) => void;
  onClose: () => void;
}

/**
 * Filtro de Productos por planograma versión. Trabaja sobre un borrador: la tabla solo cambia al
 * pulsar "Mostrar productos"; Cancelar deja la selección como estaba.
 */
export function SeleccionVersionesModal({
  textos,
  versiones,
  seleccionadas,
  onAplicar,
  onClose,
}: SeleccionVersionesModalProps) {
  const [busqueda, setBusqueda] = useState('');
  const [borrador, setBorrador] = useState<ReadonlySet<number>>(() => new Set(seleccionadas));

  const visibles = useMemo(
    () => versiones.filter((v) => contieneTexto(`${v.codigo} ${v.nombre} ${v.departamento}`, busqueda)),
    [versiones, busqueda],
  );

  function alternar(id: number) {
    setBorrador((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function seleccionarVisibles() {
    setBorrador((actual) => new Set([...actual, ...visibles.map((v) => v.versionId)]));
  }

  function aplicar() {
    // Se conserva el orden de la lista, no el orden en que se marcaron.
    onAplicar(versiones.filter((v) => borrador.has(v.versionId)).map((v) => v.versionId));
  }

  const n = borrador.size;

  return createPortal(
    <Modal
      titulo="Filtrar por planograma versión"
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <span className="seleccion-versiones__nota">{textos.notaSinSeleccion}</span>
          <Button variante="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={aplicar}>{n === 0 ? textos.aplicarSinSeleccion : 'Mostrar productos'}</Button>
        </>
      }
    >
      <p className="seleccion-versiones__ayuda">{textos.ayuda}</p>

      <div className="seleccion-versiones__controles">
        <label className="seleccion-versiones__campo">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Código, planograma o departamento"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
        </label>
        <div className="seleccion-versiones__acciones">
          <button type="button" className="seleccion-versiones__enlace" onClick={seleccionarVisibles}>
            Seleccionar todas
          </button>
          <button type="button" className="seleccion-versiones__enlace" onClick={() => setBorrador(new Set())}>
            Quitar selección
          </button>
          <span className="seleccion-versiones__conteo" aria-live="polite">
            {n === 0 ? 'Ninguna seleccionada' : n === 1 ? '1 seleccionada' : `${n} seleccionadas`}
          </span>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="seleccion-versiones__vacio">
          {versiones.length === 0 ? textos.sinVersiones : textos.sinCoincidencias}
        </p>
      ) : (
        <div className="seleccion-versiones__lista">
          {visibles.map((v) => {
            const marcada = borrador.has(v.versionId);
            return (
              <label
                key={v.versionId}
                className={`seleccion-versiones__opcion${marcada ? ' seleccion-versiones__opcion--marcada' : ''}`}
              >
                <input type="checkbox" checked={marcada} onChange={() => alternar(v.versionId)} />
                <span className="seleccion-versiones__datos">
                  <span className="seleccion-versiones__linea">
                    <span className="seleccion-versiones__codigo">{v.codigo}</span>
                    <EstadoVersionBadge estado={v.estado} />
                  </span>
                  <span className="seleccion-versiones__nombre">
                    {v.nombre} · {v.departamento}
                  </span>
                </span>
                <span className="seleccion-versiones__total">{textoConteo(v.totalProductos, 'producto', 'productos')}</span>
              </label>
            );
          })}
        </div>
      )}
    </Modal>,
    document.body,
  );
}
