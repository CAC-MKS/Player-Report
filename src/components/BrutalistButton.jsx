/**
 * BrutalistButton — Neo-Brutalist interactive button primitive
 * Feature: neo-brutalist-dashboard-redesign
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

const variantStyles = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-black)',
  },
  danger: {
    background: '#D90429',
    color: '#FFFFFF',
  },
}

export default function BrutalistButton({
  onClick,
  disabled = false,
  variant = 'primary',
  children,
}) {
  const styles = variantStyles[variant] ?? variantStyles.primary

  return (
    <>
      <style>{`
        .brutalist-btn {
          border: var(--border-brutal-thick);
          box-shadow: var(--shadow-brutal);
          font-weight: 700;
          border-radius: 0;
          font-family: monospace;
          padding: 8px 16px;
          cursor: pointer;
          transition: none;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .brutalist-btn:active:not(:disabled) {
          transform: translate(3px, 3px);
          box-shadow: 3px 3px 0px 0px #000000;
        }
        .brutalist-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
      <button
        className="brutalist-btn"
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={{
          background: styles.background,
          color: styles.color,
        }}
      >
        {children}
      </button>
    </>
  )
}
