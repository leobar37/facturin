import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function FormInput({ label, error, id, className: _className, ...props }: FormInputProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 500,
          color: '#333',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
          borderRadius: '0.375rem',
          fontSize: '1rem',
          outline: 'none',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p
          id={`${id}-error`}
          style={{
            color: '#dc2626',
            fontSize: '0.875rem',
            marginTop: '0.25rem',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
