import { Badge } from '../../../ui/Badge/Badge';
import { ESTADO_VERSION_IMPLEMENTACION_META } from '../../../../constants/implementacion';
import type { EstadoVersionImplementacion } from '../../../../types/implementacion';

/** "Publicada" / "Piloto": la versión que la tienda monta. */
export function EstadoVersionBadge({ estado }: { estado: EstadoVersionImplementacion }) {
  const meta = ESTADO_VERSION_IMPLEMENTACION_META[estado] ?? { label: estado, bg: 'var(--ink-100)', color: 'var(--fg-2)' };
  return (
    <Badge bg={meta.bg} color={meta.color}>
      {meta.label}
    </Badge>
  );
}
