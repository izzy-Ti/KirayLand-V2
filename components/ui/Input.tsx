'use client'

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export default function Input({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-gray700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray400">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            input-base
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-brand-gray500">{helperText}</p>
      )}
    </div>
  )
}
