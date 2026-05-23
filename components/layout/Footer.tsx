import Link from 'next/link'
import { Github, Twitter } from 'lucide-react'

export default function Footer() {
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
              Ethiopia&apos;s trusted peer-to-peer rental marketplace. 
              Rent anything, from anyone — with escrow protection.
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Marketplace</h4>
            <ul className="space-y-2.5">
              <li><Link href="/explore" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Browse Items</Link></li>
              <li><Link href="/list" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">List an Item</Link></li>
              <li><Link href="/categories" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Categories</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">About</Link></li>
              <li><Link href="/safety" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Trust & Safety</Link></li>
              <li><Link href="/help" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Help Center</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><Link href="/terms" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Privacy Policy</Link></li>
              <li><Link href="/escrow-policy" className="text-sm text-brand-gray500 hover:text-brand-black transition-colors">Escrow Policy</Link></li>
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
