import { useMemo, useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Wizard } from '../../../ui/Wizard/Wizard';
import { useTiendas } from '../../../../hooks/useTiendas';
import { useCrearVersion } from '../../../../hooks/useVersiones';
import { ESTADO_META } from '../../EstadoBadge/EstadoBadge';
import type { Version, VersionListItem } from '../../../../types/version';
import './VersionEspecialWizard.css';

const TITULOS_PASO = ['Elegir versión base', 'Elegir tienda'];

interface VersionEspecialWizardProps {
  planogramaId: number;
  versionesBase: VersionListItem[];
  onClose: () => void;
  onCreada: (version: Version) => void;
}

export function VersionEspecialWizard({
  planogramaId,
  versionesBase,
  onClose,
  onCreada,
}: VersionEspecialWizardProps) {
  const [paso, setPaso] = useState(0);
  const [versionBaseId, setVersionBaseId] = useState<number | null>(null);
  const [tiendaId, setTiendaId] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const { crear, enviando } = useCrearVersion();

  const versionesBaseDisponibles = useMemo(
    () => versionesBase.filter((v) => v.estado !== 'archivado'),
    [versionesBase],
  );
  const versionBase = versionesBaseDisponibles.find((v) => v.id === versionBaseId) ?? null;

  const filtrosTiendas = useMemo(
    () =>
      versionBase
        ? { sinVersionEspecial: true, planogramaId, versionBaseId: versionBase.id, tipo: versionBase.tipo }
        : null,
    [versionBase, planogramaId],
  );
  const { tiendas, cargando: cargandoTiendas } = useTiendas(filtrosTiendas);

  async function confirmar() {
    if (!versionBase || !tiendaId) return;
    const version = await crear(planogramaId, {
      tipo: versionBase.tipo,
      versionBaseId: versionBase.id,
      tiendaId,
      notas: notas.trim() || undefined,
    });
    if (version) onCreada(version);
  }

  return (
    <Modal
      titulo="Versión especial por tienda"
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={paso === 0 ? onClose : () => setPaso(0)} disabled={enviando}>
            {paso === 0 ? 'Cancelar' : 'Atrás'}
          </Button>
          {paso === 0 ? (
            <Button onClick={() => setPaso(1)} disabled={!versionBaseId}>
              Siguiente
            </Button>
          ) : (
            <Button onClick={confirmar} disabled={!tiendaId || enviando}>
              Crear versión especial
            </Button>
          )}
        </>
      }
    >
      <Wizard pasoActual={paso} titulos={TITULOS_PASO} />

      {paso === 0 ? (
        <div className="version-especial-wizard__campo">
          <label>
            <span>Versión base</span>
            <select value={versionBaseId ?? ''} onChange={(e) => setVersionBaseId(Number(e.target.value) || null)}>
              <option value="">Seleccionar versión</option>
              {versionesBaseDisponibles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.codigo} ({v.tipo}) — {ESTADO_META[v.estado]?.label ?? v.estado}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Notas (opcional)</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={500} />
          </label>
        </div>
      ) : (
        <div className="version-especial-wizard__campo">
          <p>
            Se clonará toda la estructura de <strong>{versionBase?.codigo}</strong> para la tienda elegida.
          </p>
          <label>
            <span>Tienda</span>
            <select value={tiendaId ?? ''} onChange={(e) => setTiendaId(Number(e.target.value) || null)}>
              <option value="">{cargandoTiendas ? 'Cargando…' : 'Seleccionar tienda'}</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.codigo})
                </option>
              ))}
            </select>
            {!cargandoTiendas && tiendas.length === 0 && (
              <span className="version-especial-wizard__hint">
                Todas las tiendas de tipo {versionBase?.tipo} ya tienen una versión especial de esta base.
              </span>
            )}
          </label>
        </div>
      )}
    </Modal>
  );
}
