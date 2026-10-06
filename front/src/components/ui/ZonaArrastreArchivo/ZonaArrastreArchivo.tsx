import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { cumpleAccept, formatearPeso } from '../../../utils/archivos';
import './ZonaArrastreArchivo.css';

interface ZonaArrastreArchivoProps {
  /** Mismo formato que el atributo `accept` de <input type="file"> (ej. ".xlsx" o "application/pdf,.pdf"). */
  accept: string;
  /** Texto de formatos admitidos que ve el usuario (ej. "Excel (.xlsx)"). */
  formatos: string;
  /** Peso máximo en bytes; si se omite no se valida. */
  maxBytes?: number;
  archivo: File | null;
  onSeleccionar: (archivo: File | null) => void;
  disabled?: boolean;
  /** Indicación adicional debajo de formatos y peso (ej. "Se lee la primera hoja"). */
  indicacion?: string;
}

/**
 * Recuadro para soltar o elegir un archivo. Valida formato y peso antes de entregarlo con
 * `onSeleccionar`; si no cumple, muestra el motivo dentro del recuadro y no lo entrega.
 */
export function ZonaArrastreArchivo({
  accept,
  formatos,
  maxBytes,
  archivo,
  onSeleccionar,
  disabled = false,
  indicacion,
}: ZonaArrastreArchivoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el archivo llega por otra vía (ej. un adjunto), el error de un intento anterior ya no aplica.
  useEffect(() => {
    if (archivo) setError(null);
  }, [archivo]);

  function recibir(seleccionado: File | undefined) {
    if (!seleccionado) return;
    if (!cumpleAccept(seleccionado.name, seleccionado.type, accept)) {
      setError(`Formato no admitido. Usá ${formatos}.`);
      return;
    }
    if (maxBytes && seleccionado.size > maxBytes) {
      setError(`El archivo pesa ${formatearPeso(seleccionado.size)}; el máximo es ${formatearPeso(maxBytes)}.`);
      return;
    }
    setError(null);
    onSeleccionar(seleccionado);
  }

  function abrirSelector() {
    if (!disabled) inputRef.current?.click();
  }

  function onSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    if (!disabled) recibir(e.dataTransfer.files[0]);
  }

  function onTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirSelector();
    }
  }

  const clases = [
    'zona-arrastre',
    arrastrando && 'zona-arrastre--arrastrando',
    archivo && 'zona-arrastre--con-archivo',
    error && 'zona-arrastre--error',
    disabled && 'zona-arrastre--deshabilitada',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={clases}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={abrirSelector}
      onKeyDown={onTecla}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={onSoltar}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(e) => {
          recibir(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <svg className="zona-arrastre__icono" viewBox="0 0 24 24" aria-hidden="true">
        {archivo ? (
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 14l2 2 4-4" />
        ) : (
          <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M12 4v11M7 9l5-5 5 5" />
        )}
      </svg>

      {archivo ? (
        <>
          <span className="zona-arrastre__titulo">{archivo.name}</span>
          <span className="zona-arrastre__detalle">
            {formatearPeso(archivo.size)} · <span className="zona-arrastre__enlace">Cambiar archivo</span>
          </span>
        </>
      ) : (
        <>
          <span className="zona-arrastre__titulo">
            Arrastrá el archivo aquí o <span className="zona-arrastre__enlace">elegilo desde tu equipo</span>
          </span>
          <span className="zona-arrastre__detalle">
            {formatos}
            {maxBytes ? ` · máximo ${formatearPeso(maxBytes)}` : ''}
          </span>
        </>
      )}

      {indicacion && !archivo && <span className="zona-arrastre__indicacion">{indicacion}</span>}
      {error && (
        <span className="zona-arrastre__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
