'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { Input } from '@/components/ui/Input'
import { Form } from '@/components/ui/Form'
import { getTimezonesByCountry, getAllTimezones } from '@/lib/utils/timezone'

interface BrandData {
  name: string
  website_url: string
  country_code: string
  timezone: string
}

interface UserData {
  name: string
  email: string
  password: string
  confirmPassword: string
  profile_image_url?: string
}

export default function SignUpPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form data
  const [brandData, setBrandData] = useState<BrandData>({
    name: '',
    website_url: '',
    country_code: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Default to browser timezone
  })

  // Get timezones by country for dropdown
  const timezonesByCountry = getTimezonesByCountry()
  const allTimezones = getAllTimezones()
  
  // Get timezones for selected country, or all timezones if no country selected
  const availableTimezones = brandData.country_code && timezonesByCountry[brandData.country_code]
    ? timezonesByCountry[brandData.country_code]
    : allTimezones

  // Common country codes (ISO 3166-1 alpha-2)
  const countries = [
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
  
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const totalSteps = 3

  const handleBrandDataChange = (field: keyof BrandData, value: string) => {
    setBrandData(prev => ({ ...prev, [field]: value }))
  }

  const handleUserDataChange = (field: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }))
  }


  const validateStep1 = () => {
    if (!brandData.name.trim()) {
      setError('Brand name is required')
      return false
    }
    if (!brandData.website_url.trim()) {
      setError('Website URL is required')
      return false
    }
    // Basic URL validation
    try {
      new URL(brandData.website_url)
    } catch {
      setError('Please enter a valid website URL')
      return false
    }
    if (!brandData.country_code) {
      setError('Country is required')
      return false
    }
    if (!brandData.timezone) {
      setError('Timezone is required')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!userData.name.trim()) {
      setError('Name is required')
      return false
    }
    if (!userData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!userData.password) {
      setError('Password is required')
      return false
    }
    if (userData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (userData.password !== userData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    setError('')
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Create user account with brand data in metadata
      // Note: The brand will be created via database trigger/function using this metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            brand_name: brandData.name,
            brand_website_url: brandData.website_url,
            brand_country_code: brandData.country_code,
            brand_timezone: brandData.timezone
          }
        }
      })

      // After successful sign-up, create the brand in Supabase
      if (authData.user && !authError) {
        const brandInsertData = {
          name: brandData.name,
          website_url: brandData.website_url,
          country_code: brandData.country_code,
          timezone: brandData.timezone
        }

        console.log('Creating brand with data:', brandInsertData)
        console.log('Country code value:', brandData.country_code)

        const { data: brandDataResult, error: brandError } = await supabase
          .from('brands')
          .insert(brandInsertData)
          .select()

        if (brandError) {
          console.error('Error creating brand:', brandError)
          // Show error to user but don't fail the whole sign-up process
          // The user can still sign in and the brand might be created via trigger
          setError(`Account created but brand creation failed: ${brandError.message}. Please contact support.`)
        } else {
          console.log('Brand created successfully:', brandDataResult)
        }
      }

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Success - redirect to sign-in with message
        router.push('/auth/sign-in?message=Account created successfully! Please check your email to confirm your account.')
      }
    } catch (error) {
      console.error('Sign up error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i + 1 <= currentStep
                ? 'bg-[#6366F1] text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`w-16 h-1 mx-2 ${
                i + 1 < currentStep ? 'bg-[#6366F1]' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Information</h3>
        <p className="text-gray-600">Tell us about your brand or business.</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand Name *
          </label>
          <Input
            type="text"
            value={brandData.name}
            onChange={(e) => handleBrandDataChange('name', e.target.value)}
            required
            placeholder="Enter your brand name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL *
          </label>
          <Input
            type="url"
            value={brandData.website_url}
            onChange={(e) => handleBrandDataChange('website_url', e.target.value)}
            required
            placeholder="https://yourwebsite.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country *
          </label>
          <select
            value={brandData.country_code}
            onChange={(e) => {
              handleBrandDataChange('country_code', e.target.value)
              // Auto-select first timezone for the country if none selected
              if (e.target.value && timezonesByCountry[e.target.value]?.length > 0) {
                handleBrandDataChange('timezone', timezonesByCountry[e.target.value][0])
              }
            }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
          >
            <option value="">Select a country</option>
            {countries.map(country => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone *
          </label>
          <select
            value={brandData.timezone}
            onChange={(e) => handleBrandDataChange('timezone', e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
          >
            <option value="">Select a timezone</option>
            {availableTimezones.map(tz => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Selected: {brandData.timezone || 'Browser timezone'}
          </p>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Information</h3>
        <p className="text-gray-600">Create your account details.</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <Input
            type="text"
            value={userData.name}
            onChange={(e) => handleUserDataChange('name', e.target.value)}
            required
            placeholder="Enter your full name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <Input
            type="email"
            value={userData.email}
            onChange={(e) => handleUserDataChange('email', e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <Input
            type="password"
            value={userData.password}
            onChange={(e) => handleUserDataChange('password', e.target.value)}
            required
            placeholder="Enter your password (min 6 characters)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password *
          </label>
          <Input
            type="password"
            value={userData.confirmPassword}
            onChange={(e) => handleUserDataChange('confirmPassword', e.target.value)}
            required
            placeholder="Confirm your password"
          />
        </div>
        
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review & Confirm</h3>
        <p className="text-gray-600">Please review your information before creating your account.</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Brand Information</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {brandData.name}</div>
            <div><span className="font-medium">Website:</span> {brandData.website_url}</div>
            <div><span className="font-medium">Country:</span> {countries.find(c => c.code === brandData.country_code)?.name || brandData.country_code}</div>
            <div><span className="font-medium">Timezone:</span> {brandData.timezone.replace(/_/g, ' ')}</div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Your Information</h4>
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {userData.name}</div>
            <div><span className="font-medium">Email:</span> {userData.email}</div>
            {userData.profile_image_url && (
              <div className="flex items-center space-x-2">
                <span className="font-medium">Profile Image:</span>
                <img
                  src={userData.profile_image_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a
              href="/auth/sign-in"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              sign in to your existing account
            </a>
          </p>
        </div>
        
        {renderStepIndicator()}
        
        <Form onSubmit={(e) => e.preventDefault()} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-[#6366F1] text-white py-2 px-4 rounded-md hover:bg-[#4F46E5] transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#6366F1] text-white py-2 px-4 rounded-md hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            )}
          </div>
        </Form>
      </div>
    </div>
  )
}
