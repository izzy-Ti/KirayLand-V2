'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
}

const sizeStyles = {
  sm: 'px-4 py-2 text-xs gap-1.5',
  md: 'px-6 py-3 text-sm gap-2',
  lg: 'px-8 py-3.5 text-base gap-2.5',
}

const variantStyles = {
  primary: 'bg-brand-black text-white hover:bg-brand-gray800 hover:shadow-card-md',
  secondary: 'bg-brand-gray100 text-brand-black border border-brand-gray200 hover:bg-brand-gray200 hover:border-brand-gray300',
  ghost: 'bg-transparent text-brand-black hover:bg-brand-gray100',
  danger: 'bg-danger text-white hover:bg-red-700',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`
        inline-flex items-center justify-center font-medium rounded-button
        transition-all duration-200 ease-smooth select-none
        focus:outline-none focus:ring-2 focus:ring-brand-black/20 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </motion.button>
  )
}
