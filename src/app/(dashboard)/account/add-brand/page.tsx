'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import RequireAuth from '@/components/auth/RequireAuth'
import AppLayout from '@/components/layout/AppLayout'
import type { FormEvent } from 'react'
import { Form, FormField } from '@/components/ui/Form'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'
import { supabase } from '@/lib/supabase-browser'
import { getTimezonesByCountry, getAllTimezones } from '@/lib/utils/timezone'
import { createBrandAction } from './actions'
import { z } from 'zod'

const CountryOptions = [
  { code: '', name: 'Select a country (optional)' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
]

const BrandFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Brand name is required'),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value) return true
        try {
          const url = new URL(value)
          return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
          return false
        }
      },
      { message: 'Website URL must start with http:// or https://' }
    ),
  countryCode: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.length === 2,
      { message: 'Country must be a valid ISO code' }
    ),
  timezone: z
    .string()
    .trim()
    .min(1, 'Time zone is required'),
})

type BrandFormValues = z.infer<typeof BrandFormSchema>

export default function AddBrandPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'unauthorized'>('loading')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<BrandFormValues>({
    name: '',
    websiteUrl: '',
    countryCode: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  })
  const [touched, setTouched] = useState<Record<keyof BrandFormValues, boolean>>({
    name: false,
    websiteUrl: false,
    countryCode: false,
    timezone: false,
  })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof BrandFormValues, string>>>({})

  const timezonesByCountry = useMemo(() => getTimezonesByCountry(), [])
  const allTimezones = useMemo(() => getAllTimezones(), [])

  const availableTimezones = useMemo(() => {
    if (formValues.countryCode && timezonesByCountry[formValues.countryCode]) {
      return timezonesByCountry[formValues.countryCode]
    }
    return allTimezones
  }, [formValues.countryCode, timezonesByCountry, allTimezones])

  const validate = useCallback((values: BrandFormValues) => {
    const result = BrandFormSchema.safeParse(values)

    if (!result.success) {
      const issues = result.error.issues.reduce((acc, issue) => {
        const path = issue.path[0] as keyof BrandFormValues | undefined
        if (path) {
          acc[path] = issue.message
        }
        return acc
      }, {} as Partial<Record<keyof BrandFormValues, string>>)

      setFieldErrors(issues)
      return false
    }

    setFieldErrors({})
    return true
  }, [])

  useEffect(() => {
    const fetchProfileRole = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setAuthState('unauthorized')
          return
        }

        setCurrentUserId(user.id)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('AddBrandPage: unable to load profile', profileError)
          setAuthState('unauthorized')
          return
        }

        if (!['admin', 'super_admin'].includes(profile.role)) {
          setAuthState('unauthorized')
          return
        }

        setAuthState('ready')
      } catch (error) {
        console.error('AddBrandPage: unexpected auth error', error)
        setAuthState('unauthorized')
      }
    }

    fetchProfileRole()
  }, [])

  useEffect(() => {
    validate(formValues)
  }, [formValues, validate])

  useEffect(() => {
    if (authState === 'unauthorized') {
      const timeout = setTimeout(() => {
        router.replace('/brands')
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [authState, router])

  const handleChange = (field: keyof BrandFormValues, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleBlur = (field: keyof BrandFormValues) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched({
      name: true,
      websiteUrl: true,
      countryCode: true,
      timezone: true,
    })

    const isValid = validate(formValues)
    if (!isValid) {
      return
    }

    if (!currentUserId) {
      setServerError('Your session expired. Please refresh and sign in again.')
      return
    }

    setIsSubmitting(true)
    setServerError('')

    try {
      const brandId = await createBrandAction({
        userId: currentUserId,
        name: formValues.name.trim(),
        websiteUrl: formValues.websiteUrl?.trim() || '',
        countryCode: formValues.countryCode?.trim().toUpperCase(),
        timezone: formValues.timezone.trim(),
      })

      showToast({
        title: 'Brand created successfully.',
        type: 'success',
      })

      router.push(`/brands/${brandId}/schedule`)
    } catch (error) {
      console.error('AddBrandPage: failed to create brand', error)
      setServerError(error instanceof Error ? error.message : 'Failed to create brand. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = (event: FormEvent) => {
    void handleSubmit(event)
  }

  const isFormValid = BrandFormSchema.safeParse(formValues).success

  const renderContent = () => {
    if (authState === 'loading') {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
            <p className="text-sm text-gray-600">Checking your permissions…</p>
          </div>
        </div>
      )
    }

    if (authState === 'unauthorized') {
      return (
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">You don&apos;t have access to this page</h2>
          <p className="text-sm text-gray-600">
            Only Account Admins can add new brands. If you think this is a mistake, please contact your administrator.
          </p>
          <button
            onClick={() => router.push('/brands')}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to Brands
          </button>
        </div>
      )
    }

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-950">Add Brand</h1>
            <p className="text-gray-600">
              Create a new brand to manage its social content, data, and automations.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 space-y-8">
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
              {serverError}
            </div>
          )}

          <Form onSubmit={handleFormSubmit} className="space-y-6">
            <FormField label="Brand Name" required>
              <Input
                value={formValues.name}
                onChange={(event) => handleChange('name', event.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="Acme Studios"
                error={touched.name ? fieldErrors.name : undefined}
                maxLength={120}
              />
            </FormField>

            <FormField label="Website URL">
              <Input
                type="url"
                value={formValues.websiteUrl ?? ''}
                onChange={(event) => handleChange('websiteUrl', event.target.value)}
                onBlur={() => handleBlur('websiteUrl')}
                placeholder="https://yourwebsite.com"
                error={touched.websiteUrl ? fieldErrors.websiteUrl : undefined}
              />
            </FormField>

            <FormField label="Country">
              <Select
                value={formValues.countryCode ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  handleChange('countryCode', value)

                  if (value && timezonesByCountry[value]?.length && !timezonesByCountry[value].includes(formValues.timezone)) {
                    handleChange('timezone', timezonesByCountry[value][0])
                  }
                }}
                onBlur={() => handleBlur('countryCode')}
                options={CountryOptions.map((option) => ({
                  value: option.code,
                  label: option.name,
                }))}
                error={touched.countryCode ? fieldErrors.countryCode : undefined}
              />
            </FormField>

            <FormField label="Time Zone" required>
              <Select
                value={formValues.timezone}
                onChange={(event) => handleChange('timezone', event.target.value)}
                onBlur={() => handleBlur('timezone')}
                options={[
                  { value: '', label: 'Select a time zone' },
                  ...availableTimezones.map((timezone) => ({
                    value: timezone,
                    label: timezone.replace(/_/g, ' '),
                  })),
                ]}
                error={touched.timezone ? fieldErrors.timezone : undefined}
              />
              <p className="mt-1 text-xs text-gray-500">
                This time zone is used for scheduling across the brand.
              </p>
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/account')}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid || !currentUserId}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-[#4F46E5] hover:to-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating…' : 'Create Brand'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    )
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="px-4 py-10 sm:px-6 lg:px-10">
            {renderContent()}
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}


