'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AvailabilityCalendarProps {
  bookedDates: { start: string; end: string }[]
  onSelectRange?: (start: Date, end: Date) => void
  minDays?: number
  maxDays?: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

export default function AvailabilityCalendar({
  bookedDates,
  onSelectRange,
  minDays = 1,
  maxDays = 90,
}: AvailabilityCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth())
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear())
  const [startDate, setStartDate] = React.useState<Date | null>(null)
  const [endDate, setEndDate] = React.useState<Date | null>(null)
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null)

  // Parse booked ranges
  const bookedRanges = React.useMemo(() =>
    bookedDates.map(r => ({
      start: new Date(r.start),
      end: new Date(r.end),
    })),
    [bookedDates]
  )

  const isBooked = (date: Date) =>
    bookedRanges.some(r => isInRange(date, r.start, r.end))

  const isPast = (date: Date) => date < today

  const isDisabled = (date: Date) => isPast(date) || isBooked(date)

  const handleDayClick = (date: Date) => {
    if (isDisabled(date)) return

    if (!startDate || (startDate && endDate)) {
      setStartDate(date)
      setEndDate(null)
    } else {
      if (date < startDate) {
        setStartDate(date)
        setEndDate(null)
      } else {
        // Check for booked dates in range
        const hasConflict = bookedRanges.some(r =>
          (r.start >= startDate && r.start <= date) ||
          (r.end >= startDate && r.end <= date)
        )
        if (hasConflict) {
          setStartDate(date)
          setEndDate(null)
        } else {
          setEndDate(date)
          onSelectRange?.(startDate, date)
        }
      }
    }
  }

  const navigateMonth = (delta: number) => {
    let newMonth = currentMonth + delta
    let newYear = currentYear
    if (newMonth > 11) { newMonth = 0; newYear++ }
    if (newMonth < 0) { newMonth = 11; newYear-- }
    setCurrentMonth(newMonth)
    setCurrentYear(newYear)
  }

  // Generate calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentYear, currentMonth, i))
  }

  const isSelected = (date: Date) => {
    if (startDate && isSameDay(date, startDate)) return true
    if (endDate && isSameDay(date, endDate)) return true
    return false
  }

  const isInSelectedRange = (date: Date) => {
    if (!startDate) return false
    const end = endDate || hoverDate
    if (!end) return false
    const rangeStart = startDate < end ? startDate : end
    const rangeEnd = startDate < end ? end : startDate
    return isInRange(date, rangeStart, rangeEnd) && !isSelected(date)
  }

  return (
    <div className="bg-white border border-brand-gray200 rounded-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigateMonth(-1)}
          className="p-1.5 hover:bg-brand-gray100 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h4 className="text-sm font-semibold">
          {MONTHS[currentMonth]} {currentYear}
        </h4>
        <button onClick={() => navigateMonth(1)}
          className="p-1.5 hover:bg-brand-gray100 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-brand-gray400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="h-9" />
          }

          const disabled = isDisabled(date)
          const booked = isBooked(date)
          const selected = isSelected(date)
          const inRange = isInSelectedRange(date)
          const isToday = isSameDay(date, today)

          return (
            <motion.button
              key={date.toISOString()}
              whileTap={!disabled ? { scale: 0.9 } : {}}
              onClick={() => handleDayClick(date)}
              onMouseEnter={() => startDate && !endDate && setHoverDate(date)}
              onMouseLeave={() => setHoverDate(null)}
              disabled={disabled}
              className={`
                h-9 rounded-lg text-xs font-medium transition-all duration-150 relative
                ${disabled
                  ? booked
                    ? 'bg-red-50 text-red-300 cursor-not-allowed line-through'
                    : 'text-brand-gray300 cursor-not-allowed'
                  : selected
                    ? 'bg-brand-black text-white shadow-glow-black'
                    : inRange
                      ? 'bg-brand-gray100 text-brand-black'
                      : 'text-brand-gray700 hover:bg-brand-gray100'
                }
                ${isToday && !selected ? 'ring-1 ring-brand-black' : ''}
              `}
            >
              {date.getDate()}
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-brand-gray100">
        <div className="flex items-center gap-1.5 text-xs text-brand-gray500">
          <span className="w-3 h-3 bg-brand-black rounded" /> Selected
        </div>
        <div className="flex items-center gap-1.5 text-xs text-brand-gray500">
          <span className="w-3 h-3 bg-red-50 border border-red-200 rounded" /> Booked
        </div>
        <div className="flex items-center gap-1.5 text-xs text-brand-gray500">
          <span className="w-3 h-3 ring-1 ring-brand-black rounded" /> Today
        </div>
      </div>

      {/* Selected range summary */}
      {startDate && endDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-3 bg-brand-gray50 rounded-lg text-sm"
        >
          <div className="flex justify-between">
            <span className="text-brand-gray500">Check-in</span>
            <span className="font-medium">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-brand-gray500">Check-out</span>
            <span className="font-medium">{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex justify-between mt-1 pt-2 border-t border-brand-gray200">
            <span className="text-brand-gray500">Duration</span>
            <span className="font-semibold">
              {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
