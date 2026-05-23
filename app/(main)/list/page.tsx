'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, X, Plus, ArrowRight, ArrowLeft, Check,
  Package, DollarSign, MapPin, Image as ImageIcon, Tag
} from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function ListItemPage() {
  const { t } = useLanguage()

  const STEPS = [
    { id: 'basics',   label: t('list.stepBasics'),   icon: Package },
    { id: 'pricing',  label: t('list.stepPricing'),  icon: DollarSign },
    { id: 'images',   label: t('list.stepImages'),   icon: ImageIcon },
    { id: 'location', label: t('list.stepLocation'), icon: MapPin },
  ]

  const [categories, setCategories] = React.useState<any[]>([])
  const [step, setStep] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [previewImages, setPreviewImages] = React.useState<string[]>([])

  const [form, setForm] = React.useState({
    title: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    brand: '',
    model: '',
    condition: 'good',
    pricePerDay: '',
    pricePerWeek: '',
    securityDeposit: '',
    minDays: '1',
    maxDays: '30',
    city: 'Addis Ababa',
    address: '',
    tags: [] as string[],
  })

  const [tagInput, setTagInput] = React.useState('')

  React.useEffect(() => {
    async function loadCategories() {
      const { data } = await getSupabaseBrowserClient()
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (data) {
        const root = data.filter(c => c.parent_id === null).map(c => ({
          ...c,
          children: data.filter(sub => sub.parent_id === c.id)
        }))
        setCategories(root)
      }
    }
    loadCategories()
  }, [])

  const updateForm = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) =>
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => setPreviewImages(prev => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) =>
    setPreviewImages(prev => prev.filter((_, i) => i !== index))

  const selectedCategory = categories.find(c => c.id === form.categoryId)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const uploadedUrls: string[] = []
      for (let i = 0; i < previewImages.length; i++) {
        const dataUrl = previewImages[i]
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const ext = blob.type.split('/')[1] || 'jpg'
        const path = `${user.id}/${Date.now()}_${i}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(path, blob, { contentType: blob.type, upsert: false })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
          uploadedUrls.push(urlData.publicUrl)
        }
      }

      const resolvedCategoryId = form.subcategoryId || form.categoryId
      if (!resolvedCategoryId) {
        alert(t('list.selectCategoryAlert'))
        setIsSubmitting(false)
        return
      }

      const { data: newItem, error } = await supabase.from('items').insert({
        provider_id: user.id,
        title: form.title,
        description: form.description,
        category_id: resolvedCategoryId,
        attributes: {
          condition: form.condition,
          ...(form.brand ? { brand: form.brand } : {}),
          ...(form.model ? { model: form.model } : {}),
        },
        price_per_day_etb: Number(form.pricePerDay),
        price_per_week_etb: form.pricePerWeek ? Number(form.pricePerWeek) : null,
        security_deposit_etb: Number(form.securityDeposit),
        min_rental_days: Number(form.minDays),
        max_rental_days: Number(form.maxDays),
        city: form.city,
        address_text: form.address || null,
        tags: form.tags,
        image_urls: uploadedUrls,
        cover_image_url: uploadedUrls[0] || null,
        is_published: true,
        is_available: true,
      }).select().single()

      if (error) {
        console.error('Failed to list item:', error)
        alert(t('list.failedPublish'))
        return
      }

      window.location.href = `/items/${newItem.id}`
    } catch (err) {
      console.error(err)
      alert(t('list.unexpectedError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-container py-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">{t('list.title')}</h1>
        <p className="text-sm text-brand-gray500 mt-1">{t('list.subtitle')}</p>
      </motion.div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mt-8 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                i === step
                  ? 'bg-brand-black text-white'
                  : i < step
                    ? 'bg-brand-gray100 text-brand-black'
                    : 'bg-brand-gray50 text-brand-gray400'
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? 'bg-brand-black' : 'bg-brand-gray200'} transition-colors`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="card p-6 space-y-5"
        >
          {/* ── STEP 0: Basics ─────────────────── */}
          {step === 0 && (
            <>
              <h3 className="font-semibold">{t('list.basicInfo')}</h3>
              <Input label={t('list.itemTitle')} placeholder="e.g. iPhone 15 Pro Max — 256GB"
                value={form.title} onChange={e => updateForm('title', e.target.value)} required />

              <div>
                <label className="block text-sm font-medium text-brand-gray700 mb-1.5">{t('list.description')}</label>
                <textarea
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  rows={4}
                  placeholder={t('list.descriptionPlaceholder')}
                  className="input-base resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-gray700 mb-1.5">{t('list.category')}</label>
                  <select value={form.categoryId} onChange={e => updateForm('categoryId', e.target.value)}
                    className="input-base">
                    <option value="">{t('list.selectCategory')}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {selectedCategory && selectedCategory.children.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-brand-gray700 mb-1.5">{t('list.subcategory')}</label>
                    <select value={form.subcategoryId} onChange={e => updateForm('subcategoryId', e.target.value)}
                      className="input-base">
                      <option value="">{t('list.selectSubcategory')}</option>
                      {selectedCategory.children.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input label={t('list.brand')} placeholder="Apple" value={form.brand}
                  onChange={e => updateForm('brand', e.target.value)} />
                <Input label={t('list.model')} placeholder="iPhone 15" value={form.model}
                  onChange={e => updateForm('model', e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-brand-gray700 mb-1.5">{t('list.condition')}</label>
                  <select value={form.condition} onChange={e => updateForm('condition', e.target.value)}
                    className="input-base">
                    <option value="new">{t('list.conditionNew')}</option>
                    <option value="like_new">{t('list.conditionLikeNew')}</option>
                    <option value="good">{t('list.conditionGood')}</option>
                    <option value="fair">{t('list.conditionFair')}</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-brand-gray700 mb-1.5">
                  <Tag className="w-3.5 h-3.5 inline mr-1" /> {t('list.tags')}
                </label>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder={t('list.addTag')} className="input-base flex-1" />
                  <Button variant="secondary" onClick={addTag} type="button">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-gray100 rounded-pill text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-brand-gray400 hover:text-danger">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 1: Pricing ────────────────── */}
          {step === 1 && (
            <>
              <h3 className="font-semibold">{t('list.pricingTitle')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('list.pricePerDay')} type="number" placeholder="850"
                  value={form.pricePerDay} onChange={e => updateForm('pricePerDay', e.target.value)} required />
                <Input label={t('list.pricePerWeek')} type="number" placeholder="5000"
                  value={form.pricePerWeek} onChange={e => updateForm('pricePerWeek', e.target.value)} />
              </div>
              <Input label={t('list.securityDeposit')} type="number" placeholder="15000"
                value={form.securityDeposit} onChange={e => updateForm('securityDeposit', e.target.value)}
                helperText={t('list.securityDepositHelper')} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('list.minDays')} type="number" value={form.minDays}
                  onChange={e => updateForm('minDays', e.target.value)} />
                <Input label={t('list.maxDays')} type="number" value={form.maxDays}
                  onChange={e => updateForm('maxDays', e.target.value)} />
              </div>

              {/* Earnings preview */}
              {form.pricePerDay && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 bg-green-50 border border-green-200 rounded-card">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">{t('list.earningsPreview')}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">{t('list.dailyRate')}</span>
                      <span className="font-medium">ETB {Number(form.pricePerDay).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">{t('list.platformFee')}</span>
                      <span>-ETB {(Number(form.pricePerDay) * 0.05).toFixed(0)}</span>
                    </div>
                    <div className="divider my-1" />
                    <div className="flex justify-between font-bold">
                      <span className="text-green-800">{t('list.youEarn')}</span>
                      <span className="text-green-800">ETB {(Number(form.pricePerDay) * 0.95).toFixed(0)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* ── STEP 2: Images ─────────────────── */}
          {step === 2 && (
            <>
              <h3 className="font-semibold">{t('list.photosTitle')}</h3>
              <p className="text-sm text-brand-gray500">{t('list.photosSubtitle')}</p>

              <div className="grid grid-cols-3 gap-3">
                {previewImages.map((img, i) => (
                  <div key={i} className="relative aspect-square bg-brand-gray100 rounded-card overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-brand-black text-white text-xs rounded">
                        {t('list.cover')}
                      </span>
                    )}
                  </div>
                ))}

                <label className="aspect-square border-2 border-dashed border-brand-gray300 rounded-card
                  flex flex-col items-center justify-center cursor-pointer
                  hover:border-brand-black hover:bg-brand-gray50 transition-all">
                  <Upload className="w-6 h-6 text-brand-gray400 mb-1" />
                  <span className="text-xs text-brand-gray500">{t('list.upload')}</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </>
          )}

          {/* ── STEP 3: Location ───────────────── */}
          {step === 3 && (
            <>
              <h3 className="font-semibold">{t('list.locationTitle')}</h3>
              <div>
                <label className="block text-sm font-medium text-brand-gray700 mb-1.5">{t('list.cityLabel')}</label>
                <select value={form.city} onChange={e => updateForm('city', e.target.value)} className="input-base">
                  {['Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Jimma', 'Adama', 'Gondar'].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <Input label={t('list.addressArea')} placeholder="Bole, near Edna Mall"
                value={form.address} onChange={e => updateForm('address', e.target.value)}
                icon={<MapPin className="w-4 h-4" />} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4" /> {t('list.back')}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            {t('list.next')} <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {t('list.publishListing')} <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
