import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../ui/Button/Button';
import { Modal } from '../../../ui/Modal/Modal';
import type { ClaveColumnaConsolidado } from '../../../../domain/consolidado/columnasConsolidado';
import { HOJAS_CONSOLIDADO, filasEstimadas } from '../../../../domain/consolidado/filtrosConsolidado';
import type { FormatoDescarga, ResumenConsolidado, VistaConsolidado } from '../../../../types/consolidado';
import './DescargarConsolidadoModal.css';

const NOMBRE_HOJA: Record<VistaConsolidado, string> = { PLANOGRAMA: 'Planograma', CROSS: 'Cross', IMPULSO: 'Impulso' };

const FORMATOS: { valor: FormatoDescarga; titulo: string; descripcion: string }[] = [
  {
    valor: 'DETALLADO',
    titulo: 'Detallado',
    descripcion: 'Una fila por SKU–tienda–versión de planograma, una por cada cross y una por cada impulso.',
  },
  {
    valor: 'AGREGADO',
    titulo: 'Min/Max agregado',
    descripcion:
      'Una fila por SKU–tienda. El mín., el máx., el mín. estético y la capacidad máxima son la suma de planograma + cross + impulso. Las columnas de montaje (góndola, nivel, accesorio…) salen de la fila de planograma, solo si están visibles en el selector de columnas y en su orden.',
  },
  { valor: 'HOJAS', titulo: 'Hojas separadas', descripcion: 'Una hoja por tipo de aparición.' },
];

export interface OpcionesDescarga {
  formato: FormatoDescarga;
  hojas: VistaConsolidado[];
}

interface DescargarConsolidadoModalProps {
  abierto: boolean;
  onClose: () => void;
  /** Columnas visibles de la tabla, en orden: son las que lleva el archivo. */
  columnasVisibles: ClaveColumnaConsolidado[];
  conteos: ResumenConsolidado['conteos'];
  /** Máximo de filas que el servidor genera. */
  maximo: number;
  generando: boolean;
  onDescargar: (opciones: OpcionesDescarga) => void;
  /** Cierra el modal y abre el panel de columnas. */
  onElegirColumnas: () => void;
}

const numeroTexto = (n: number) => n.toLocaleString('es-GT');

/** Modal "Descargar consolidado": formato, hojas, filas estimadas y validación antes de pedir el .xlsx. */
export function DescargarConsolidadoModal(props: DescargarConsolidadoModalProps) {
  // El contenido se monta solo con el modal abierto: cada apertura empieza con el formato por defecto.
  return props.abierto ? <ContenidoDescarga {...props} /> : null;
}

function ContenidoDescarga({
  onClose,
  columnasVisibles,
  conteos,
  maximo,
  generando,
  onDescargar,
  onElegirColumnas,
}: DescargarConsolidadoModalProps) {
  const [formato, setFormato] = useState<FormatoDescarga>('DETALLADO');
  const [hojas, setHojas] = useState<ReadonlySet<VistaConsolidado>>(() => new Set(HOJAS_CONSOLIDADO));
  const idFormato = useId();
  const idAlerta = useId();

  const hojasElegidas = HOJAS_CONSOLIDADO.filter((h) => hojas.has(h));
  const filas = filasEstimadas(formato, hojasElegidas, conteos);
  const nColumnas = columnasVisibles.length;

  const error =
    formato === 'HOJAS' && hojasElegidas.length === 0
      ? 'Elige al menos una hoja para descargar.'
      : filas === 0
        ? 'No hay filas para descargar con los filtros actuales.'
        : filas > maximo
          ? `La descarga tendría ${filas} filas y el máximo es ${maximo}. Ajusta los filtros.`
          : null;

  function alternarHoja(hoja: VistaConsolidado) {
    const nuevas = new Set(hojas);
    if (!nuevas.delete(hoja)) nuevas.add(hoja);
    setHojas(nuevas);
  }

  return createPortal(
    <Modal
      titulo="Descargar consolidado"
      ancho="lg"
      onClose={generando ? () => undefined : onClose}
      footer={
        <>
          <Button variante="ghost" onClick={onClose} disabled={generando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onDescargar({ formato, hojas: hojasElegidas })}
            disabled={generando || error !== null}
            aria-describedby={error ? idAlerta : undefined}
          >
            {generando ? (
              <span className="descargar-consolidado__generando">
                <span className="descargar-consolidado__spinner" aria-hidden="true" />
                Generando…
              </span>
            ) : (
              'Descargar (.xlsx)'
            )}
          </Button>
        </>
      }
    >
      <div className="descargar-consolidado__formatos" role="radiogroup" aria-label="Formato de la descarga">
        {FORMATOS.map((f) => {
          const elegido = formato === f.valor;
          const idTitulo = `${idFormato}-${f.valor}`;
          return (
            <div key={f.valor} className={`descargar-consolidado__tarjeta${elegido ? ' descargar-consolidado__tarjeta--elegida' : ''}`}>
              <label className="descargar-consolidado__opcion">
                <input
                  type="radio"
                  name={`${idFormato}-formato`}
                  value={f.valor}
                  checked={elegido}
                  disabled={generando}
                  aria-labelledby={idTitulo}
                  onChange={() => setFormato(f.valor)}
                />
                <span className="descargar-consolidado__texto">
                  <span id={idTitulo} className="descargar-consolidado__titulo">
                    {f.titulo}
                  </span>
                  <span className="descargar-consolidado__descripcion">{f.descripcion}</span>
                  {f.valor === 'DETALLADO' && !columnasVisibles.includes('modo') && (
                    <span className="descargar-consolidado__descripcion">Incluye la columna Modo al inicio aunque esté oculta.</span>
                  )}
                </span>
              </label>

              {f.valor === 'HOJAS' && (
                <fieldset className="descargar-consolidado__hojas" disabled={!elegido || generando}>
                  <legend>Hojas</legend>
                  {HOJAS_CONSOLIDADO.map((h) => (
                    <label key={h} className="descargar-consolidado__hoja">
                      <input type="checkbox" checked={hojas.has(h)} onChange={() => alternarHoja(h)} />
                      {NOMBRE_HOJA[h]} ({numeroTexto(conteos[h])})
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          );
        })}
      </div>

      <div className="descargar-consolidado__resumen">
        <p className="descargar-consolidado__filas">Filas estimadas: {numeroTexto(filas)}</p>
        <p>
          {nColumnas === 1
            ? 'Se descarga 1 columna visible, en el orden de la tabla.'
            : `Se descargan las ${nColumnas} columnas visibles, en el orden de la tabla.`}{' '}
          <button type="button" className="descargar-consolidado__enlace" onClick={onElegirColumnas} disabled={generando}>
            Elegir columnas
          </button>
        </p>
        {formato === 'AGREGADO' && (
          <p>Las columnas de montaje salen de la fila de planograma; si el SKU no tiene planograma en la tienda, quedan vacías.</p>
        )}
      </div>

      {error && (
        <p id={idAlerta} role="alert" className="descargar-consolidado__error">
          {error}
        </p>
      )}
    </Modal>,
    document.body,
  );
}
