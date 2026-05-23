'use client'

import Link from 'next/link'
import { Github, Twitter } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-brand-gray200 bg-brand-gray50">
      <div className="page-container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-brand-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">ኪ</span>
              </div>
              <span className="font-bold text-lg tracking-tight">ኪራይLand</span>
            </div>
            <p className="text-sm text-brand-gray500 leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.marketplace')}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.browseItems')}
                </Link>
              </li>
              <li>
                <Link href="/list" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.listItem')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.safety')}
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.help')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">
                  {t('footer.escrowPolicy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="divider my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-gray400">
            © {new Date().getFullYear()} ኪራይLand. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-brand-gray400 hover:text-brand-black transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="text-brand-gray400 hover:text-brand-black transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
