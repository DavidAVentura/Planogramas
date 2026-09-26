import { useCallback, useEffect, useRef, useState } from 'react';
import { vozService } from '../services/voz.service';
import {
  cargarMetodoTts, cargarVelocidadTts, cargarVozTts,
  guardarMetodoTts, guardarVelocidadTts, guardarVozTts,
} from '../config/preferenciasVoz';
import type { MetodoTts, VozTts } from '../config/preferenciasVoz';

const IDIOMA_WEBSPEECH = 'es-ES';

interface UseTextoAVozResultado {
  reproduciendoId: string | null;
  cargando: boolean;
  error: string | null;
  metodo: MetodoTts;
  seleccionarMetodo: (metodo: MetodoTts) => void;
  voz: VozTts;
  seleccionarVoz: (voz: VozTts) => void;
  velocidad: number;
  seleccionarVelocidad: (velocidad: number) => void;
  /** `onFin` solo se dispara si la lectura termina naturalmente — no si se corta con `detener()`
   * ni si la reemplaza otra lectura. */
  reproducir: (id: string, texto: string, onFin?: () => void) => void;
  detener: () => void;
}

/** Texto → voz, con el motor de OpenAI (voz y velocidad configurables) o el del navegador. */
export function useTextoAVoz(): UseTextoAVozResultado {
  const [reproduciendoId, setReproduciendoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<MetodoTts>(() => cargarMetodoTts());
  const [voz, setVoz] = useState<VozTts>(() => cargarVozTts());
  const [velocidad, setVelocidad] = useState<number>(() => cargarVelocidadTts());

  // Refs porque `reproducir` está memoizado: sin ellas, un cambio de voz o velocidad no se vería
  // hasta que se recree el callback.
  const metodoRef = useRef(metodo);
  const vozRef = useRef(voz);
  const velocidadRef = useRef(velocidad);
  useEffect(() => {
    metodoRef.current = metodo;
    vozRef.current = voz;
    velocidadRef.current = velocidad;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlObjetoRef = useRef<string | null>(null);
  // Sube en cada reproducir()/detener(): un /voz/tts que llega tarde se descarta.
  const solicitudIdRef = useRef(0);

  const limpiarAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlObjetoRef.current) {
      URL.revokeObjectURL(urlObjetoRef.current);
      urlObjetoRef.current = null;
    }
  }, []);

  const detener = useCallback(() => {
    solicitudIdRef.current += 1;
    window.speechSynthesis?.cancel();
    limpiarAudio();
    setCargando(false);
    setReproduciendoId(null);
  }, [limpiarAudio]);

  const reproducir = useCallback(
    (id: string, texto: string, onFin?: () => void) => {
      if (!texto.trim()) return;
      detener();
      setError(null);
      setReproduciendoId(id);
      const miSolicitudId = solicitudIdRef.current;
      const soltarId = () => setReproduciendoId((actual) => (actual === id ? null : actual));
      const terminar = () => {
        soltarId();
        if (solicitudIdRef.current === miSolicitudId) onFin?.();
      };

      if (metodoRef.current === 'webspeech') {
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = IDIOMA_WEBSPEECH;
        utterance.onend = terminar;
        utterance.onerror = () => {
          setError('No se pudo reproducir el audio');
          soltarId();
        };
        window.speechSynthesis.speak(utterance);
        return;
      }

      setCargando(true);
      vozService
        .sintetizar({ texto, voz: vozRef.current, velocidad: velocidadRef.current })
        .then(async (blob) => {
          if (miSolicitudId !== solicitudIdRef.current) return;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          urlObjetoRef.current = url;
          audio.onended = () => {
            limpiarAudio();
            terminar();
          };
          audio.onerror = () => {
            setError('No se pudo reproducir el audio');
            limpiarAudio();
            soltarId();
          };
          setCargando(false);
          await audio.play();
        })
        .catch(() => {
          if (miSolicitudId !== solicitudIdRef.current) return;
          setError('No se pudo generar el audio');
          setCargando(false);
          limpiarAudio();
          soltarId();
        });
    },
    [detener, limpiarAudio],
  );

  function seleccionarMetodo(nuevo: MetodoTts) {
    if (nuevo === metodoRef.current) return;
    detener();
    setMetodo(nuevo);
    guardarMetodoTts(nuevo);
  }

  function seleccionarVoz(nueva: VozTts) {
    if (nueva === vozRef.current) return;
    detener();
    setVoz(nueva);
    guardarVozTts(nueva);
  }

  function seleccionarVelocidad(nueva: number) {
    detener();
    setVelocidad(nueva);
    guardarVelocidadTts(nueva);
  }

  useEffect(() => detener, [detener]);

  return {
    reproduciendoId, cargando, error,
    metodo, seleccionarMetodo,
    voz, seleccionarVoz,
    velocidad, seleccionarVelocidad,
    reproducir, detener,
  };
}
