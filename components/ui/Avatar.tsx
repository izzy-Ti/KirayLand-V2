import React from 'react'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallback?: string
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

export default function Avatar({ src, alt, size = 'md', className = '', fallback }: AvatarProps) {
  const initials = fallback
    ? fallback.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <div className={`relative rounded-full overflow-hidden flex items-center justify-center bg-brand-gray200 ${sizeStyles[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt || ''} className="w-full h-full object-cover" />
      ) : initials ? (
        <span className="font-semibold text-brand-gray600">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-brand-gray400" />
      )}
    </div>
  )
}
