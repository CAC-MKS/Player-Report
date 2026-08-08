/**
 * BrutalistCard — Neo-Brutalist card primitive
 *
 * Props:
 *   title       {string}  optional — rendered as uppercase bold monospace header above children
 *   accentColor {string}  optional — adds a 4px left border in this color
 *   padding     {number}  optional, default 16 — padding on the card body wrapper
 *   children    {node}    content rendered inside the card body
 */
export default function BrutalistCard({ title, accentColor, padding = 16, children }) {
  const cardStyle = {
    border: 'var(--border-brutal)',
    boxShadow: 'var(--shadow-brutal)',
    background: 'var(--color-white)',
    borderRadius: 0,
    ...(accentColor ? { borderLeft: `4px solid ${accentColor}` } : {}),
  };

  const headerStyle = {
    fontWeight: 700,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    padding: '8px 16px',
    borderBottom: 'var(--border-brutal)',
  };

  const bodyStyle = {
    padding: padding,
  };

  return (
    <div style={cardStyle}>
      {title && (
        <div style={headerStyle}>
          {title}
        </div>
      )}
      <div style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}
