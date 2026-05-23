'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import SearchBar from '@/components/discovery/SearchBar'
import FilterPanel from '@/components/discovery/FilterPanel'
import ItemGrid from '@/components/discovery/ItemGrid'
import type { Item, ItemFilters, Category } from '@/types/database'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function DiscoveryPage() {
  const { t } = useLanguage()

  const FEATURES = [
    {
      icon: Shield,
      title: t('hero.featureEscrow'),
      description: t('hero.featureEscrowDesc'),
    },
    {
      icon: Zap,
      title: t('hero.featureInstant'),
      description: t('hero.featureInstantDesc'),
    },
    {
      icon: Sparkles,
      title: t('hero.featureVerified'),
      description: t('hero.featureVerifiedDesc'),
    },
  ]

  const [searchQuery, setSearchQuery] = React.useState('')
  const [filters, setFilters] = React.useState<ItemFilters>({})
  const [isFilterOpen, setIsFilterOpen] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(true)
  const [items, setItems] = React.useState<Item[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const supabase = getSupabaseBrowserClient()
        
        const [catsResponse, itemsResponse] = await Promise.all([
          supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
          supabase.from('items').select('*, provider:provider_id (*), category:category_id (*)').eq('is_published', true).eq('is_flagged', false).order('created_at', { ascending: false })
        ])

        if (catsResponse.data) setCategories(catsResponse.data as Category[])
        if (itemsResponse.data) setItems(itemsResponse.data as Item[])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleFilterChange = (update: Partial<ItemFilters>) => {
    setFilters(prev => ({ ...prev, ...update }))
  }

  const handleResetFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  // Filter items based on current filters (client-side demo)
  const filteredItems = React.useMemo(() => {
    let result = [...items]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.includes(q))
      )
    }

    if (filters.min_price) {
      result = result.filter(i => i.price_per_day_etb >= filters.min_price!)
    }
    if (filters.max_price) {
      result = result.filter(i => i.price_per_day_etb <= filters.max_price!)
    }
    if (filters.city) {
      result = result.filter(i => i.city === filters.city)
    }
    if (filters.min_rating) {
      result = result.filter(i => i.rating_avg >= filters.min_rating!)
    }
    if (filters.condition) {
      result = result.filter(i => i.attributes?.condition === filters.condition)
    }

    // Sort
    switch (filters.sort_by) {
      case 'price_asc':
        result.sort((a, b) => a.price_per_day_etb - b.price_per_day_etb)
        break
      case 'price_desc':
        result.sort((a, b) => b.price_per_day_etb - a.price_per_day_etb)
        break
      case 'rating':
        result.sort((a, b) => b.rating_avg - a.rating_avg)
        break
      case 'popular':
        result.sort((a, b) => b.rental_count - a.rental_count)
        break
      default:
        // newest — already in order
        break
    }

    return result
  }, [items, searchQuery, filters])

  return (
    <div>
      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white border-b border-brand-gray200">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="page-container relative">
          <div className="py-16 md:py-24 max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h1 className="text-display-lg md:text-display-xl font-bold text-brand-black tracking-tight text-balance">
                {t('hero.title')}{' '}
                <span className="text-brand-gray400">{t('hero.titleSpan')}</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 text-lg text-brand-gray500 max-w-xl mx-auto text-pretty"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 max-w-lg mx-auto"
            >
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('hero.searchPlaceholder')}
              />
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-8"
            >
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-gray50 border border-brand-gray200
                    rounded-pill text-xs text-brand-gray600"
                >
                  <feature.icon className="w-3.5 h-3.5 text-brand-black" />
                  <span className="font-medium">{feature.title}</span>
                  <span className="hidden sm:inline text-brand-gray400">— {feature.description}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Discovery Matrix ─────────────────────────────── */}
      <section className="page-container py-8">
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterPanel
            categories={categories}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            isOpen={isFilterOpen}
            onToggle={() => setIsFilterOpen(!isFilterOpen)}
          />

          {/* Items Grid */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {filters.category_slug
                    ? categories.find(c => c.slug === filters.category_slug)?.name || t('discovery.results')
                    : t('discovery.allItems')
                  }
                </h2>
                <p className="text-sm text-brand-gray500 mt-0.5">
                  {filteredItems.length} {filteredItems.length === 1 ? t('discovery.itemAvailable') : t('discovery.itemsAvailable')}
                </p>
              </div>

              <Link
                href="/"
                className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-gray500
                  hover:text-brand-black transition-colors group"
              >
                {t('footer.browseItems')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <ItemGrid items={filteredItems} isLoading={isLoading} />
          </div>
        </div>
      </section>
    </div>
  )
}
