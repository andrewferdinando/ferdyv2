'use client'

import { getAllTimezones } from '@/lib/utils/timezone'

// ChevronDown icon component (inline SVG matching project pattern)
const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

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
        <div className="absolute right-3 top-0 bottom-0 flex items-center pointer-events-none">
          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

