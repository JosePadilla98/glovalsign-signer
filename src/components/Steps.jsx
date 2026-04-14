/**
 * Multi-step progress indicator.
 *
 * @param {{ label: string }[]} steps  - Array of step definitions
 * @param {number} currentStep         - 0-based index of the active step
 */
export function Steps({ steps, currentStep }) {
  return (
    <nav className="steps" aria-label="Pasos del proceso de firma">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const className = [
          'step',
          isCompleted ? 'step--completed' : '',
          isActive ? 'step--active' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div key={step.label} className={className}>
            <div className="step__circle" aria-current={isActive ? 'step' : undefined}>
              {isCompleted ? '✓' : index + 1}
            </div>
            <span className="step__label">{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
