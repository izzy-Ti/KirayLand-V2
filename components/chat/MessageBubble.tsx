'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Avatar from '@/components/ui/Avatar'
import type { Message } from '@/types/database'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
}

export default function MessageBubble({ message, isOwn, showAvatar = true }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-brand-gray400 bg-brand-gray50 px-3 py-1 rounded-pill">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      {showAvatar && !isOwn && (
        <Avatar
          src={message.sender?.avatar_url}
          fallback={message.sender?.full_name}
          size="sm"
          className="mt-1 flex-shrink-0"
        />
      )}
      {!showAvatar && !isOwn && <div className="w-8 flex-shrink-0" />}

      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`
          px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isOwn
            ? 'bg-brand-black text-white rounded-tr-sm'
            : 'bg-brand-gray100 text-brand-black rounded-tl-sm'
          }
        `}>
          {message.message_type === 'image' && message.image_url && (
            <img
              src={message.image_url}
              alt="Shared image"
              className="max-w-full rounded-lg mb-2"
            />
          )}
          {message.content}
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-[10px] text-brand-gray400">{time}</span>
          {isOwn && message.is_read && (
            <span className="text-[10px] text-blue-400">✓✓</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
