import './Wizard.css';

interface WizardProps {
  pasoActual: number;
  titulos: string[];
}

export function Wizard({ pasoActual, titulos }: WizardProps) {
  return (
    <div className="wizard">
      <div className="wizard__indicador">
        Paso {pasoActual + 1} de {titulos.length}: {titulos[pasoActual]}
      </div>
      <div className="wizard__puntos">
        {titulos.map((titulo, i) => (
          <span
            key={titulo}
            className={`wizard__punto ${i <= pasoActual ? 'wizard__punto--activo' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
