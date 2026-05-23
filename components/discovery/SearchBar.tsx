'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, onSubmit, placeholder }: SearchBarProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <motion.div
        animate={{
          boxShadow: isFocused
            ? '0 0 0 3px rgba(10,10,10,0.08)'
            : '0 0 0 0px rgba(10,10,10,0)',
        }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
          isFocused ? 'text-brand-black' : 'text-brand-gray400'
        }`} />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || 'Search electronics, vehicles, tools...'}
          className="w-full pl-12 pr-12 py-3.5 bg-brand-gray50 border border-brand-gray200
            rounded-pill text-sm placeholder:text-brand-gray400
            focus:outline-none focus:border-brand-black focus:bg-white
            transition-all duration-200"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-brand-gray400
              hover:text-brand-black hover:bg-brand-gray100 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </form>
  )
}
