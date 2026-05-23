'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Package } from 'lucide-react'
import ItemCard from './ItemCard'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import type { Item } from '@/types/database'

interface ItemGridProps {
  items: Item[]
  isLoading?: boolean
  emptyMessage?: string
}

export default function ItemGrid({ items, isLoading = false, emptyMessage }: ItemGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-16 h-16 bg-brand-gray100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-7 h-7 text-brand-gray400" />
        </div>
        <h3 className="text-lg font-semibold text-brand-gray700 mb-1">
          No items found
        </h3>
        <p className="text-sm text-brand-gray500 max-w-sm">
          {emptyMessage || 'Try adjusting your filters or search terms to find what you\'re looking for.'}
        </p>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item, index) => (
        <ItemCard key={item.id} item={item} index={index} />
      ))}
    </div>
  )
}
