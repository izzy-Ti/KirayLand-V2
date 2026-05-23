import React from 'react'

interface BadgeProps {
  variant?: 'black' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variantStyles = {
  black:   'bg-brand-black text-white',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger:  'bg-red-50 text-red-700 border border-red-200',
  info:    'bg-blue-50 text-blue-700 border border-blue-200',
  neutral: 'bg-brand-gray100 text-brand-gray600 border border-brand-gray200',
}

export default function Badge({ variant = 'neutral', children, dot, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-badge ${variantStyles[variant]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === 'success' ? 'bg-green-500' :
          variant === 'warning' ? 'bg-amber-500' :
          variant === 'danger'  ? 'bg-red-500' :
          variant === 'info'    ? 'bg-blue-500' :
          variant === 'black'   ? 'bg-white' :
          'bg-brand-gray400'
        }`} />
      )}
      {children}
    </span>
  )
}
