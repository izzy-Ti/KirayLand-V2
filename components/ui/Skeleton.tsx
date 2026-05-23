import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  count?: number
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseClasses = 'shimmer-effect rounded-lg'

  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-card',
    card: 'rounded-card h-64 w-full',
  }

  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${variantClasses[variant]} ${className}`}
          style={style}
        />
      ))}
    </>
  )
}

// ── Item Card Skeleton ─────────────────────────────────────
export function ItemCardSkeleton() {
  return (
    <div className="card p-0">
      <Skeleton variant="rectangular" className="w-full h-52" />
      <div className="p-4 space-y-3">
        <Skeleton width="60%" />
        <Skeleton width="40%" height={12} />
        <div className="flex items-center justify-between pt-2">
          <Skeleton width={80} height={20} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      </div>
    </div>
  )
}
