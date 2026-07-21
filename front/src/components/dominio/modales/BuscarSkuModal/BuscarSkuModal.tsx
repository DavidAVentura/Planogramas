import { useState, type FormEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useBuscarPosicionesPorSku } from '../../../../hooks/usePosiciones';
import './BuscarSkuModal.css';

interface BuscarSkuModalProps {
  versionId: number;
  onClose: () => void;
}

export function BuscarSkuModal({ versionId, onClose }: BuscarSkuModalProps) {
  const [sku, setSku] = useState('');
  const { resultado, buscar, cargando } = useBuscarPosicionesPorSku();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sku.trim()) buscar(sku.trim(), versionId);
  }

  return (
    <Modal
      titulo="¿Dónde está este SKU?"
      onClose={onClose}
      footer={
        <Button variante="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <form className="buscar-sku-form" onSubmit={onSubmit}>
        <label className="buscar-sku-form__campo">
          <span>SKU</span>
          <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} required />
        </label>
        <Button type="submit" disabled={cargando}>
          Buscar
        </Button>
      </form>

      {cargando && <p className="buscar-sku-form__ayuda">Buscando…</p>}

      {resultado && (
        <div className="buscar-sku-resultado">
          <p>
            {resultado.totalPosicionesEnVersion} posición(es) encontrada(s) en esta versión.
            {resultado.skuSustitutoRecomendado && ` SKU sustituto recomendado: ${resultado.skuSustitutoRecomendado}.`}
          </p>
          {resultado.posiciones.length > 0 && (
            <ul>
              {resultado.posiciones.map((p) => (
                <li key={p.id}>
                  {p.gondolaNombre} · Nivel {p.nivelOrden} · posición {p.orden_horizontal}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
