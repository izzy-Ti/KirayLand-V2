'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, MapPin, Camera, Shield,
  Star, Package, Edit3, CheckCircle2, LogOut
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function ProfilePage() {
  const { t } = useLanguage()
  const [isEditing, setIsEditing] = React.useState(false)
  const [profile, setProfile] = React.useState<any>(null)
  const [rentals, setRentals] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [formData, setFormData] = React.useState({ full_name: '', phone: '', city: '', bio: '' })

  React.useEffect(() => {
    async function loadProfile() {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profileData) {
        setProfile({ ...profileData, email: user.email })
        setFormData({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          bio: profileData.bio || ''
        })
      }

      const { data: rentalsData } = await supabase
        .from('rentals')
        .select('id, status, start_date, item:item_id(title)')
        .or(`provider_id.eq.${user.id},consumer_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      
      if (rentalsData) setRentals(rentalsData)
      setIsLoading(false)
    }
    loadProfile()
  }, [])

  const handleSave = async () => {
    const supabase = getSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update(formData).eq('id', user.id)
    setProfile((prev: any) => ({ ...prev, ...formData }))
    setIsEditing(false)
  }

  const handleSignOut = async () => {
    await getSupabaseBrowserClient().auth.signOut()
    window.location.href = '/'
  }

  const trustColors: Record<string, 'neutral'|'info'|'success'|'black'> = {
    new: 'neutral', verified: 'info', trusted: 'success', premium: 'black',
  }

  if (isLoading) return (
    <div className="page-container py-20 text-center">
      <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )
  if (!profile) return null

  return (
    <div className="page-container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Profile Card */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="card p-6 text-center sticky top-20">
            <div className="relative inline-block">
              <Avatar fallback={profile.full_name} size="xl" className="w-24 h-24 text-2xl mx-auto" />
              <button className="absolute bottom-0 right-0 p-1.5 bg-brand-black text-white rounded-full shadow-card">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <h2 className="text-xl font-bold mt-4">{profile.full_name}</h2>
            <p className="text-sm text-brand-gray500 mt-0.5">{profile.email}</p>

            <div className="flex items-center justify-center gap-2 mt-3">
              <Badge variant={trustColors[profile.trust || 'new']} dot>
                {profile.trust ? profile.trust.charAt(0).toUpperCase() + profile.trust.slice(1) : 'New'}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-brand-gray500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {profile.rating_avg} ({profile.rating_count})
              </span>
            </div>

            <div className="divider my-4" />

            {/* Verification status */}
            <div className="space-y-2.5 text-left">
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-4 h-4 ${profile.is_email_verified ? 'text-green-500' : 'text-brand-gray300'}`} />
                <span className="text-sm text-brand-gray600">{t('profile.emailVerified')}</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-4 h-4 ${profile.is_phone_verified ? 'text-green-500' : 'text-brand-gray300'}`} />
                <span className="text-sm text-brand-gray600">{t('profile.phoneVerified')}</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-4 h-4 ${profile.is_id_verified ? 'text-green-500' : 'text-brand-gray300'}`} />
                <span className="text-sm text-brand-gray600">
                  {t('profile.idVerified')}
                  {!profile.is_id_verified && (
                    <button className="ml-2 text-xs text-blue-600 hover:underline">{t('profile.verifyNow')}</button>
                  )}
                </span>
              </div>
            </div>

            <div className="divider my-4" />

            {/* Wallet */}
            <div className="p-4 bg-brand-gray50 rounded-card">
              <p className="text-xs text-brand-gray500">{t('profile.walletBalance')}</p>
              <p className="text-2xl font-bold mt-1">
                ETB {profile.wallet_balance_etb
                  ? profile.wallet_balance_etb.toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '0.00'}
              </p>
            </div>

            <p className="text-xs text-brand-gray400 mt-4">
              {t('profile.memberSince')} {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>

            <button onClick={handleSignOut} className="flex items-center gap-2 mx-auto mt-4 text-sm text-danger hover:underline">
              <LogOut className="w-4 h-4" /> {t('profile.signOut')}
            </button>
          </motion.div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t('profile.personalInfo')}</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="w-4 h-4" /> {isEditing ? t('profile.cancel') : t('profile.edit')}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('profile.fullName')} value={isEditing ? formData.full_name : profile.full_name}
                disabled={!isEditing} icon={<User className="w-4 h-4" />}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
              <Input label={t('profile.email')} value={profile.email || ''} disabled
                icon={<Mail className="w-4 h-4" />} onChange={() => {}} />
              <Input label={t('profile.phone')} value={isEditing ? formData.phone : (profile.phone || '')}
                disabled={!isEditing} icon={<Phone className="w-4 h-4" />}
                onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              <Input label={t('profile.city')} value={isEditing ? formData.city : (profile.city || '')}
                disabled={!isEditing} icon={<MapPin className="w-4 h-4" />}
                onChange={e => setFormData({ ...formData, city: e.target.value })} />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-brand-gray700 mb-1.5">{t('profile.bio')}</label>
              <textarea
                value={isEditing ? formData.bio : (profile.bio || '')}
                disabled={!isEditing}
                rows={3}
                className="input-base resize-none disabled:opacity-60"
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            {isEditing && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave}>{t('profile.saveChanges')}</Button>
              </div>
            )}
          </motion.div>

          {/* Recent Rentals */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-gray500" /> {t('profile.recentRentals')}
            </h3>
            <div className="space-y-3">
              {rentals.length === 0 && <p className="text-sm text-brand-gray500">{t('profile.noRentals')}</p>}
              {rentals.map(r => (
                <a key={r.id} href={`/rentals/${r.id}`}
                  className="flex items-center justify-between p-3 bg-brand-gray50 rounded-lg hover:bg-brand-gray100 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{r.item?.title}</p>
                    <p className="text-xs text-brand-gray500">{r.start_date}</p>
                  </div>
                  <Badge variant={
                    r.status === 'completed' ? 'success' :
                    r.status === 'active_escrow' ? 'info' : 'neutral'
                  } dot>
                    {r.status.replace(/_/g, ' ')}
                  </Badge>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Security */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-gray500" /> {t('profile.security')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('profile.password')}</p>
                  <p className="text-xs text-brand-gray500">{t('profile.passwordDesc')}</p>
                </div>
                <Button variant="secondary" size="sm">{t('profile.change')}</Button>
              </div>
              <div className="divider" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('profile.twoFactor')}</p>
                  <p className="text-xs text-brand-gray500">{t('profile.twoFactorDesc')}</p>
                </div>
                <Button variant="secondary" size="sm">{t('profile.enable')}</Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
