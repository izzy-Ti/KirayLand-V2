'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Language } from '../i18n/translations'

interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (keyPath: string) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Read from localStorage on mount
    const savedLang = localStorage.getItem('kirayland_lang') as Language
    if (savedLang && (savedLang === 'en' || savedLang === 'am' || savedLang === 'om')) {
      setLanguageState(savedLang)
    }
    setIsMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('kirayland_lang', lang)
  }

  // Translation helper resolving dot notation e.g., 'auth.signInTitle'
  const t = (keyPath: string): string => {
    const keys = keyPath.split('.')
    let currentTranslation: any = translations[language] || translations['en']
    let englishFallback: any = translations['en']

    for (const key of keys) {
      if (currentTranslation && currentTranslation[key] !== undefined) {
        currentTranslation = currentTranslation[key]
      } else {
        currentTranslation = null
      }

      if (englishFallback && englishFallback[key] !== undefined) {
        englishFallback = englishFallback[key]
      } else {
        englishFallback = null
      }
    }

    return typeof currentTranslation === 'string'
      ? currentTranslation
      : typeof englishFallback === 'string'
      ? englishFallback
      : keyPath
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* Prevent hydration mismatches by rendering a fallback or transparent body prior to mount */}
      <div style={{ opacity: isMounted ? 1 : 0.99 }}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
