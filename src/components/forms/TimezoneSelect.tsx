'use client'

import { getAllTimezones } from '@/lib/utils/timezone'

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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent
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
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

