import { useEffect, useRef, useState } from 'react';
import './OndaVoz.css';

const NUM_BARRAS = 27;
// Mezcla con el valor anterior para que las barras no tiemblen.
const SUAVIZADO = 0.35;
const ALTURA_MIN = 0.08;
// Calibrado a oído.
const DIVISOR_NIVEL = 90;

interface OndaVozProps {
  obtenerAnalyser: () => AnalyserNode | null;
}

function alturasEnReposo(): number[] {
  return new Array(NUM_BARRAS).fill(ALTURA_MIN);
}

/** Onda animada con el nivel del micrófono; reemplaza al textarea mientras se dicta. */
export function OndaVoz({ obtenerAnalyser }: OndaVozProps) {
  const [alturas, setAlturas] = useState<number[]>(alturasEnReposo);
  const alturasRef = useRef(alturas);

  useEffect(() => {
    let rafId: number | null = null;
    let buffer: Uint8Array<ArrayBuffer> | null = null;

    function loop() {
      const analyser = obtenerAnalyser();
      // El AudioContext tarda un tick en armarse: se sigue pidiendo frame a frame.
      if (analyser) {
        if (!buffer || buffer.length !== analyser.fftSize) buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        analyser.getByteTimeDomainData(buffer);
        const porBarra = Math.floor(buffer.length / NUM_BARRAS) || 1;
        const nuevas = alturasRef.current.slice();
        for (let i = 0; i < NUM_BARRAS; i++) {
          let pico = 0;
          for (let j = 0; j < porBarra; j++) {
            const d = Math.abs(buffer[i * porBarra + j] - 128);
            if (d > pico) pico = d;
          }
          const nivel = Math.max(ALTURA_MIN, Math.min(1, pico / DIVISOR_NIVEL));
          nuevas[i] += (nivel - nuevas[i]) * SUAVIZADO;
        }
        alturasRef.current = nuevas;
        setAlturas(nuevas);
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [obtenerAnalyser]);

  return (
    <div className="onda-voz" aria-hidden="true">
      {alturas.map((a, i) => (
        <span key={i} className="onda-voz__barra" style={{ height: `${Math.round(a * 100)}%` }} />
      ))}
    </div>
  );
}
