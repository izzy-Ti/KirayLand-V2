'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Heart, Star, MapPin, Eye } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import type { Item } from '@/types/database'
import { useLanguage } from '@/lib/context/LanguageContext'

interface ItemCardProps {
  item: Item
  index?: number
}

export default function ItemCard({ item, index = 0 }: ItemCardProps) {
  const { t } = useLanguage()
  const [isLiked, setIsLiked] = React.useState(false)
  const [isImageLoaded, setIsImageLoaded] = React.useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price)
  }

  const conditionLabel = (cond: string) => {
    switch (cond) {
      case 'new':      return t('items.new')
      case 'like_new': return t('items.likeNew')
      case 'good':     return t('items.good')
      default:         return t('items.fair')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link href={`/items/${item.id}`} className="block group">
        <div className="card-interactive overflow-hidden">
          {/* Image Container */}
          <div className="relative aspect-[4/3] bg-brand-gray100 overflow-hidden">
            {/* Shimmer placeholder */}
            {!isImageLoaded && (
              <div className="absolute inset-0 shimmer-effect" />
            )}

            {item.cover_image_url && (
              <img
                src={item.cover_image_url}
                alt={item.title}
                className={`w-full h-full object-cover transition-all duration-500 ease-smooth
                  group-hover:scale-105
                  ${isImageLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                onLoad={() => setIsImageLoaded(true)}
              />
            )}

            {!item.cover_image_url && (
              <div className="flex items-center justify-center h-full text-brand-gray300">
                <Eye className="w-10 h-10" />
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Like button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsLiked(!isLiked)
              }}
              className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200
                ${isLiked
                  ? 'bg-danger/90 text-white'
                  : 'bg-white/80 text-brand-gray600 hover:bg-white hover:text-danger'
                }
              `}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </motion.button>

            {/* Condition badge */}
            {item.attributes?.condition && (
              <div className="absolute top-3 left-3">
                <Badge variant="black">
                  {conditionLabel(item.attributes.condition)}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Title */}
            <h3 className="font-semibold text-sm text-brand-black truncate group-hover:text-brand-gray700 transition-colors">
              {item.title}
            </h3>

            {/* Brand/Model */}
            {(item.attributes?.brand || item.attributes?.model) && (
              <p className="text-xs text-brand-gray500 mt-0.5 truncate">
                {[item.attributes.brand, item.attributes.model].filter(Boolean).join(' • ')}
              </p>
            )}

            {/* Location & Rating */}
            <div className="flex items-center gap-3 mt-2">
              {item.city && (
                <span className="flex items-center gap-1 text-xs text-brand-gray400">
                  <MapPin className="w-3 h-3" />
                  {item.city}
                </span>
              )}
              {item.rating_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-brand-gray400">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {item.rating_avg.toFixed(1)}
                  <span className="text-brand-gray300">({item.rating_count})</span>
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-gray100">
              <div>
                <span className="text-lg font-bold text-brand-black">
                  ETB {formatPrice(item.price_per_day_etb)}
                </span>
                <span className="text-xs text-brand-gray400 ml-1">{t('items.perDay')}</span>
              </div>

              {/* Hover action hint */}
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-xs text-brand-gray400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                {t('items.view')}
              </motion.span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
