'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
  title: string
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const displayImages = images.length > 0 ? images : ['']

  const goTo = (index: number) => {
    setCurrentIndex((index + displayImages.length) % displayImages.length)
  }

  return (
    <>
      <div className="relative">
        {/* Main Image */}
        <div className="relative aspect-[16/10] bg-brand-gray100 rounded-card overflow-hidden group">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              {displayImages[currentIndex] ? (
                <img
                  src={displayImages[currentIndex]}
                  alt={`${title} - Image ${currentIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-brand-gray300 text-sm">
                  No image available
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm
                  rounded-full flex items-center justify-center shadow-card
                  opacity-0 group-hover:opacity-100 transition-all duration-200
                  hover:bg-white hover:scale-105"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm
                  rounded-full flex items-center justify-center shadow-card
                  opacity-0 group-hover:opacity-100 transition-all duration-200
                  hover:bg-white hover:scale-105"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg
              opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white"
          >
            <Expand className="w-4 h-4" />
          </button>

          {/* Image counter */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-sm
              text-white text-xs font-medium rounded-pill">
              {currentIndex + 1} / {displayImages.length}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {displayImages.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
            {displayImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  i === currentIndex
                    ? 'border-brand-black shadow-glow-black'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={displayImages[currentIndex]}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />

            {displayImages.length > 1 && (
              <>
                <button onClick={() => goTo(currentIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors">
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button onClick={() => goTo(currentIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors">
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
