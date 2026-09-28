import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import {
  columnaProducto,
  columnasVisibles,
  type ClaveColumna,
  type PreferenciasColumnas,
} from '../../../../domain/implementacion/columnasProductos';
import './PanelColumnas.css';

interface PanelColumnasProps {
  id: string;
  prefs: PreferenciasColumnas;
  onAlternar: (clave: ClaveColumna) => void;
  onMover: (clave: ClaveColumna, delta: number) => void;
  onSoltar: (desde: ClaveColumna, hacia: ClaveColumna) => void;
  onMostrarTodas: () => void;
  onRestablecer: () => void;
  onCerrar: () => void;
}

/**
 * Panel para mostrar/ocultar columnas y cambiar su orden: arrastrando cada fila por su asa o, con
 * el asa enfocada, con las flechas arriba/abajo del teclado. Se cierra con "Listo", Escape o un
 * clic fuera.
 */
export function PanelColumnas({
  id,
  prefs,
  onAlternar,
  onMover,
  onSoltar,
  onMostrarTodas,
  onRestablecer,
  onCerrar,
}: PanelColumnasProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const asas = useRef(new Map<ClaveColumna, HTMLButtonElement>());
  const [arrastrando, setArrastrando] = useState<ClaveColumna | null>(null);
  const [sobre, setSobre] = useState<ClaveColumna | null>(null);
  // Al mover con el teclado, React reubica el nodo en el DOM y el foco puede perderse: se repone.
  const [enfocar, setEnfocar] = useState<ClaveColumna | null>(null);

  const visibles = columnasVisibles(prefs).length;

  useEffect(() => {
    if (!enfocar) return;
    asas.current.get(enfocar)?.focus();
    setEnfocar(null);
  }, [enfocar, prefs.orden]);

  useEffect(() => {
    function alPresionar(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    function alClicFuera(e: MouseEvent) {
      const objetivo = e.target as HTMLElement;
      // El botón que abre el panel lo alterna por su cuenta.
      if (panelRef.current?.contains(objetivo) || objetivo.closest(`[aria-controls="${id}"]`)) return;
      onCerrar();
    }
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('mousedown', alClicFuera);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('mousedown', alClicFuera);
    };
  }, [id, onCerrar]);

  function alTeclear(e: KeyboardEvent, clave: ClaveColumna) {
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    e.preventDefault();
    onMover(clave, delta);
    setEnfocar(clave);
  }

  function alIniciar(e: DragEvent, clave: ClaveColumna) {
    e.dataTransfer.setData('text/plain', clave);
    e.dataTransfer.effectAllowed = 'move';
    setArrastrando(clave);
  }

  function terminar() {
    setArrastrando(null);
    setSobre(null);
  }

  const indiceDesde = arrastrando ? prefs.orden.indexOf(arrastrando) : -1;

  return (
    <div ref={panelRef} id={id} className="panel-columnas" role="dialog" aria-label="Columnas de la tabla">
      <div className="panel-columnas__cabecera">
        <span className="panel-columnas__titulo">Columnas</span>
        <span className="panel-columnas__ayuda">
          Marca las que quieres ver y arrástralas para cambiar su orden (también puedes arrastrar los encabezados
          de la tabla). Se guarda en este navegador.
        </span>
      </div>

      <ul className="panel-columnas__lista">
        {prefs.orden.map((clave, i) => {
          const col = columnaProducto(clave);
          const visible = !prefs.ocultas.includes(clave);
          const bloqueada = visible && visibles === 1;
          const esDestino = indiceDesde >= 0 && indiceDesde !== i && sobre === clave;
          // La línea azul marca dónde cae: abajo si se arrastra hacia abajo, arriba si hacia arriba.
          const marca = esDestino ? (indiceDesde < i ? ' panel-columnas__fila--abajo' : ' panel-columnas__fila--arriba') : '';
          return (
            <li
              key={clave}
              className={`panel-columnas__fila${marca}${arrastrando === clave ? ' panel-columnas__fila--arrastrando' : ''}`}
              draggable
              onDragStart={(e) => alIniciar(e, clave)}
              onDragOver={(e) => {
                if (!arrastrando) return;
                e.preventDefault();
                if (sobre !== clave) setSobre(clave);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (arrastrando) onSoltar(arrastrando, clave);
                terminar();
              }}
              onDragEnd={terminar}
            >
              <button
                type="button"
                ref={(nodo) => {
                  if (nodo) asas.current.set(clave, nodo);
                  else asas.current.delete(clave);
                }}
                className="panel-columnas__asa"
                aria-label={`Mover ${col.etiqueta}: arrastra, o usa las flechas arriba y abajo del teclado`}
                title="Arrastra para cambiar el orden"
                onKeyDown={(e) => alTeclear(e, clave)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="9" cy="6" r="1.8" />
                  <circle cx="15" cy="6" r="1.8" />
                  <circle cx="9" cy="12" r="1.8" />
                  <circle cx="15" cy="12" r="1.8" />
                  <circle cx="9" cy="18" r="1.8" />
                  <circle cx="15" cy="18" r="1.8" />
                </svg>
              </button>
              <label className={`panel-columnas__etiqueta${visible ? '' : ' panel-columnas__etiqueta--oculta'}`}>
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={bloqueada}
                  title={bloqueada ? 'Debe quedar al menos una columna visible' : undefined}
                  onChange={() => onAlternar(clave)}
                />
                {col.etiqueta}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="panel-columnas__pie">
        <button type="button" className="panel-columnas__enlace" onClick={onMostrarTodas}>
          Mostrar todas
        </button>
        <button type="button" className="panel-columnas__enlace" onClick={onRestablecer}>
          Restablecer
        </button>
        <button type="button" className="panel-columnas__listo" onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  );
}
