import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { ChipVersion } from '../../estructura/ChipVersion/ChipVersion';
import { GRUPOS_CAMBIO, type GrupoCambio, type VarianteChip } from '../../../../domain/estructura/asignaciones';
import './ResumenAsignacionModal.css';

export interface CambioResumen {
  clave: string;
  grupo: GrupoCambio;
  planograma: string;
  tiendaCodigo: string;
  tiendaNombre: string;
  antes: { texto: string; variante: VarianteChip };
  despues: { texto: string; variante: VarianteChip };
  distinta: boolean;
}

interface ResumenAsignacionModalProps {
  cambios: CambioResumen[];
  enviando: boolean;
  onConfirmar: (motivo: string) => void;
  onClose: () => void;
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function ResumenAsignacionModal({ cambios, enviando, onConfirmar, onClose }: ResumenAsignacionModalProps) {
  const [motivo, setMotivo] = useState('');

  const grupos = GRUPOS_CAMBIO.map((g) => ({ ...g, items: cambios.filter((c) => c.grupo === g.id) })).filter((g) => g.items.length > 0);
  const planogramas = new Set(cambios.map((c) => c.planograma)).size;
  const tiendas = new Set(cambios.map((c) => c.tiendaCodigo)).size;
  const distintas = cambios.filter((c) => c.distinta).length;

  return (
    <Modal
      titulo="Revisa antes de guardar"
      ancho="xl"
      claseModal="resumen-asignacion"
      onClose={enviando ? () => {} : onClose}
      footer={
        <>
          <span className="resumen-asignacion__pie">Los cambios aplican de inmediato en la vista de implementadores de cada tienda.</span>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Volver a editar
          </Button>
          <Button onClick={() => onConfirmar(motivo)} disabled={enviando}>
            {enviando ? 'Guardando…' : `Guardar ${plural(cambios.length, 'cambio', 'cambios')}`}
          </Button>
        </>
      }
    >
      <p className="resumen-asignacion__resumen">
        {plural(cambios.length, 'cambio', 'cambios')} en {plural(planogramas, 'planograma', 'planogramas')} y{' '}
        {plural(tiendas, 'tienda', 'tiendas')}.
      </p>

      <div className="resumen-asignacion__conteos">
        {grupos.map((g) => (
          <div key={g.id} className={`resumen-asignacion__conteo resumen-asignacion__conteo--${g.id.toLowerCase().replace('_', '-')}`}>
            <span className="resumen-asignacion__conteo-numero">{g.items.length}</span>
            <span className="resumen-asignacion__conteo-texto">{g.corto}</span>
          </div>
        ))}
      </div>

      {distintas > 0 && (
        <div className="resumen-asignacion__aviso" role="note">
          <strong>
            {distintas === 1
              ? '1 asignación usa una versión distinta al tipo de su tienda.'
              : `${distintas} asignaciones usan una versión distinta al tipo de su tienda.`}
          </strong>{' '}
          Se permite, pero verifica que el mueble de la tienda tenga espacio para esa versión.
        </div>
      )}

      <div className="resumen-asignacion__grupos">
        {grupos.map((g) => (
          <section key={g.id} className="resumen-asignacion__grupo">
            <h3 className={`resumen-asignacion__titulo resumen-asignacion__titulo--${g.id.toLowerCase().replace('_', '-')}`}>
              {g.titulo} <span>{g.items.length}</span>
            </h3>
            <p className="resumen-asignacion__implicacion">{g.implicacion}</p>
            <ul className="resumen-asignacion__lista">
              {g.items.map((c) => (
                <li key={c.clave} className="resumen-asignacion__item">
                  <span className="resumen-asignacion__planograma">{c.planograma}</span>
                  <span className="resumen-asignacion__tienda">
                    <span className="mono">{c.tiendaCodigo}</span> {c.tiendaNombre}
                  </span>
                  <span className="resumen-asignacion__transicion">
                    <ChipVersion texto={c.antes.texto} variante={c.antes.variante} tachado={g.id === 'QUITA'} />
                    <span aria-label="pasa a">→</span>
                    <ChipVersion texto={c.despues.texto} variante={c.despues.variante} />
                    {c.distinta && (
                      <span className="resumen-asignacion__distinta" title="Versión distinta al tipo de tienda">
                        !
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <label className="resumen-asignacion__motivo">
        <span>
          Motivo del cambio <span className="resumen-asignacion__opcional">(opcional, queda en el historial)</span>
        </span>
        <textarea
          rows={2}
          maxLength={500}
          value={motivo}
          placeholder="Ej. Tienda remodelada con góndola de 4 m"
          onChange={(e) => setMotivo(e.target.value)}
        />
      </label>
    </Modal>
  );
}
