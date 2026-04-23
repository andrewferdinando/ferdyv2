'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react'
import { authFetch } from '@/lib/client/auth-fetch'
import type { PartnerDetail } from '@/app/(dashboard)/super-admin/partners/[id]/page'

interface Props {
  partner: PartnerDetail
  onUpdated: () => void
}

export default function PartnerProfile({ partner, onUpdated }: Props) {
  const [form, setForm] = useState(() => ({
    status: partner.status,
    full_name: partner.full_name,
    email: partner.email,
    phone: partner.phone ?? '',
    country: partner.country,
    trading_name: partner.trading_name,
    entity_type: partner.entity_type,
    company_number: partner.company_number ?? '',
    business_address: partner.business_address,
    gst_registered: partner.gst_registered,
    gst_number: partner.gst_number ?? '',
    bank_account_name: partner.bank_account_name,
    bank_account_number: partner.bank_account_number ?? '',
    wise_email: partner.wise_email ?? '',
    stripe_promotion_code_id: partner.stripe_promotion_code_id ?? '',
    discount_code_display: partner.discount_code_display ?? '',
    discount_code_notes: partner.discount_code_notes ?? '',
    notes: partner.notes ?? '',
  }))
  const [showBank, setShowBank] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        status: form.status,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone.trim() || null,
        country: form.country,
        trading_name: form.trading_name,
        entity_type: form.entity_type,
        company_number: form.company_number.trim() || null,
        business_address: form.business_address,
        gst_registered: form.gst_registered,
        gst_number: form.gst_registered ? (form.gst_number.trim() || null) : null,
        bank_account_name: form.bank_account_name,
        stripe_promotion_code_id: form.stripe_promotion_code_id.trim() || null,
        discount_code_display: form.discount_code_display.trim() || null,
        discount_code_notes: form.discount_code_notes.trim() || null,
        notes: form.notes.trim() || null,
      }
      // Only send bank number if changed from the original
      if (form.bank_account_number !== (partner.bank_account_number ?? '')) {
        if (form.bank_account_number.trim()) {
          payload.bank_account_number = form.bank_account_number.trim()
        }
      }
      if (form.wise_email !== (partner.wise_email ?? '')) {
        payload.wise_email = form.wise_email.trim()
      }

      const res = await authFetch(`/api/super-admin/partners/${partner.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      setSaved(true)
      onUpdated()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const promoUrl = form.stripe_promotion_code_id
    ? `https://dashboard.stripe.com/promotion_codes/${form.stripe_promotion_code_id}`
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Partner status">
            <select value={form.status} onChange={(e) => update('status', e.target.value as any)} className={inputStyles}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="terminated">Terminated</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name"><input className={inputStyles} value={form.full_name} onChange={(e) => update('full_name', e.target.value)} /></Field>
          <Field label="Email"><input className={inputStyles} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputStyles} value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Field>
          <Field label="Country">
            <select className={inputStyles} value={form.country} onChange={(e) => update('country', e.target.value)}>
              <option value="NZ">New Zealand</option>
              <option value="AU">Australia</option>
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Business">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Trading name"><input className={inputStyles} value={form.trading_name} onChange={(e) => update('trading_name', e.target.value)} /></Field>
          <Field label="Entity type">
            <select className={inputStyles} value={form.entity_type} onChange={(e) => update('entity_type', e.target.value)}>
              <option value="Sole trader">Sole trader</option>
              <option value="Company">Company</option>
              <option value="Partnership">Partnership</option>
              <option value="Trust">Trust</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Company number / NZBN"><input className={inputStyles} value={form.company_number} onChange={(e) => update('company_number', e.target.value)} /></Field>
          <Field label="GST registered">
            <label className="flex items-center gap-2 pt-2">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#6366F1]" checked={form.gst_registered} onChange={(e) => update('gst_registered', e.target.checked)} />
              <span className="text-sm text-gray-700">GST-registered</span>
            </label>
          </Field>
          {form.gst_registered && (
            <Field label="GST number"><input className={inputStyles} value={form.gst_number} onChange={(e) => update('gst_number', e.target.value)} /></Field>
          )}
          <div className="md:col-span-2">
            <Field label="Business address"><textarea rows={3} className={inputStyles} value={form.business_address} onChange={(e) => update('business_address', e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      <Section title="Payment details">
        <p className="text-xs text-gray-500 mb-4">
          {form.country === 'NZ'
            ? 'Paid by direct NZ bank transfer.'
            : 'Paid via Wise to the email below.'}
        </p>
        {form.country === 'NZ' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Bank account name">
              <input className={inputStyles} value={form.bank_account_name} onChange={(e) => update('bank_account_name', e.target.value)} />
            </Field>
            <Field label="Bank account number">
              <div className="flex gap-2">
                <input
                  className={inputStyles}
                  type={showBank ? 'text' : 'password'}
                  value={form.bank_account_number}
                  onChange={(e) => update('bank_account_number', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowBank((v) => !v)}
                  className="rounded-lg border border-gray-300 px-2 text-gray-600 hover:bg-gray-50"
                  aria-label={showBank ? 'Hide' : 'Show'}
                >
                  {showBank ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Wise email">
                <div className="flex gap-2">
                  <input
                    className={inputStyles}
                    type={showBank ? 'email' : 'password'}
                    value={form.wise_email}
                    onChange={(e) => update('wise_email', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowBank((v) => !v)}
                    className="rounded-lg border border-gray-300 px-2 text-gray-600 hover:bg-gray-50"
                    aria-label={showBank ? 'Hide' : 'Show'}
                  >
                    {showBank ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>
          </div>
        )}
      </Section>

      <Section title="Discount code">
        <p className="text-xs text-gray-500 mb-3">
          Set by super admin after partner onboarding. Not exposed on the public registration form.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Stripe promotion code ID">
            <div className="flex gap-2">
              <input
                className={inputStyles}
                placeholder="promo_1ABC..."
                value={form.stripe_promotion_code_id}
                onChange={(e) => update('stripe_promotion_code_id', e.target.value)}
              />
              {promoUrl && (
                <a
                  href={promoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 text-gray-700 hover:bg-gray-50"
                  title="Open in Stripe"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </Field>
          <Field label="Customer-facing code">
            <input className={inputStyles} placeholder="PARTNER20" value={form.discount_code_display} onChange={(e) => update('discount_code_display', e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Notes">
              <textarea
                rows={2}
                className={inputStyles}
                placeholder="e.g. 20% off first 3 months"
                value={form.discount_code_notes}
                onChange={(e) => update('discount_code_notes', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Admin notes">
        <Field label="Notes (admin-only)">
          <textarea rows={4} className={inputStyles} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </Field>
      </Section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {saved && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">Saved.</div>}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputStyles =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] focus:outline-none'
