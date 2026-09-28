import { useCallback, useEffect, useRef, useState } from 'react';
import { vozService } from '../services/voz.service';
import { cargarMetodoVoz, guardarMetodoVoz } from '../config/preferenciasVoz';
import type { MetodoVoz } from '../config/preferenciasVoz';

// ─── Segmentado ──────────────────────────────────────────────────────────────
// Graba tramos de ~2.75 s y transcribe cada uno por REST. Son segmentos encadenados porque
// MediaRecorder no se puede leer a mitad de grabación sin detenerlo.
const DURACION_SEGMENTO_MS = 2750;
// RMS sobre getByteTimeDomainData (0-255 centrado en 128). Calibrar con micrófono real.
const UMBRAL_SILENCIO = 12;
const MAX_FALLOS_SEGUIDOS = 3;

// ─── Streaming ───────────────────────────────────────────────────────────────
// Realtime API por WebSocket; el silencio lo detecta el servidor (server_vad, 3 s).
const SILENCIO_MS = 3000;
// Si llegó speech_stopped pero el .completed tarda, se envía igual lo acumulado.
const ESPERA_CIERRE_MS = 4000;
const SAMPLE_RATE_DESTINO = 24000;
const URL_REALTIME = 'wss://api.openai.com/v1/realtime?intent=transcription';

interface UseVozATextoOpciones {
  /** Si pasa a true a mitad del dictado (ej. el agente está respondiendo), corta SIN enviar. */
  disabled?: boolean;
  /** Cada tramo o delta transcrito. */
  onTextoParcial: (textoNuevo: string) => void;
  /** 3 s de silencio: se envía el mensaje con todo lo dictado. */
  onSilencioFinal: (textoAcumulado: string) => void;
}

interface UseVozATextoResultado {
  activo: boolean;
  error: string | null;
  metodo: MetodoVoz;
  seleccionarMetodo: (metodo: MetodoVoz) => void;
  toggle: () => void;
  obtenerAnalyser: () => AnalyserNode | null;
}

function elegirMimeType(): string {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidatos.find((tipo) => MediaRecorder.isTypeSupported(tipo)) ?? '';
}

async function subirYTranscribir(blob: Blob): Promise<string | null> {
  try {
    const { texto } = await vozService.transcribir(blob);
    return typeof texto === 'string' ? texto : null;
  } catch {
    return null;
  }
}

function float32APCM16(entrada: Float32Array): Int16Array {
  const salida = new Int16Array(entrada.length);
  for (let i = 0; i < entrada.length; i++) {
    const s = Math.max(-1, Math.min(1, entrada[i]));
    salida[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return salida;
}

// Interpolación lineal: basta para voz. Baja de 44.1/48 kHz a los 24 kHz que exige la Realtime API.
function resamplearAPCM16(entrada: Float32Array, origen: number, destino: number): Int16Array {
  if (origen === destino) return float32APCM16(entrada);
  const ratio = origen / destino;
  const longitud = Math.floor(entrada.length / ratio);
  const salida = new Float32Array(longitud);
  for (let i = 0; i < longitud; i++) {
    const pos = i * ratio;
    const base = Math.floor(pos);
    const frac = pos - base;
    const a = entrada[base] ?? 0;
    const b = entrada[base + 1] ?? a;
    salida[i] = a + (b - a) * frac;
  }
  return float32APCM16(salida);
}

function arrayBufferABase64(buffer: ArrayBufferLike): string {
  let binario = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

function concatenar(previo: string, nuevo: string, separador: string): string {
  return previo ? `${previo}${separador}${nuevo}` : nuevo;
}

/**
 * Micrófono → texto, con auto-envío tras 3 s de silencio. Dos métodos: 'streaming' (Realtime API,
 * no corta palabras) y 'segmentado' (fallback por REST). El corte manual (toggle), el paso a
 * `disabled` o el cambio de método cortan sin enviar.
 */
export function useVozATexto(opciones: UseVozATextoOpciones): UseVozATextoResultado {
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoVoz>(() => cargarMetodoVoz());

  // Refs para que los callbacks armados una vez por sesión vean siempre las props más recientes.
  const opcionesRef = useRef(opciones);
  const metodoRef = useRef(metodo);
  useEffect(() => {
    opcionesRef.current = opciones;
    metodoRef.current = metodo;
  });

  const sesionActivaRef = useRef(false);
  const limpiandoRef = useRef(false);
  // Sube en cada iniciar(): una continuación async de una sesión vieja se descarta.
  const sesionIdRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const acumuladoRef = useRef('');

  // Segmentado
  const rafIdRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segmentTimerRef = useRef<number | null>(null);
  const colaRef = useRef<Promise<void>>(Promise.resolve());
  const fallosSeguidosRef = useRef(0);
  const ultimoSonidoTsRef = useRef(0);

  // Streaming
  const wsRef = useRef<WebSocket | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const esperandoCierreRef = useRef(false);
  const cierreTimeoutRef = useRef<number | null>(null);

  function liberarRecursos() {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    if (segmentTimerRef.current !== null) window.clearTimeout(segmentTimerRef.current);
    segmentTimerRef.current = null;
    if (cierreTimeoutRef.current !== null) window.clearTimeout(cierreTimeoutRef.current);
    cierreTimeoutRef.current = null;
    esperandoCierreRef.current = false;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (scriptNodeRef.current) {
      scriptNodeRef.current.onaudioprocess = null;
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    sesionActivaRef.current = false;
  }

  function acumular(texto: string, separador: string) {
    acumuladoRef.current = concatenar(acumuladoRef.current, texto, separador);
    opcionesRef.current.onTextoParcial(texto);
  }

  function finalizar(auto: boolean) {
    liberarRecursos();
    setActivo(false);
    if (!auto) return;
    const total = acumuladoRef.current.trim();
    if (total) opcionesRef.current.onSilencioFinal(total);
  }

  // ─── Segmentado ────────────────────────────────────────────────────────────

  function encolarTranscripcion(blob: Blob) {
    colaRef.current = colaRef.current.then(async () => {
      const texto = await subirYTranscribir(blob);
      if (limpiandoRef.current) return;
      if (texto === null) {
        fallosSeguidosRef.current += 1;
        if (fallosSeguidosRef.current >= MAX_FALLOS_SEGUIDOS) {
          setError('No se pudo transcribir, intenta de nuevo');
          void detenerSegmentado({ auto: false });
        }
        return;
      }
      fallosSeguidosRef.current = 0;
      if (texto.trim()) acumular(texto, ' ');
    });
  }

  function iniciarSegmento() {
    const stream = streamRef.current;
    if (!stream || limpiandoRef.current) return;
    const mimeType = elegirMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      if (!limpiandoRef.current) iniciarSegmento();
      encolarTranscripcion(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    segmentTimerRef.current = window.setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, DURACION_SEGMENTO_MS);
  }

  function iniciarDeteccionSilencio(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    ultimoSonidoTsRef.current = performance.now();

    const buffer = new Uint8Array(analyser.fftSize);
    function loop() {
      if (limpiandoRef.current) return;
      analyser.getByteTimeDomainData(buffer);
      let suma = 0;
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i] - 128;
        suma += c * c;
      }
      const rms = Math.sqrt(suma / buffer.length);
      const ahora = performance.now();
      if (rms >= UMBRAL_SILENCIO) {
        ultimoSonidoTsRef.current = ahora;
      } else if (ahora - ultimoSonidoTsRef.current >= SILENCIO_MS) {
        void detenerSegmentado({ auto: true });
        return;
      }
      rafIdRef.current = requestAnimationFrame(loop);
    }
    rafIdRef.current = requestAnimationFrame(loop);
  }

  // auto=true: el silencio disparó el corte y se envía. auto=false: corte manual, sin enviar.
  async function detenerSegmentado({ auto }: { auto: boolean }) {
    if (limpiandoRef.current || !sesionActivaRef.current) return;
    limpiandoRef.current = true;
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    if (segmentTimerRef.current !== null) window.clearTimeout(segmentTimerRef.current);

    const recorder = recorderRef.current;
    let textoUltimo: string | null = null;
    if (recorder && recorder.state === 'recording') {
      textoUltimo = await new Promise<string | null>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          void subirYTranscribir(blob).then(resolve);
        };
        recorder.stop();
      });
    }
    // Espera lo que ya estaba en vuelo para no perder texto.
    await colaRef.current;

    if (textoUltimo?.trim()) acumular(textoUltimo, ' ');
    finalizar(auto);
  }

  // ─── Streaming ─────────────────────────────────────────────────────────────

  function iniciarCapturaPCM(stream: MediaStream, ws: WebSocket) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    // Rama aparte, solo para la onda visual.
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    // ScriptProcessorNode está deprecado pero funciona en todos los navegadores evergreen y evita
    // un módulo de AudioWorklet aparte.
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    // onaudioprocess solo se dispara si el nodo llega a un destino; la ganancia en 0 evita que el
    // usuario se escuche por los parlantes.
    const silenciador = audioContext.createGain();
    silenciador.gain.value = 0;
    processor.connect(silenciador);
    silenciador.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (limpiandoRef.current || ws.readyState !== WebSocket.OPEN) return;
      const pcm16 = resamplearAPCM16(e.inputBuffer.getChannelData(0), audioContext.sampleRate, SAMPLE_RATE_DESTINO);
      ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: arrayBufferABase64(pcm16.buffer) }));
    };

    audioContextRef.current = audioContext;
    scriptNodeRef.current = processor;
  }

  async function iniciarStreaming(stream: MediaStream, miSesionId: number) {
    let secreto: string | null = null;
    try {
      const { value } = await vozService.crearSesionStreaming();
      secreto = typeof value === 'string' ? value : null;
    } catch {
      secreto = null;
    }
    // La sesión pudo cortarse (o reemplazarse) mientras esperábamos el POST.
    if (limpiandoRef.current || miSesionId !== sesionIdRef.current) return;
    if (!secreto) {
      setError('No se pudo iniciar el modo streaming, intenta de nuevo');
      finalizar(false);
      return;
    }

    // El navegador no permite headers en un WebSocket: el secreto efímero va como subprotocolo.
    const ws = new WebSocket(URL_REALTIME, ['realtime', `openai-insecure-api-key.${secreto}`]);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!limpiandoRef.current) iniciarCapturaPCM(stream, ws);
    };
    ws.onerror = () => {
      if (!limpiandoRef.current) setError('No se pudo conectar el modo streaming');
    };
    ws.onmessage = (event) => {
      if (limpiandoRef.current) return;
      let mensaje: { type?: string; delta?: string };
      try {
        mensaje = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (mensaje.type) {
        case 'conversation.item.input_audio_transcription.delta':
          if (typeof mensaje.delta === 'string' && mensaje.delta) acumular(mensaje.delta, '');
          break;
        case 'input_audio_buffer.speech_stopped':
          // El servidor detectó los 3 s de silencio: se espera el .completed del último tramo, con
          // tope para no colgar la sesión.
          esperandoCierreRef.current = true;
          cierreTimeoutRef.current = window.setTimeout(() => {
            detenerStreaming({ auto: true });
          }, ESPERA_CIERRE_MS);
          break;
        case 'conversation.item.input_audio_transcription.completed':
          if (esperandoCierreRef.current) detenerStreaming({ auto: true });
          break;
        case 'conversation.item.input_audio_transcription.failed':
        case 'error':
          setError('No se pudo transcribir, intenta de nuevo');
          break;
        default:
          break;
      }
    };
  }

  function detenerStreaming({ auto }: { auto: boolean }) {
    if (limpiandoRef.current || !sesionActivaRef.current) return;
    limpiandoRef.current = true;
    finalizar(auto);
  }

  // ─── Despacho ──────────────────────────────────────────────────────────────

  async function iniciar() {
    if (sesionActivaRef.current || opcionesRef.current.disabled) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Permiso de micrófono denegado');
      return;
    }
    setError(null);
    limpiandoRef.current = false;
    sesionActivaRef.current = true;
    streamRef.current = stream;
    acumuladoRef.current = '';
    colaRef.current = Promise.resolve();
    fallosSeguidosRef.current = 0;
    const miSesionId = ++sesionIdRef.current;
    setActivo(true);

    if (metodoRef.current === 'streaming') {
      await iniciarStreaming(stream, miSesionId);
    } else {
      iniciarDeteccionSilencio(stream);
      iniciarSegmento();
    }
  }

  function detenerActual({ auto }: { auto: boolean }) {
    if (metodoRef.current === 'streaming') detenerStreaming({ auto });
    else void detenerSegmentado({ auto });
  }

  // Identidad estable: el padre lo usa en efectos (ej. reactivar el mic al terminar la lectura) y
  // la onda en su rAF, sin reiniciarse en cada render.
  const toggleRef = useRef<() => void>(() => {});
  useEffect(() => {
    toggleRef.current = () => {
      if (sesionActivaRef.current) detenerActual({ auto: false });
      else void iniciar();
    };
  });
  const toggle = useCallback(() => toggleRef.current(), []);
  const obtenerAnalyser = useCallback(() => analyserRef.current, []);

  function seleccionarMetodo(nuevo: MetodoVoz) {
    if (nuevo === metodoRef.current) return;
    // Cambiar de protocolo a mitad de grabación mezclaría dos sesiones: primero se corta.
    if (sesionActivaRef.current) detenerActual({ auto: false });
    metodoRef.current = nuevo;
    setMetodo(nuevo);
    guardarMetodoVoz(nuevo);
  }

  // Si el input se deshabilita a mitad del dictado (ej. envío en curso), cortar sin enviar.
  useEffect(() => {
    if (opciones.disabled && sesionActivaRef.current) detenerActual({ auto: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones.disabled]);

  useEffect(() => {
    return () => {
      if (sesionActivaRef.current) {
        limpiandoRef.current = true;
        liberarRecursos();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activo, error, metodo, seleccionarMetodo, toggle, obtenerAnalyser };
}
