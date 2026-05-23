'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Send, Image, Paperclip } from 'lucide-react'
import MessageBubble from './MessageBubble'
import type { Message } from '@/types/database'
import { getSupabaseBrowserClient } from '@/lib/supabase'

interface ChatRoomProps {
  rentalId: string
  currentUserId: string
  otherUser: { full_name: string; avatar_url?: string | null }
}

export default function ChatRoom({ rentalId, currentUserId, otherUser }: ChatRoomProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [newMessage, setNewMessage] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load existing messages and subscribe to new ones
  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // Initial load
    supabase
      .from('messages')
      .select('*, sender:sender_id(id, full_name, avatar_url)')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[])
        setTimeout(scrollToBottom, 100)
      })

    // Real-time subscription
    const channel = supabase
      .channel(`chat:${rentalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `rental_id=eq.${rentalId}`,
        },
        async (payload) => {
          // Fetch the full message with sender join
          const { data } = await supabase
            .from('messages')
            .select('*, sender:sender_id(id, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages(prev => [...prev, data as Message])
            setTimeout(scrollToBottom, 50)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rentalId])

  const handleSend = async () => {
    const content = newMessage.trim()
    if (!content || isSending) return

    setIsSending(true)
    setNewMessage('')
    inputRef.current?.focus()

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from('messages').insert({
      rental_id: rentalId,
      sender_id: currentUserId,
      content,
      message_type: 'text',
    })

    if (error) {
      console.error('Failed to send message:', error)
      setNewMessage(content) // Restore on failure
    }
    setIsSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-card border border-brand-gray200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-brand-gray200 bg-white">
        <div className="w-9 h-9 bg-brand-gray200 rounded-full flex items-center justify-center overflow-hidden">
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-brand-gray600">
              {otherUser.full_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-sm">{otherUser.full_name}</h4>
          <p className="text-xs text-brand-gray500">Rental conversation</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 no-scrollbar bg-white">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-brand-gray400">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUserId
          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              showAvatar={showAvatar}
            />
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-brand-gray200 px-4 py-3 bg-white">
        <div className="flex items-center gap-2">
          <button className="p-2 text-brand-gray400 hover:text-brand-black hover:bg-brand-gray100 rounded-lg transition-all">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-brand-gray50 border border-brand-gray200 rounded-pill
              text-sm placeholder:text-brand-gray400
              focus:outline-none focus:border-brand-black focus:ring-1 focus:ring-brand-black/10
              transition-all duration-200"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={`p-2.5 rounded-full transition-all duration-200 ${
              newMessage.trim() && !isSending
                ? 'bg-brand-black text-white hover:bg-brand-gray800'
                : 'bg-brand-gray100 text-brand-gray400'
            }`}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
