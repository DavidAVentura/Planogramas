import { Button } from '../../../ui/Button/Button';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { useTiendaImplementador } from '../../../../context/TiendaImplementadorContext';

/** Estado vacío de las vistas del Implementador mientras no haya una tienda elegida. */
export function SinTiendaElegida() {
  const { abrirSelector } = useTiendaImplementador();
  return (
    <EmptyState
      titulo="Elige tu tienda"
      hint="Para ver los planogramas que te toca montar, primero elige la tienda en la que trabajas."
      accion={<Button onClick={abrirSelector}>Elegir tienda</Button>}
    />
  );
}
