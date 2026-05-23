'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ChatRoom from '@/components/chat/ChatRoom'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function ChatPage({ params }: { params: { rental_id: string } }) {
  const { language } = useLanguage()
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [otherUser, setOtherUser] = React.useState<{ full_name: string; avatar_url?: string | null } | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadParties() {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      setCurrentUserId(user.id)

      // Fetch rental to find the other party
      const { data: rental } = await supabase
        .from('rentals')
        .select('provider_id, consumer_id, provider:provider_id(full_name, avatar_url), consumer:consumer_id(full_name, avatar_url)')
        .eq('id', params.rental_id)
        .single()

      if (rental) {
        const isProvider = rental.provider_id === user.id
        const other = isProvider ? rental.consumer : rental.provider
        const otherSingle = Array.isArray(other) ? other[0] : other
        setOtherUser(otherSingle as any)
      }

      setIsLoading(false)
    }
    loadParties()
  }, [params.rental_id])

  if (isLoading) {
    return (
      <div className="page-container py-20 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!currentUserId || !otherUser) return null

  return (
    <div className="page-container py-6">
      <Link href={`/rentals/${params.rental_id}`}
        className="inline-flex items-center gap-1 text-sm text-brand-gray500 hover:text-brand-black mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {language === 'am' ? 'ወደ ኪራይ ይመለሱ' : language === 'om' ? 'Gara kiraayitti deebi\'i' : 'Back to Rental'}
      </Link>

      <ChatRoom
        rentalId={params.rental_id}
        currentUserId={currentUserId}
        otherUser={otherUser}
      />
    </div>
  )
}
