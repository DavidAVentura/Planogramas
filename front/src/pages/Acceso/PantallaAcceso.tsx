import type { ReactNode } from 'react';
import isotipoCemaco from '../../assets/cemaco-isotipo.png';
import './PantallaAcceso.css';

interface PantallaAccesoProps {
  titulo: string;
  mensaje?: string;
  cargando?: boolean;
  accion?: ReactNode;
}

/** Layout de pantalla completa para /auth y el bloqueo por falta de sesión. */
export function PantallaAcceso({ titulo, mensaje, cargando = false, accion }: PantallaAccesoProps) {
  return (
    <main className="pantalla-acceso">
      <section className="pantalla-acceso__tarjeta" aria-live="polite" aria-busy={cargando}>
        <div className="pantalla-acceso__marca">
          <img className="pantalla-acceso__isotipo" src={isotipoCemaco} alt="Cemaco" />
          <div>
            <div className="pantalla-acceso__app">Planogramas</div>
            <div className="pantalla-acceso__eyebrow">CEMACO</div>
          </div>
        </div>
        {cargando && <div className="pantalla-acceso__spinner" aria-hidden="true" />}
        <h1 className="pantalla-acceso__titulo">{titulo}</h1>
        {mensaje && <p className="pantalla-acceso__mensaje">{mensaje}</p>}
        {accion}
      </section>
    </main>
  );
}
