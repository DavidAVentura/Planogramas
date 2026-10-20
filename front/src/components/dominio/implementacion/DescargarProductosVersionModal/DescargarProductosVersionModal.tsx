import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../ui/Button/Button';
import { Modal } from '../../../ui/Modal/Modal';
import { pivoteAplicable, type PivoteAplicable } from '../../../../domain/implementacion/descargaPorVersion';
import type { FormatoDescargaPorVersion, VersionPorVersion } from '../../../../types/implementacion';
import './DescargarProductosVersionModal.css';

const FORMATOS: { valor: FormatoDescargaPorVersion; titulo: string; descripcion: string }[] = [
  {
    valor: 'LISTA',
    titulo: 'Lista',
    descripcion:
      'Una fila por SKU, versión y modo de aparición (planograma, cross o impulso). Un SKU aparece una vez por cada versión en la que está; si está en planograma y en cross de la misma versión, son dos filas.',
  },
  {
    valor: 'PIVOTE',
    titulo: 'Pivote por versión',
    descripcion:
      'Una fila por SKU, planograma, estado de la versión y modo. Tres bloques en horizontal (TG, TM y TE) con los mismos encabezados del Excel de categorías (por ejemplo Facings_TG), para poder volver a cargarlo. Las versiones especiales de tienda no se incluyen.',
  },
];

const SIGLA_POR_TIPO: Record<string, string> = { GRANDE: 'TG', MEDIANA: 'TM', EXPRESS: 'TE' };
const MAX_CODIGOS_RESUMEN = 3;

interface DescargarProductosVersionModalProps {
  abierto: boolean;
  onClose: () => void;
  /** Versiones elegidas (con código, nombre del planograma, tipo y estado). */
  versiones: VersionPorVersion[];
  /** Nombres del Área › Departamento elegidos, para resumir el alcance; `[]` si no hay jerarquía. */
  jerarquiaNombres: string[];
  /** Hay búsqueda o filtros de columna activos en la tabla. */
  hayFiltrosCliente: boolean;
  generando: boolean;
  /** Error del servidor que se muestra dentro del modal (422 Pivote no aplicable / tope de filas). */
  errorServidor: string | null;
  onDescargar: (formato: FormatoDescargaPorVersion) => void;
}

const codigos = (versiones: VersionPorVersion[]) => versiones.map((v) => v.codigo);

/** "A, B y C" (o "A y B", o "A"). */
function listaConY(textos: string[]): string {
  if (textos.length <= 1) return textos.join('');
  return `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`;
}

/** Aviso que bloquea el Pivote (mismas reglas que el servidor), o `null` si se puede generar. */
function avisoBloqueante(versiones: VersionPorVersion[], pivote: PivoteAplicable): string | null {
  if (pivote.aplicable) return null;
  if (pivote.especiales.length === versiones.length) {
    return 'Las versiones elegidas son todas especiales de tienda; el Pivote no las incluye. Usa la Lista.';
  }
  if (pivote.sinTipo.length > 0) {
    return `El Pivote necesita que todas las versiones tengan tipo (TG, TM o TE). Sin tipo: ${codigos(pivote.sinTipo).join(', ')}.`;
  }
  const [grupo] = pivote.duplicadas;
  return `Hay dos versiones del mismo planograma, tipo y estado: ${listaConY(codigos(grupo))} (${grupo[0].nombre}, ${SIGLA_POR_TIPO[grupo[0].tipo] ?? grupo[0].tipo}). Quita una para descargar el Pivote.`;
}

/** Modal "Descargar productos por planograma": formato (Lista o Pivote), resumen del alcance y avisos previos. */
export function DescargarProductosVersionModal(props: DescargarProductosVersionModalProps) {
  // El contenido se monta solo con el modal abierto: cada apertura empieza con el formato por defecto.
  return props.abierto ? <ContenidoDescarga {...props} /> : null;
}

function ContenidoDescarga({
  onClose,
  versiones,
  jerarquiaNombres,
  hayFiltrosCliente,
  generando,
  errorServidor,
  onDescargar,
}: DescargarProductosVersionModalProps) {
  const [formato, setFormato] = useState<FormatoDescargaPorVersion>('LISTA');
  // El error del servidor es del formato que se pidió: al cambiar de tarjeta deja de aplicar.
  const [formatoPedido, setFormatoPedido] = useState<FormatoDescargaPorVersion | null>(null);
  const idFormato = useId();
  const idAlerta = useId();

  const pivote = pivoteAplicable(versiones);
  const bloqueo = formato === 'PIVOTE' ? avisoBloqueante(versiones, pivote) : null;
  const notaEspeciales =
    formato === 'PIVOTE' && pivote.aplicable && pivote.especiales.length > 0
      ? `Las versiones especiales de tienda no se incluyen en el Pivote: ${codigos(pivote.especiales).join(', ')}.`
      : null;
  const errorVisible = errorServidor !== null && formatoPedido === formato ? errorServidor : null;
  const mensajeError = bloqueo ?? errorVisible;

  const mostradas = codigos(versiones).slice(0, MAX_CODIGOS_RESUMEN).join(', ');
  const restantes = versiones.length - MAX_CODIGOS_RESUMEN;
  const alcance = jerarquiaNombres.length > 0 ? jerarquiaNombres.join(' › ') : 'todas las áreas y departamentos';

  function descargar() {
    setFormatoPedido(formato);
    onDescargar(formato);
  }

  return createPortal(
    <Modal
      titulo="Descargar productos por planograma"
      ancho="lg"
      onClose={generando ? () => undefined : onClose}
      footer={
        <>
          <Button variante="ghost" onClick={onClose} disabled={generando}>
            Cancelar
          </Button>
          <Button
            onClick={descargar}
            disabled={generando || bloqueo !== null}
            aria-describedby={bloqueo ? idAlerta : undefined}
          >
            {generando ? (
              <span className="descargar-productos-version__generando">
                <span className="descargar-productos-version__spinner" aria-hidden="true" />
                Generando…
              </span>
            ) : (
              'Descargar (.xlsx)'
            )}
          </Button>
        </>
      }
    >
      <div className="descargar-productos-version__formatos" role="radiogroup" aria-label="Formato de la descarga">
        {FORMATOS.map((f) => {
          const elegido = formato === f.valor;
          const idTitulo = `${idFormato}-${f.valor}`;
          const idDescripcion = `${idFormato}-${f.valor}-descripcion`;
          return (
            <div
              key={f.valor}
              className={`descargar-productos-version__tarjeta${elegido ? ' descargar-productos-version__tarjeta--elegida' : ''}`}
            >
              <label className="descargar-productos-version__opcion">
                <input
                  type="radio"
                  name={`${idFormato}-formato`}
                  value={f.valor}
                  checked={elegido}
                  disabled={generando}
                  autoFocus={f.valor === 'LISTA'}
                  aria-labelledby={idTitulo}
                  aria-describedby={idDescripcion}
                  onChange={() => setFormato(f.valor)}
                />
                <span className="descargar-productos-version__texto">
                  <span id={idTitulo} className="descargar-productos-version__titulo">
                    {f.titulo}
                  </span>
                  <span id={idDescripcion} className="descargar-productos-version__descripcion">
                    {f.descripcion}
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="descargar-productos-version__resumen">
        <p>
          Versiones: {versiones.length} · {mostradas}
          {restantes > 0 && ` y ${restantes} más`}
        </p>
        <p>Alcance: {alcance}</p>
        {hayFiltrosCliente && <p>Se aplican la búsqueda y los filtros de columna de la tabla.</p>}
      </div>

      {notaEspeciales && (
        <p role="status" className="descargar-productos-version__aviso">
          {notaEspeciales}
        </p>
      )}

      {mensajeError && (
        <p id={idAlerta} role="alert" className="descargar-productos-version__error">
          {mensajeError}
        </p>
      )}
    </Modal>,
    document.body,
  );
}
