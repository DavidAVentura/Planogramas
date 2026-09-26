import { createPortal } from 'react-dom';
import { Modal } from '../../../ui/Modal/Modal';
import {
  VELOCIDAD_TTS_MAX, VELOCIDAD_TTS_MIN, VELOCIDAD_TTS_PASO, VOCES_TTS,
} from '../../../../config/preferenciasVoz';
import type { MetodoTts, MetodoVoz, VozTts } from '../../../../config/preferenciasVoz';
import './AjustesVozModal.css';

interface AjustesVozModalProps {
  metodoVoz: MetodoVoz;
  onSeleccionarMetodoVoz: (metodo: MetodoVoz) => void;
  metodoTts: MetodoTts;
  onSeleccionarMetodoTts: (metodo: MetodoTts) => void;
  voz: VozTts;
  onSeleccionarVoz: (voz: VozTts) => void;
  velocidad: number;
  onSeleccionarVelocidad: (velocidad: number) => void;
  onClose: () => void;
}

interface Opcion<T> {
  valor: T;
  nombre: string;
  descripcion: string;
}

const OPCIONES_DICTADO: Opcion<MetodoVoz>[] = [
  {
    valor: 'streaming',
    nombre: 'Streaming',
    descripcion: 'Transcribe en vivo sin cortes: el audio viaja continuo y el servidor detecta el silencio para enviar el mensaje.',
  },
  {
    valor: 'segmentado',
    nombre: 'Segmentado',
    descripcion: 'Graba en tramos cortos y transcribe cada uno por separado. Más simple, pero puede cortar alguna palabra entre dos tramos.',
  },
];

const OPCIONES_LECTURA: Opcion<MetodoTts>[] = [
  {
    valor: 'openai',
    nombre: 'OpenAI',
    descripcion: 'Voz generada por IA, más natural. Tarda un instante en generarse y consume créditos de la API.',
  },
  {
    valor: 'webspeech',
    nombre: 'Navegador',
    descripcion: 'Motor de lectura del propio navegador: instantáneo y sin costo, pero la voz depende del sistema operativo.',
  },
];

function nombreVoz(voz: VozTts): string {
  return voz.charAt(0).toUpperCase() + voz.slice(1);
}

function ListaOpciones<T extends string>({
  opciones, actual, onSeleccionar,
}: { opciones: Opcion<T>[]; actual: T; onSeleccionar: (valor: T) => void }) {
  return (
    <div className="ajustes-voz__opciones">
      {opciones.map((o) => (
        <button
          type="button"
          key={o.valor}
          className={`ajustes-voz__opcion${actual === o.valor ? ' ajustes-voz__opcion--activa' : ''}`}
          onClick={() => onSeleccionar(o.valor)}
          aria-pressed={actual === o.valor}
        >
          <span className="ajustes-voz__nombre">{o.nombre}</span>
          <span className="ajustes-voz__descripcion">{o.descripcion}</span>
        </button>
      ))}
    </div>
  );
}

/** Ajustes del modo voz. Se monta en document.body porque el chat vive dentro de un widget
 * flotante con su propio contexto de apilamiento. Voz y velocidad solo aplican al motor OpenAI. */
export function AjustesVozModal({
  metodoVoz, onSeleccionarMetodoVoz, metodoTts, onSeleccionarMetodoTts,
  voz, onSeleccionarVoz, velocidad, onSeleccionarVelocidad, onClose,
}: AjustesVozModalProps) {
  return createPortal(
    <Modal titulo="Ajustes de voz" onClose={onClose} ancho="sm">
      <section className="ajustes-voz__seccion">
        <span className="ajustes-voz__subtitulo">Dictado</span>
        <ListaOpciones opciones={OPCIONES_DICTADO} actual={metodoVoz} onSeleccionar={onSeleccionarMetodoVoz} />
      </section>

      <section className="ajustes-voz__seccion">
        <span className="ajustes-voz__subtitulo">Lectura de respuestas</span>
        <ListaOpciones opciones={OPCIONES_LECTURA} actual={metodoTts} onSeleccionar={onSeleccionarMetodoTts} />
      </section>

      {metodoTts === 'openai' && (
        <>
          <section className="ajustes-voz__seccion">
            <span className="ajustes-voz__subtitulo">Voz</span>
            <div className="ajustes-voz__voces">
              {VOCES_TTS.map((v) => (
                <button
                  type="button"
                  key={v}
                  className={`ajustes-voz__voz${voz === v ? ' ajustes-voz__voz--activa' : ''}`}
                  onClick={() => onSeleccionarVoz(v)}
                  aria-pressed={voz === v}
                >
                  {nombreVoz(v)}
                </button>
              ))}
            </div>
          </section>

          <label className="ajustes-voz__seccion">
            <span className="ajustes-voz__subtitulo">Velocidad de lectura</span>
            <div className="ajustes-voz__velocidad">
              <input
                type="range"
                min={VELOCIDAD_TTS_MIN}
                max={VELOCIDAD_TTS_MAX}
                step={VELOCIDAD_TTS_PASO}
                value={velocidad}
                onChange={(e) => onSeleccionarVelocidad(Number(e.target.value))}
              />
              <span className="ajustes-voz__velocidad-valor">{velocidad.toFixed(1)}x</span>
            </div>
          </label>
        </>
      )}
    </Modal>,
    document.body,
  );
}
