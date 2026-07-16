import { useState, type KeyboardEvent } from 'react';
import './ChipInput.css';

interface ChipInputProps {
  valores: string[];
  onChange: (valores: string[]) => void;
  placeholder?: string;
}

export function ChipInput({ valores, onChange, placeholder }: ChipInputProps) {
  const [texto, setTexto] = useState('');

  function agregar() {
    const limpio = texto.trim();
    if (limpio && !valores.includes(limpio)) onChange([...valores, limpio]);
    setTexto('');
  }

  function quitar(valor: string) {
    onChange(valores.filter((v) => v !== valor));
  }

  function alPresionarTecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      agregar();
    } else if (e.key === 'Backspace' && texto === '' && valores.length > 0) {
      onChange(valores.slice(0, -1));
    }
  }

  return (
    <div className="chip-input">
      {valores.map((valor) => (
        <span key={valor} className="chip-input__chip">
          {valor}
          <button type="button" onClick={() => quitar(valor)} aria-label={`Quitar ${valor}`}>
            &times;
          </button>
        </span>
      ))}
      <input
        className="chip-input__campo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={alPresionarTecla}
        onBlur={agregar}
        placeholder={valores.length === 0 ? placeholder : undefined}
      />
    </div>
  );
}
