import './ImplementableBadge.css';

interface ImplementableBadgeProps {
  /** `null` = inventario no disponible. */
  implementable: boolean | null;
  /** Texto antes del Sí/No (ej. "Se puede implementar: "). */
  prefijo?: string;
}

/** Sí (verde, con check) / No (rojo, con cruz) / Sin dato (gris). */
export function ImplementableBadge({ implementable, prefijo = '' }: ImplementableBadgeProps) {
  const variante = implementable === null ? 'sin-dato' : implementable ? 'si' : 'no';
  const texto = implementable === null ? 'Sin dato' : implementable ? 'Sí' : 'No';
  return (
    <span className={`implementable-badge implementable-badge--${variante}`}>
      {implementable === true && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
      {implementable === false && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
      {prefijo}
      {texto}
    </span>
  );
}
