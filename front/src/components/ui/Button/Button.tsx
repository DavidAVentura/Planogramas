import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

type Variante = 'primary' | 'outline' | 'ghost' | 'peligro';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

export function Button({ variante = 'primary', className, type = 'button', ...props }: ButtonProps) {
  const clases = ['button', `button--${variante}`, className].filter(Boolean).join(' ');
  return <button type={type} className={clases} {...props} />;
}
