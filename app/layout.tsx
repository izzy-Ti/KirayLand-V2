import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/lib/context/LanguageContext'

export const metadata: Metadata = {
  title: 'ኪራይLand — Rent Anything, From Anyone',
  description:
    'Ethiopia\'s premier peer-to-peer rental marketplace. Rent electronics, vehicles, tools, and more from verified providers with smart escrow protection.',
  keywords: ['rental', 'P2P', 'Ethiopia', 'marketplace', 'ኪራይ', 'rent'],
  openGraph: {
    title: 'ኪራይLand — Rent Anything, From Anyone',
    description: 'Ethiopia\'s premier P2P rental marketplace with escrow protection.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className="min-h-screen bg-brand-white text-brand-black antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
