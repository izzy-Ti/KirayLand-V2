'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Search, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useLanguage } from '@/lib/context/LanguageContext'
import type { RentalStatus } from '@/types/database'

interface Conversation {
  id: string
  status: RentalStatus
  created_at: string
  item: { id: string; title: string; cover_image_url: string | null } | null
  provider: { id: string; full_name: string; avatar_url: string | null } | null
  consumer: { id: string; full_name: string; avatar_url: string | null } | null
  lastMessage: {
    content: string
    created_at: string
    sender_id: string
    is_read: boolean
  } | null
}

export default function MessagesIndexPage() {
  const { t } = useLanguage()
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    async function loadConversations() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?redirectTo=/messages'
        return
      }
      setCurrentUserId(user.id)

      // Fetch rentals (which serve as conversation rooms)
      const { data: rentals } = await supabase
        .from('rentals')
        .select(`
          id,
          status,
          created_at,
          item:item_id (id, title, cover_image_url),
          provider:provider_id (id, full_name, avatar_url),
          consumer:consumer_id (id, full_name, avatar_url)
        `)
        .or(`consumer_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (rentals) {
        // Fetch last message for each conversation
        const fullConversations = await Promise.all(
          (rentals as any[]).map(async (rental) => {
            const { data: msgs } = await supabase
              .from('messages')
              .select('content, created_at, sender_id, is_read')
              .eq('rental_id', rental.id)
              .order('created_at', { ascending: false })
              .limit(1)

            const formattedRental: Conversation = {
              id: rental.id,
              status: rental.status,
              created_at: rental.created_at,
              item: Array.isArray(rental.item) ? rental.item[0] ?? null : rental.item,
              provider: Array.isArray(rental.provider) ? rental.provider[0] ?? null : rental.provider,
              consumer: Array.isArray(rental.consumer) ? rental.consumer[0] ?? null : rental.consumer,
              lastMessage: msgs?.[0] || null,
            }
            return formattedRental
          })
        )

        // Sort by last message date, or rental creation date if no messages
        const sorted = fullConversations.sort((a, b) => {
          const timeA = new Date(a.lastMessage?.created_at || a.created_at).getTime()
          const timeB = new Date(b.lastMessage?.created_at || b.created_at).getTime()
          return timeB - timeA
        })

        setConversations(sorted)
      }
      setIsLoading(false)
    }

    loadConversations()

    // WebSocket Real-time message subscription
    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === newMsg.rental_id)
            if (idx === -1) return prev // Not in currently loaded list

            const updated = [...prev]
            updated[idx] = {
              ...updated[idx],
              lastMessage: {
                content: newMsg.content,
                created_at: newMsg.created_at,
                sender_id: newMsg.sender_id,
                is_read: newMsg.is_read,
              },
            }

            // Bubble the updated conversation to the top
            return updated.sort((a, b) => {
              const timeA = new Date(a.lastMessage?.created_at || a.created_at).getTime()
              const timeB = new Date(b.lastMessage?.created_at || b.created_at).getTime()
              return timeB - timeA
            })
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter conversations based on search text (matching item title or other user full name)
  const filteredConversations = React.useMemo(() => {
    return conversations.filter((c) => {
      const isProvider = c.provider?.id === currentUserId
      const otherUser = isProvider ? c.consumer : c.provider
      const otherName = otherUser?.full_name?.toLowerCase() || ''
      const itemTitle = c.item?.title?.toLowerCase() || ''
      const q = searchQuery.toLowerCase()

      return otherName.includes(q) || itemTitle.includes(q)
    })
  }, [conversations, searchQuery, currentUserId])

  if (isLoading) {
    return (
      <div className="page-container py-20 text-center">
        <div className="w-8 h-8 border-4 border-brand-black border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-brand-gray500 mt-4">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="page-container py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-black rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('chat.title')}</h1>
            <p className="text-sm text-brand-gray500">{t('chat.websocketSubtitle')}</p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('chat.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-3 bg-white border border-brand-gray200 rounded-pill
            text-sm placeholder:text-brand-gray400 focus:outline-none focus:border-brand-black
            focus:ring-2 focus:ring-brand-black/10 transition-all duration-200 shadow-sm"
        />
      </div>

      {/* Conversations List */}
      <div className="bg-white border border-brand-gray200 rounded-card overflow-hidden shadow-card">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-brand-gray50 border border-brand-gray200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-5 h-5 text-brand-gray400" />
            </div>
            <h3 className="font-semibold text-brand-black">{t('chat.emptyInbox')}</h3>
            <p className="text-sm text-brand-gray500 mt-1 max-w-sm mx-auto">
              {t('chat.emptyInboxDesc')}
            </p>
            <Link href="/" className="btn-primary inline-flex mt-6 text-sm">
              {t('chat.exploreItems')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-brand-gray100">
            <AnimatePresence initial={false}>
              {filteredConversations.map((convo, i) => {
                const isProvider = convo.provider?.id === currentUserId
                const otherParty = isProvider ? convo.consumer : convo.provider
                const itemCover = convo.item?.cover_image_url
                const lastMsg = convo.lastMessage
                const hasUnread = lastMsg && !lastMsg.is_read && lastMsg.sender_id !== currentUserId

                return (
                  <motion.div
                    key={convo.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="hover:bg-brand-gray50/40 transition-colors"
                  >
                    <Link href={`/messages/${convo.id}`} className="flex items-center gap-4 px-6 py-4.5">
                      {/* Avatar / Photo */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-brand-gray200 rounded-full overflow-hidden flex items-center justify-center border border-brand-gray100 shadow-sm">
                          {otherParty?.avatar_url ? (
                            <img
                              src={otherParty.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-brand-gray500" />
                          )}
                        </div>
                        {itemCover && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md overflow-hidden border border-white bg-white shadow-sm flex items-center justify-center">
                            <img src={itemCover} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-brand-black truncate">
                            {otherParty?.full_name || t('chat.anonymousUser')}
                          </h4>
                          <span className="text-xs text-brand-gray400">
                            {lastMsg?.created_at
                              ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : new Date(convo.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {convo.item && (
                          <p className="text-xs font-semibold text-brand-gray400 truncate mb-1">
                            {convo.item.title}
                          </p>
                        )}

                        <p
                          className={`text-sm truncate ${
                            hasUnread
                              ? 'text-brand-black font-semibold'
                              : 'text-brand-gray500'
                          }`}
                        >
                          {lastMsg ? lastMsg.content : t('chat.noMessages')}
                        </p>
                      </div>

                      {/* Unread dot / arrow */}
                      <div className="flex-shrink-0 flex items-center pl-2">
                        {hasUnread ? (
                          <span className="w-2.5 h-2.5 bg-danger rounded-full" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-brand-gray200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
