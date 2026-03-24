import React from 'react';

interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function FormButton({ loading = false, children, disabled, className: _className, ...props }: FormButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      {...props}
      style={{
        width: '100%',
        padding: '0.75rem',
        backgroundColor: loading ? '#93c5fd' : '#1976d2',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        fontSize: '1rem',
        fontWeight: 500,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          Cargando...
        </span>
      ) : (
        children
      )}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
}
