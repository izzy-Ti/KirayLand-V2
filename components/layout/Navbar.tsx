'use client'

import React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Menu, X, User, MessageSquare, Package,
  PlusCircle, LogOut, ChevronDown, Globe, Wallet
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

interface NavbarProps {
  user?: { full_name: string; avatar_url?: string; email: string } | null
}

export default function Navbar({ user: initialUser }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [isLangOpen, setIsLangOpen] = React.useState(false)
  const [user, setUser] = React.useState(initialUser || null)
  
  const { language, setLanguage, t } = useLanguage()

  const languages = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'am', label: 'አማርኛ', short: 'አማ' },
    { code: 'om', label: 'Oromoo', short: 'ORM' },
  ]

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    async function fetchProfile(authUser: any) {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url, email').eq('id', authUser.id).single()
      if (data) {
        setUser(data as any)
      } else {
        setUser({ full_name: authUser.email?.split('@')[0], email: authUser.email } as any)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await getSupabaseBrowserClient().auth.signOut()
    setUser(null)
    setIsProfileOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-brand-gray200">
      <nav className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            className="w-8 h-8 bg-brand-black rounded-lg flex items-center justify-center"
            whileHover={{ rotate: 6, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <span className="text-white font-bold text-sm">ኪ</span>
          </motion.div>
          <span className="font-bold text-xl tracking-tight text-brand-black">
            ኪራይ<span className="text-brand-gray500">Land</span>
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray400" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-gray50 border border-brand-gray200 rounded-pill
                text-sm placeholder:text-brand-gray400 focus:outline-none focus:border-brand-black
                focus:ring-2 focus:ring-brand-black/10 transition-all duration-200"
            />
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-brand-gray600 hover:text-brand-black
              hover:bg-brand-gray50 rounded-button transition-all duration-200"
          >
            {t('nav.explore')}
          </Link>

          {/* Desktop Language Selector */}
          <div className="relative mr-1">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-gray600 hover:text-brand-black hover:bg-brand-gray50 rounded-button transition-all duration-200"
            >
              <Globe className="w-4 h-4 text-brand-gray400" />
              <span>{languages.find(l => l.code === language)?.short}</span>
              <ChevronDown className={`w-3 h-3 text-brand-gray400 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 w-32 bg-brand-white border border-brand-gray200
                    rounded-card shadow-card-xl py-1 overflow-hidden z-50"
                >
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any)
                        setIsLangOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === lang.code
                          ? 'bg-brand-gray100 text-brand-black font-semibold'
                          : 'text-brand-gray600 hover:bg-brand-gray50 hover:text-brand-black'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {user ? (
            <>
              <Link
                href="/list"
                className="px-4 py-2 text-sm font-medium text-brand-gray600 hover:text-brand-black
                  hover:bg-brand-gray50 rounded-button transition-all duration-200 flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                {t('nav.listItem')}
              </Link>

              <Link href="/messages" className="relative p-2 text-brand-gray500 hover:text-brand-black transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
              </Link>

              {/* Profile Dropdown */}
              <div className="relative ml-2">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-pill hover:bg-brand-gray50 transition-all"
                >
                  <div className="w-8 h-8 bg-brand-gray200 rounded-full flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-brand-gray500" />
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-brand-gray400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 bg-brand-white border border-brand-gray200
                        rounded-card shadow-card-xl py-1 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-brand-gray100">
                        <p className="text-sm font-semibold truncate">{user.full_name}</p>
                        <p className="text-xs text-brand-gray500 truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-gray600 hover:bg-brand-gray50 hover:text-brand-black transition-colors">
                        <User className="w-4 h-4" /> {t('nav.profile')}
                      </Link>
                      <Link href="/profile/wallet" className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-gray600 hover:bg-brand-gray50 hover:text-brand-black transition-colors">
                        <Wallet className="w-4 h-4" /> {t('nav.wallet')}
                      </Link>
                      <Link href="/rentals" className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-gray600 hover:bg-brand-gray50 hover:text-brand-black transition-colors">
                        <Package className="w-4 h-4" /> {t('nav.myRentals')}
                      </Link>
                      <div className="border-t border-brand-gray100 mt-1">
                        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-red-50 w-full transition-colors">
                          <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link href="/login" className="btn-ghost text-sm py-2 px-4">
                {t('nav.logIn')}
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-5">
                {t('nav.signUp')}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-brand-gray600 hover:text-brand-black transition-colors"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-brand-gray200"
          >
            <div className="page-container py-4 space-y-2">
              {/* Mobile Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray400" />
                <input
                  type="text"
                  placeholder={t('nav.searchPlaceholder')}
                  className="input-base pl-10 rounded-pill"
                />
              </div>

              {/* Mobile Language Switches */}
              <div className="flex items-center gap-2 px-4 py-2 border border-brand-gray200 rounded-input bg-brand-gray50">
                <Globe className="w-4 h-4 text-brand-gray400" />
                <span className="text-xs font-semibold text-brand-gray500 mr-2">Language:</span>
                <div className="flex gap-1.5 flex-1">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      className={`flex-1 text-center py-1 text-xs font-bold rounded-pill border transition-all ${
                        language === lang.code
                          ? 'bg-brand-black border-brand-black text-white'
                          : 'bg-white border-brand-gray200 text-brand-gray600'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <Link href="/" className="block px-4 py-3 text-sm font-medium rounded-input hover:bg-brand-gray50 transition-colors">
                {t('nav.explore')}
              </Link>
              {user ? (
                <>
                  <Link href="/list" className="block px-4 py-3 text-sm font-medium rounded-input hover:bg-brand-gray50 transition-colors">
                    {t('nav.listItem')}
                  </Link>
                  <Link href="/messages" className="block px-4 py-3 text-sm font-medium rounded-input hover:bg-brand-gray50 transition-colors">
                    {t('chat.title')}
                  </Link>
                  <Link href="/rentals" className="block px-4 py-3 text-sm font-medium rounded-input hover:bg-brand-gray50 transition-colors">
                    {t('nav.myRentals')}
                  </Link>
                  <Link href="/profile/wallet" className="block px-4 py-3 text-sm font-medium rounded-input hover:bg-brand-gray50 transition-colors">
                    {t('nav.wallet')}
                  </Link>
                  <Link href="/profile" className="block px-4 py-3 text-sm font-medium rounded-input hover:bg-brand-gray50 transition-colors">
                    {t('nav.profile')}
                  </Link>
                </>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Link href="/login" className="btn-secondary flex-1 text-sm justify-center">{t('nav.logIn')}</Link>
                  <Link href="/register" className="btn-primary flex-1 text-sm justify-center">{t('nav.signUp')}</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
