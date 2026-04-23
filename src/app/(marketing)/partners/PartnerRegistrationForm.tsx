'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'

type Country = 'NZ' | 'AU' | 'Other'
type EntityType = 'Sole trader' | 'Company' | 'Partnership' | 'Trust' | 'Other'

interface FormState {
  full_name: string
  email: string
  phone: string
  country: Country
  trading_name: string
  entity_type: EntityType
  company_number: string
  business_address: string
  gst_registered: boolean
  gst_number: string
  bank_account_name: string
  bank_account_number: string
  wise_email: string
  tcs_accepted: boolean
}

const initialState: FormState = {
  full_name: '',
  email: '',
  phone: '',
  country: 'NZ',
  trading_name: '',
  entity_type: 'Sole trader',
  company_number: '',
  business_address: '',
  gst_registered: false,
  gst_number: '',
  bank_account_name: '',
  bank_account_number: '',
  wise_email: '',
  tcs_accepted: false,
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'
const inputClass =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition'
// Native <select> chevron sits flush against the border. We hide it with
// appearance-none, add right padding, and render our own properly-spaced
// ChevronDown via <SelectChevron/>.
const selectClass =
  'w-full h-10 pl-3 pr-10 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition appearance-none cursor-pointer'

function SelectChevron() {
  return (
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
    />
  )
}
const textareaClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:border-[#6366F1] focus:ring-4 focus:ring-[#EEF2FF] focus:outline-none transition'
const sectionTitle = 'text-base font-semibold text-gray-900 mb-4'
const errorClass = 'text-xs text-red-600 mt-1'

export default function PartnerRegistrationForm() {
  const [values, setValues] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const successRef = useRef<HTMLDivElement | null>(null)

  // When the form is replaced with the success message, the browser preserves
  // the scroll position from where the user hit submit — which leaves the
  // (much shorter) confirmation off-screen above them. Scroll it into view.
  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [success])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const isFormValid = useMemo(() => {
    const baseRequired: (keyof FormState)[] = [
      'full_name',
      'email',
      'trading_name',
      'business_address',
    ]
    for (const f of baseRequired) {
      if (!String(values[f] || '').trim()) return false
    }
    if (!values.tcs_accepted) return false
    if (values.gst_registered && !values.gst_number.trim()) return false

    // Conditional payment fields.
    if (values.country === 'NZ') {
      if (!values.bank_account_name.trim()) return false
      if (!values.bank_account_number.trim()) return false
    } else {
      if (!values.wise_email.trim()) return false
    }
    return true
  }, [values])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setFieldError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Please try again.')
        setFieldError(data?.field || null)
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div
        ref={successRef}
        className="scroll-mt-20 rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">You&rsquo;re in!</h3>
        <p className="text-gray-700 mb-1">
          Thanks for registering. A welcome email is on its way to {values.email}.
        </p>
        <p className="text-gray-600 text-sm">
          Next step: when you have an introduction to make, email me at{' '}
          <a href="mailto:andrew@ferdy.io" className="text-indigo-600 hover:underline font-medium">
            andrew@ferdy.io
          </a>{' '}
          with the prospect CC&rsquo;d.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-8"
      noValidate
    >
      {/* About you */}
      <fieldset>
        <legend className={sectionTitle}>About you</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="full_name" className={labelClass}>
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              className={inputClass}
              value={values.full_name}
              onChange={(e) => update('full_name', e.target.value)}
            />
            {fieldError === 'full_name' && error && <p className={errorClass}>{error}</p>}
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
            />
            {fieldError === 'email' && error && <p className={errorClass}>{error}</p>}
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              className={inputClass}
              value={values.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="country" className={labelClass}>
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="country"
                required
                className={selectClass}
                value={values.country}
                onChange={(e) => update('country', e.target.value as Country)}
              >
                <option value="NZ">New Zealand</option>
                <option value="AU">Australia</option>
                <option value="Other">Other</option>
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Your business */}
      <fieldset>
        <legend className={sectionTitle}>Your business</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="trading_name" className={labelClass}>
              Trading name <span className="text-red-500">*</span>
            </label>
            <input
              id="trading_name"
              type="text"
              autoComplete="organization"
              required
              className={inputClass}
              value={values.trading_name}
              onChange={(e) => update('trading_name', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="entity_type" className={labelClass}>
              Entity type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="entity_type"
                required
                className={selectClass}
                value={values.entity_type}
                onChange={(e) => update('entity_type', e.target.value as EntityType)}
              >
                <option value="Sole trader">Sole trader</option>
                <option value="Company">Company</option>
                <option value="Partnership">Partnership</option>
                <option value="Trust">Trust</option>
                <option value="Other">Other</option>
              </select>
              <SelectChevron />
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="company_number" className={labelClass}>
              Company number / NZBN <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="company_number"
              type="text"
              className={inputClass}
              value={values.company_number}
              onChange={(e) => update('company_number', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="business_address" className={labelClass}>
              Business address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="business_address"
              autoComplete="street-address"
              required
              rows={3}
              className={textareaClass}
              value={values.business_address}
              onChange={(e) => update('business_address', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-start gap-3">
              <input
                id="gst_registered"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                checked={values.gst_registered}
                onChange={(e) => update('gst_registered', e.target.checked)}
              />
              <label htmlFor="gst_registered" className="text-sm text-gray-700 select-none cursor-pointer">
                I am GST-registered
              </label>
            </div>
          </div>
          {values.gst_registered && (
            <div className="md:col-span-2">
              <label htmlFor="gst_number" className={labelClass}>
                GST number <span className="text-red-500">*</span>
              </label>
              <input
                id="gst_number"
                type="text"
                required
                className={inputClass}
                value={values.gst_number}
                onChange={(e) => update('gst_number', e.target.value)}
              />
              {fieldError === 'gst_number' && error && <p className={errorClass}>{error}</p>}
            </div>
          )}
        </div>
      </fieldset>

      {/* Payment details — conditional on country */}
      <fieldset>
        <legend className={sectionTitle}>Payment details</legend>

        {values.country === 'NZ' ? (
          <>
            <p className="text-xs text-gray-500 mb-4">
              I&rsquo;ll pay your commission by direct NZ bank transfer each month. Bank account number is encrypted
              in our database.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="bank_account_name" className={labelClass}>
                  Bank account name <span className="text-red-500">*</span>
                </label>
                <input
                  id="bank_account_name"
                  type="text"
                  required
                  className={inputClass}
                  value={values.bank_account_name}
                  onChange={(e) => update('bank_account_name', e.target.value)}
                />
                {fieldError === 'bank_account_name' && error && <p className={errorClass}>{error}</p>}
              </div>
              <div className="md:col-span-2">
                <label htmlFor="bank_account_number" className={labelClass}>
                  Bank account number <span className="text-red-500">*</span>
                </label>
                <input
                  id="bank_account_number"
                  type="text"
                  required
                  className={inputClass}
                  value={values.bank_account_number}
                  onChange={(e) => update('bank_account_number', e.target.value)}
                />
                {fieldError === 'bank_account_number' && error && <p className={errorClass}>{error}</p>}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              As you&rsquo;re not based in New Zealand, I&rsquo;ll pay your commission via Wise using this email
              address. If you don&rsquo;t have a Wise account yet, you can create one for free at{' '}
              <a
                href="https://wise.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                wise.com
              </a>
              {' '}- or I&rsquo;ll email you to arrange an alternative. Email is encrypted in our database.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="wise_email" className={labelClass}>
                  Wise email <span className="text-red-500">*</span>
                </label>
                <input
                  id="wise_email"
                  type="email"
                  required
                  className={inputClass}
                  value={values.wise_email}
                  onChange={(e) => update('wise_email', e.target.value)}
                />
                {fieldError === 'wise_email' && error && <p className={errorClass}>{error}</p>}
              </div>
            </div>
          </>
        )}
      </fieldset>

      {/* Agreement */}
      <div>
        <div className="flex items-start gap-3">
          <input
            id="tcs_accepted"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
            checked={values.tcs_accepted}
            onChange={(e) => update('tcs_accepted', e.target.checked)}
          />
          <label htmlFor="tcs_accepted" className="text-sm text-gray-700 select-none cursor-pointer">
            I agree to the{' '}
            <a
              href="/partners/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline font-medium"
            >
              Partner Programme Terms &amp; Conditions
            </a>
            .
          </label>
        </div>
      </div>

      {error && !fieldError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!isFormValid || submitting}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#4F46E5] hover:to-[#4338CA] text-white font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Become a partner'
        )}
      </button>
    </form>
  )
}
