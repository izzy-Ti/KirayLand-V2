'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Star, MapPin, Shield, Clock, Eye,
  Heart, Share2, MessageSquare, Calendar, Tag,
  ChevronRight, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import ImageGallery from '@/components/items/ImageGallery'
import AvailabilityCalendar from '@/components/items/AvailabilityCalendar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const { t } = useLanguage()
  const [item, setItem] = React.useState<any>(null)
  const [bookedDates, setBookedDates] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedStart, setSelectedStart] = React.useState<Date | null>(null)
  const [selectedEnd, setSelectedEnd] = React.useState<Date | null>(null)
  const [isLiked, setIsLiked] = React.useState(false)
  const [isBooking, setIsBooking] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from('items').select('*, provider:provider_id(*), category:category_id(name, slug, parent_id)').eq('id', params.id).single()
      if (error || !data) {
        window.location.href = '/not-found'
        return
      }
      // If item has a subcategory, fetch the parent category name
      if (data.category?.parent_id) {
        const { data: parentCat } = await supabase.from('categories').select('name, slug').eq('id', data.category.parent_id).single()
        data._parentCategory = parentCat
      }
      setItem(data)

      const { data: bookings } = await supabase.from('bookings_calendar').select('booked_range').eq('item_id', params.id)
      if (bookings) {
        const parsed = bookings.map(b => {
          const match = b.booked_range.match(/\[([^,]+),([^\]\)]+)/)
          if (match) return { start: match[1].replace(/\"/g, '').trim(), end: match[2].replace(/\"/g, '').trim() }
          return null
        }).filter(Boolean)
        setBookedDates(parsed)
      }
      setIsLoading(false)
    }
    loadData()
  }, [params.id])

  if (isLoading) {
    return <div className="page-container py-20 text-center"><div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto"></div></div>
  }

  if (!item) return null

  const handleDateSelect = (start: Date, end: Date) => {
    setSelectedStart(start)
    setSelectedEnd(end)
  }

  const rentalDays = selectedStart && selectedEnd
    ? Math.ceil((selectedEnd.getTime() - selectedStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const totalPrice = rentalDays * item.price_per_day_etb

  const handleBooking = async () => {
    if (!selectedStart || !selectedEnd) return
    setIsBooking(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = `/login?redirectTo=/items/${item.id}`
        return
      }

      if (user.id === item.provider_id) {
        alert(t('itemDetail.cannotRentOwnItemAlert'))
        setIsBooking(false)
        return
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          startDate: selectedStart.toISOString().split('T')[0],
          endDate: selectedEnd.toISOString().split('T')[0],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate checkout session')
      }

      if (data.session_url) {
        window.location.href = data.session_url
      } else {
        throw new Error('Checkout URL was not returned from server')
      }
    } catch (err: any) {
      console.error(err)
      alert(t('itemDetail.unexpectedCheckoutError') + err.message)
    } finally {
      setIsBooking(false)
    }
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
    <div className="page-container py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-brand-gray500 mb-4">
        <Link href="/" className="hover:text-brand-black transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
        {item._parentCategory && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span>{item._parentCategory.name}</span>
          </>
        )}
        {item.category && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span>{item.category.name}</span>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-brand-black font-medium truncate max-w-[200px]">{item.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Images + Details */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <ImageGallery images={item.image_urls} title={item.title} />
          </motion.div>

          {/* Title & Meta */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {item.attributes?.condition && (
                    <Badge variant="black">
                      {conditionLabel(item.attributes.condition)}
                    </Badge>
                  )}
                  <Badge variant="success" dot>{t('itemDetail.available')}</Badge>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-sm text-brand-gray500">
                    <MapPin className="w-4 h-4" /> {item.city}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-brand-gray500">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {item.rating_avg} ({item.rating_count} {t('itemDetail.reviews')})
                  </span>
                  <span className="flex items-center gap-1 text-sm text-brand-gray500">
                    <Eye className="w-4 h-4" /> {item.view_count} {t('itemDetail.views')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsLiked(!isLiked)}
                  className={`p-2.5 rounded-full border transition-all ${isLiked ? 'bg-red-50 border-red-200 text-danger' : 'border-brand-gray200 text-brand-gray500 hover:border-brand-gray400'
                    }`}>
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <button className="p-2.5 rounded-full border border-brand-gray200 text-brand-gray500 hover:border-brand-gray400 transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="card p-6">
            <h3 className="font-semibold mb-3">{t('list.description')}</h3>
            <div className="text-sm text-brand-gray600 leading-relaxed whitespace-pre-line">
              {item.description}
            </div>
          </motion.div>

          {/* Attributes */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card p-6">
            <h3 className="font-semibold mb-3">{t('itemDetail.specifications')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {item.attributes && Object.entries(item.attributes).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm py-2 border-b border-brand-gray100 last:border-0">
                  <span className="text-brand-gray500 capitalize">{key.replace('_', ' ')}</span>
                  <span className="font-medium capitalize">{String(val).replace('_', ' ')}</span>
                </div>
              ))}
            </div>
            {item.tags?.length > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-brand-gray100">
                <Tag className="w-4 h-4 text-brand-gray400" />
                <div className="flex flex-wrap gap-1.5">
                  {item.tags?.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-brand-gray100 rounded text-xs text-brand-gray600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Provider Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="card p-6">
            <h3 className="font-semibold mb-4">{t('itemDetail.listedBy')}</h3>
            <div className="flex items-center gap-4">
              <Avatar fallback={item.provider.full_name} size="xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{item.provider.full_name}</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <Badge variant="info">{item.provider.trust}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-brand-gray500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {item.provider.rating_avg} ({item.provider.rating_count})
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {item.provider.city}
                  </span>
                </div>
                <p className="text-xs text-brand-gray400 mt-1">
                  {t('profile.memberSince')} {new Date(item.provider.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Button variant="secondary" size="sm">
                <MessageSquare className="w-4 h-4" /> {t('itemDetail.message')}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar: Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="card p-6">
              {/* Price */}
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">ETB {item.price_per_day_etb.toLocaleString()}</span>
                  <span className="text-brand-gray400 text-sm">{t('items.perDay')}</span>
                </div>
                {item.price_per_week_etb && (
                  <p className="text-sm text-brand-gray500 mt-1">
                    ETB {item.price_per_week_etb.toLocaleString()}{t('itemDetail.perWeek')}
                  </p>
                )}
              </div>

              <div className="divider mb-4" />

              {/* Calendar */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-gray500" />
                  {t('itemDetail.selectDates')}
                </h4>
                <AvailabilityCalendar
                  bookedDates={bookedDates}
                  onSelectRange={handleDateSelect}
                  minDays={item.min_rental_days}
                  maxDays={item.max_rental_days || 90}
                />
              </div>

              {/* Pricing summary */}
              {rentalDays > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 mb-4 p-3 bg-brand-gray50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray500">
                      ETB {item.price_per_day_etb.toLocaleString()} × {rentalDays} {rentalDays === 1 ? t('list.dailyRate') : t('itemDetail.views')}
                    </span>
                    <span className="font-medium">ETB {totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-gray500">{t('itemDetail.securityDeposit')}</span>
                    <span className="font-medium">ETB {item.security_deposit_etb.toLocaleString()}</span>
                  </div>
                  <div className="divider" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>{t('itemDetail.total')}</span>
                    <span>ETB {(totalPrice + item.security_deposit_etb).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-brand-gray400">{t('itemDetail.depositRefundedMsg')}</p>
                </motion.div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={rentalDays === 0}
                onClick={handleBooking}
                isLoading={isBooking}
              >
                {rentalDays > 0 ? t('itemDetail.proceedToCheckout') : t('itemDetail.selectDatesToRent')}
              </Button>

              <div className="flex items-center gap-2 justify-center mt-3 text-xs text-brand-gray400">
                <Shield className="w-3.5 h-3.5" />
                {t('itemDetail.protectedByEscrow')}
              </div>
            </motion.div>

            {/* Quick info */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-brand-gray400" />
                <span className="text-brand-gray600">
                  {t('itemDetail.minRentalDays')}: {item.min_rental_days} {item.min_rental_days > 1 ? t('itemDetail.views') : t('list.dailyRate')}
                  {item.max_rental_days && ` • ${t('itemDetail.maxRentalDays')}: ${item.max_rental_days}`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-brand-gray400" />
                <span className="text-brand-gray600">{t('list.securityDeposit')}: ETB {item.security_deposit_etb.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-brand-gray400" />
                <span className="text-brand-gray600">{item.rental_count} {t('itemDetail.successfulRentals')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
