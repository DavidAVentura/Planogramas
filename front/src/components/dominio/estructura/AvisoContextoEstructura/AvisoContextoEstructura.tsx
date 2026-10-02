import { Link } from 'react-router-dom';
import './AvisoContextoEstructura.css';

export type VarianteAviso = 'filtro' | 'piloto' | 'listo';

interface AvisoContextoEstructuraProps {
  variante: VarianteAviso;
  titulo: string;
  texto: string;
  /** Conteo destacado a la derecha, ej. "3 tiendas". */
  conteo?: string;
  /** Nota secundaria, ej. la piloto anterior que se archivará. */
  nota?: string | null;
  volverA: string;
  textoVolver: string;
}

const ICONO: Record<VarianteAviso, string> = {
  filtro: 'M4 5h16l-6 7.5V19l-4-2v-4.5L4 5z',
  piloto: 'M12 19V5M5 12l7-7 7 7',
  listo: 'M5 12l5 5 9-10',
};

/** Aviso que reemplaza el título de Estructura cuando se llega desde el detalle de un planograma. */
export function AvisoContextoEstructura({ variante, titulo, texto, conteo, nota, volverA, textoVolver }: AvisoContextoEstructuraProps) {
  return (
    <div className={`aviso-contexto-estructura aviso-contexto-estructura--${variante}`} role="status">
      <span className="aviso-contexto-estructura__icono" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d={ICONO[variante]} />
        </svg>
      </span>
      <div className="aviso-contexto-estructura__textos">
        <strong>{titulo}</strong>
        <span>{texto}</span>
        {nota && <span className="aviso-contexto-estructura__nota">{nota}</span>}
      </div>
      {conteo && <span className="aviso-contexto-estructura__conteo">{conteo}</span>}
      <Link className="aviso-contexto-estructura__volver" to={volverA}>
        {textoVolver}
      </Link>
    </div>
  );
}
