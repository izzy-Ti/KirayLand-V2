'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Search, SlidersHorizontal, ChevronDown, ChevronRight,
  Star, MapPin, X, Sparkles
} from 'lucide-react'
import type { Category, ItemFilters } from '@/types/database'
import { useLanguage } from '@/lib/context/LanguageContext'

interface FilterPanelProps {
  categories: Category[]
  filters: ItemFilters
  onFilterChange: (filters: Partial<ItemFilters>) => void
  onReset: () => void
  isOpen: boolean
  onToggle: () => void
}

const CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa',
  'Mekelle', 'Jimma', 'Adama', 'Gondar'
]

export default function FilterPanel({
  categories,
  filters,
  onFilterChange,
  onReset,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  const { t } = useLanguage()
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([])

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const rootCategories = categories.filter(c => !c.parent_id)
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId)

  const CONDITIONS = [
    { value: 'new', label: t('filter.brandNew') },
    { value: 'like_new', label: t('filter.likeNew') },
    { value: 'good', label: t('filter.good') },
    { value: 'fair', label: t('filter.fair') },
  ]

  const SORT_OPTIONS = [
    { value: 'newest', label: t('filter.newestFirst') },
    { value: 'price_asc', label: t('filter.priceLowHigh') },
    { value: 'price_desc', label: t('filter.priceHighLow') },
    { value: 'rating', label: t('filter.topRated') },
    { value: 'popular', label: t('filter.mostPopular') },
  ]

  const activeFilterCount = [
    filters.category_slug,
    filters.min_price,
    filters.max_price,
    filters.city,
    filters.min_rating,
    filters.brand,
    filters.condition,
  ].filter(Boolean).length

  return (
    <>
      {/* Mobile Filter Toggle */}
      <button
        onClick={onToggle}
        className="lg:hidden btn-secondary w-full flex items-center justify-center gap-2 mb-4"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t('filter.filters')}
        {activeFilterCount > 0 && (
          <span className="w-5 h-5 bg-brand-black text-white rounded-full text-xs flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? 280 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          lg:block overflow-hidden
          ${isOpen ? 'fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto' : 'hidden lg:block'}
        `}
      >
        {/* Mobile overlay */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onToggle} />
        )}

        <div className={`
          w-[280px] bg-white border-r border-brand-gray200 h-full overflow-y-auto
          lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:rounded-card lg:border
          fixed lg:relative z-50 lg:z-auto
        `}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-brand-gray100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-brand-gray500" />
              <h3 className="font-semibold text-sm">{t('filter.filters')}</h3>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={onReset}
                  className="text-xs text-brand-gray500 hover:text-danger transition-colors"
                >
                  {t('filter.clearAll')}
                </button>
              )}
              <button onClick={onToggle} className="lg:hidden p-1 hover:bg-brand-gray100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* ── Sort By ──────────────────────── */}
            <div>
              <label className="text-xs font-semibold text-brand-gray500 uppercase tracking-wide mb-2 block">
                {t('filter.sortBy')}
              </label>
              <select
                value={filters.sort_by || 'newest'}
                onChange={e => onFilterChange({ sort_by: e.target.value as any })}
                className="input-base text-sm py-2"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* ── Categories (Tree) ────────────── */}
            <div>
              <label className="text-xs font-semibold text-brand-gray500 uppercase tracking-wide mb-2 block">
                {t('filter.category')}
              </label>
              <div className="space-y-0.5">
                <button
                  onClick={() => onFilterChange({ category_slug: undefined })}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                    !filters.category_slug
                      ? 'bg-brand-black text-white font-medium'
                      : 'text-brand-gray600 hover:bg-brand-gray50'
                  }`}
                >
                  {t('filter.allCategories')}
                </button>
                {rootCategories.map(cat => {
                  const children = getChildren(cat.id)
                  const isExpanded = expandedCategories.includes(cat.id)

                  return (
                    <div key={cat.id}>
                      <div className="flex items-center">
                        {children.length > 0 && (
                          <button
                            onClick={() => toggleCategory(cat.id)}
                            className="p-1 text-brand-gray400 hover:text-brand-black"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                        <button
                          onClick={() => onFilterChange({ category_slug: cat.slug })}
                          className={`flex-1 text-left px-3 py-2 text-sm rounded-lg transition-all ${
                            filters.category_slug === cat.slug
                              ? 'bg-brand-black text-white font-medium'
                              : 'text-brand-gray600 hover:bg-brand-gray50'
                          }`}
                        >
                          {cat.name}
                        </button>
                      </div>

                      {/* Subcategories */}
                      {isExpanded && children.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-6 space-y-0.5"
                        >
                          {children.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => onFilterChange({ category_slug: sub.slug })}
                              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all ${
                                filters.category_slug === sub.slug
                                  ? 'bg-brand-gray800 text-white font-medium'
                                  : 'text-brand-gray500 hover:bg-brand-gray50'
                              }`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Price Range ──────────────────── */}
            <div>
              <label className="text-xs font-semibold text-brand-gray500 uppercase tracking-wide mb-2 block">
                {t('filter.priceRange')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t('filter.min')}
                  value={filters.min_price || ''}
                  onChange={e => onFilterChange({ min_price: e.target.value ? Number(e.target.value) : undefined })}
                  className="input-base text-sm py-2 w-full"
                />
                <span className="text-brand-gray400 text-sm">–</span>
                <input
                  type="number"
                  placeholder={t('filter.max')}
                  value={filters.max_price || ''}
                  onChange={e => onFilterChange({ max_price: e.target.value ? Number(e.target.value) : undefined })}
                  className="input-base text-sm py-2 w-full"
                />
              </div>
            </div>

            {/* ── City ─────────────────────────── */}
            <div>
              <label className="text-xs font-semibold text-brand-gray500 uppercase tracking-wide mb-2 block">
                <MapPin className="w-3 h-3 inline mr-1" />
                {t('filter.city')}
              </label>
              <select
                value={filters.city || ''}
                onChange={e => onFilterChange({ city: e.target.value || undefined })}
                className="input-base text-sm py-2"
              >
                <option value="">{t('filter.allCities')}</option>
                {CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* ── Minimum Rating ───────────────── */}
            <div>
              <label className="text-xs font-semibold text-brand-gray500 uppercase tracking-wide mb-2 block">
                <Star className="w-3 h-3 inline mr-1" />
                {t('filter.minRating')}
              </label>
              <div className="flex gap-1">
                {[0, 3, 3.5, 4, 4.5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => onFilterChange({ min_rating: rating || undefined })}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-pill border transition-all ${
                      (filters.min_rating || 0) === rating
                        ? 'bg-brand-black text-white border-brand-black'
                        : 'border-brand-gray200 text-brand-gray500 hover:border-brand-gray400'
                    }`}
                  >
                    {rating === 0 ? t('common.any') : `${rating}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Condition ────────────────────── */}
            <div>
              <label className="text-xs font-semibold text-brand-gray500 uppercase tracking-wide mb-2 block">
                <Sparkles className="w-3 h-3 inline mr-1" />
                {t('filter.condition')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map(cond => (
                  <button
                    key={cond.value}
                    onClick={() => onFilterChange({
                      condition: filters.condition === cond.value ? undefined : cond.value
                    })}
                    className={`px-3 py-1.5 text-xs rounded-pill border transition-all ${
                      filters.condition === cond.value
                        ? 'bg-brand-black text-white border-brand-black'
                        : 'border-brand-gray200 text-brand-gray500 hover:border-brand-gray400'
                    }`}
                  >
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
