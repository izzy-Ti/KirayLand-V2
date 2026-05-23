'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { MapPin, Phone, User, FileText } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function OnboardingPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const router = useRouter()

  const [formData, setFormData] = React.useState({
    full_name: '',
    phone: '',
    city: '',
    bio: ''
  })

  React.useEffect(() => {
    getSupabaseBrowserClient().auth.getUser().then(({ data: { user } }) => {
      if (user) {
        getSupabaseBrowserClient()
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) {
              setFormData(prev => ({ ...prev, full_name: data.full_name }))
            }
          })
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name || !formData.phone || !formData.city) {
      setError(t('onboarding.fillAllFields'))
      return
    }
    setIsLoading(true)
    setError('')
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: formData.full_name,
          phone: formData.phone,
          city: formData.city,
          bio: formData.bio || '',
          updated_at: new Date().toISOString()
        })
      if (updateError) throw updateError
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-brand-gray200 rounded-2xl p-8 shadow-card-xl"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-black text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            ኪ
          </div>
          <h1 className="text-2xl font-bold text-brand-black tracking-tight">{t('onboarding.title')}</h1>
          <p className="text-brand-gray500 text-sm mt-2">{t('onboarding.subtitle')}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-danger text-sm p-3 rounded-lg mb-6 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-gray600 mb-1">
              {t('onboarding.fullNameRequired')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray400" />
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                className="input-base pl-10"
                placeholder="Abebe Kebede"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-gray600 mb-1">
              {t('onboarding.phoneRequired')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray400" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="input-base pl-10"
                placeholder="+251 911 234 567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-gray600 mb-1">
              {t('onboarding.cityRequired')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray400" />
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                className="input-base pl-10"
                placeholder="Addis Ababa"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-gray600 mb-1">
              {t('onboarding.bio')}
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-brand-gray400" />
              <textarea
                value={formData.bio}
                onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                className="input-base pl-10 h-24 resize-none py-2.5"
                placeholder={t('onboarding.bioPlaceholder')}
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
            {t('onboarding.btn')}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
