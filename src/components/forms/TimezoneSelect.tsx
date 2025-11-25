'use client'

import { getAllTimezones } from '@/lib/utils/timezone'
import { ChevronDown } from 'lucide-react'

interface TimezoneSelectProps {
  value: string
  onChange: (timezone: string) => void
  placeholder?: string
  className?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Reusable timezone select dropdown component
 * Uses IANA timezone identifiers from timezone utils
 * Follows design system guidelines for dropdown/select styling
 */
export default function TimezoneSelect({
  value,
  onChange,
  placeholder = 'Select a timezone',
  className = '',
  error,
  required = false,
  disabled = false,
}: TimezoneSelectProps) {
  const allTimezones = getAllTimezones()

  return (
    <div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={`
            w-full h-10 px-3 pr-8 py-2 border rounded-lg text-sm
            focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none
            transition-all duration-150 appearance-none
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${className}
          `}
        >
          <option value="">{placeholder}</option>
          {allTimezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

