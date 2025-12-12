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
import ConfirmDialog from '@/components/ui/ConfirmDialog'

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
  const [showTeamAssignment, setShowTeamAssignment] = useState(false)
  const [newBrandId, setNewBrandId] = useState<string | null>(null)
  const [newBrandName, setNewBrandName] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string, email: string}>>([]) 
  const [selectedMembers, setSelectedMembers] = useState<Array<{userId: string, role: 'admin' | 'editor'}>>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pricePerBrand, setPricePerBrand] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>('USD')
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

        // Fetch group pricing information
        const { data: membership } = await supabase
          .from('group_memberships')
          .select('group_id')
          .eq('user_id', user.id)
          .single()

        if (membership) {
          const { data: group } = await supabase
            .from('groups')
            .select('price_per_brand_cents, currency')
            .eq('id', membership.group_id)
            .single()

          if (group) {
            setPricePerBrand(group.price_per_brand_cents)
            setCurrency(group.currency.toUpperCase())
          }
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

    // Show confirmation dialog before creating brand
    setShowConfirmDialog(true)
  }

  const handleConfirmAddBrand = async () => {
    setShowConfirmDialog(false)
    setIsSubmitting(true)
    setServerError('')

    try {
      const brandId = await createBrandAction({
        userId: currentUserId!,
        name: formValues.name.trim(),
        websiteUrl: formValues.websiteUrl?.trim() || '',
        countryCode: formValues.countryCode?.trim().toUpperCase(),
        timezone: formValues.timezone.trim(),
      })

      // Store brand info and show team assignment modal
      setNewBrandId(brandId)
      setNewBrandName(formValues.name.trim())
      
      // Load team members for assignment
      await loadTeamMembers()
      
      setShowTeamAssignment(true)
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

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's group
      const { data: membership } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) return

      // Get all group members
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('user_id')
        .eq('group_id', membership.group_id)

      if (!memberships) return

      // Get user profiles
      const members = []
      for (const m of memberships) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', m.user_id)
          .single()

        members.push({
          id: m.user_id,
          name: profile?.name || 'Unknown',
          email: m.user_id === user.id ? user.email || '' : 'Email hidden'
        })
      }

      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.userId === userId)
      if (exists) {
        return prev.filter(m => m.userId !== userId)
      } else {
        return [...prev, { userId, role: 'editor' }]
      }
    })
  }

  const handleMemberRoleChange = (userId: string, role: 'admin' | 'editor') => {
    setSelectedMembers(prev =>
      prev.map(m => m.userId === userId ? { ...m, role } : m)
    )
  }

  const handleSkipTeamAssignment = () => {
    showToast({
      title: 'Brand created successfully.',
      type: 'success',
    })
    router.push('/brands')
  }

  const handleSaveTeamAssignment = async () => {
    if (!newBrandId) return

    try {
      setIsSubmitting(true)

      // Create brand memberships
      const memberships = selectedMembers.map(m => ({
        brand_id: newBrandId,
        user_id: m.userId,
        role: m.role,
      }))

      if (memberships.length > 0) {
        // Use upsert to handle case where creator is already assigned by RPC
        const { error } = await supabase
          .from('brand_memberships')
          .upsert(memberships, {
            onConflict: 'brand_id,user_id',
            ignoreDuplicates: false
          })

        if (error) throw error
      }

      showToast({
        title: `Brand created with ${selectedMembers.length} team member(s) assigned.`,
        type: 'success',
      })

      router.push('/brands')
    } catch (error) {
      console.error('Error assigning team members:', error)
      showToast({
        title: 'Failed to assign team members',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
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
              <p className="mt-1 text-xs text-amber-600 flex items-start gap-1">
                <span className="text-amber-600">⚠️</span>
                <span><strong>Important:</strong> Timezone cannot be changed after brand creation. All scheduled posts will use this timezone.</span>
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

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleConfirmAddBrand}
          title="Confirm Add Brand"
          message={pricePerBrand !== null
            ? `Adding a new brand will cost ${currency === 'USD' ? '$' : currency + ' '}${(pricePerBrand / 100).toFixed(2)} per month. This will be prorated and added to your next invoice. Do you want to proceed?`
            : 'Are you sure you want to add this brand? The cost will be added to your next invoice.'}
          confirmText="Add Brand"
          cancelText="Cancel"
          isLoading={false}
        />

        {/* Team Assignment Modal */}
        {showTeamAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Assign Team Members to {newBrandName}</h2>
                <p className="mt-1 text-sm text-gray-600">Select which team members should have access to this brand</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No other team members found</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => {
                      const assignment = selectedMembers.find(m => m.userId === member.id)
                      const isSelected = !!assignment

                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <label className="flex items-center cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleMemberToggle(member.id)}
                              className="mr-3 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </label>

                          {isSelected && (
                            <select
                              value={assignment.role}
                              onChange={(e) => handleMemberRoleChange(member.id, e.target.value as 'admin' | 'editor')}
                              className="ml-3 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#EEF2FF] focus:border-[#6366F1] focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <p className="mt-4 text-xs text-gray-500">Selected: {selectedMembers.length} of {teamMembers.length} members</p>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleSkipTeamAssignment}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Skip for Now
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeamAssignment}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : `Assign ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </RequireAuth>
  )
}


