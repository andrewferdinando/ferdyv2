'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/auth/RequireAuth'
import { useContentPrefs } from '@/hooks/useContentPrefs'
import { Input } from '@/components/ui/Input'
import { Form } from '@/components/ui/Form'

// Icons
const SaveIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

export default function ContentPreferencesPage() {
  const params = useParams()
  const brandId = params.brandId as string
  const { prefs, loading, error, updatePrefs } = useContentPrefs(brandId)

  const [formData, setFormData] = useState({
    tone: prefs?.tone_default || '',
    hashtagStrategy: prefs?.hashtag_strategy ? JSON.stringify(prefs.hashtag_strategy) : '',
    contentThemes: '',
    postingFrequency: '',
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await updatePrefs({
        tone_default: formData.tone,
        hashtag_strategy: formData.hashtagStrategy ? JSON.parse(formData.hashtagStrategy) : {}
      })
      setMessage('Preferences saved successfully!')
    } catch {
      setMessage('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
          </div>
        </AppLayout>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Preferences</h1>
            <p className="text-gray-600 mt-1">Set your content generation preferences and brand voice</p>
          </div>

          {/* Content */}
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              Error loading content preferences: {error}
            </div>
          ) : (
            <div className="max-w-2xl">
              <Form onSubmit={handleSubmit} className="space-y-6">
                {message && (
                  <div className={`px-4 py-3 rounded-md ${
                    message.includes('success') 
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    {message}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Tone
                  </label>
                  <Input
                    type="text"
                    value={formData.tone}
                    onChange={(e) => setFormData({...formData, tone: e.target.value})}
                    placeholder="e.g., Professional, Friendly, Casual, Authoritative"
                  />
                  <p className="text-sm text-gray-500 mt-1">Describe the tone of voice for your brand&apos;s content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hashtag Strategy
                  </label>
                  <Input
                    type="text"
                    value={formData.hashtagStrategy}
                    onChange={(e) => setFormData({...formData, hashtagStrategy: e.target.value})}
                    placeholder="e.g., 3-5 hashtags, mix of popular and niche"
                  />
                  <p className="text-sm text-gray-500 mt-1">Your preferred hashtag usage strategy</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Themes
                  </label>
                  <textarea
                    value={formData.contentThemes}
                    onChange={(e) => setFormData({...formData, contentThemes: e.target.value})}
                    placeholder="e.g., Industry insights, behind-the-scenes, product features, customer stories"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all duration-150 resize-none"
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">List the main themes and topics for your content</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Posting Frequency
                  </label>
                  <select
                    value={formData.postingFrequency}
                    onChange={(e) => setFormData({...formData, postingFrequency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-all duration-150"
                  >
                    <option value="">Select frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays only</option>
                    <option value="3x-week">3 times per week</option>
                    <option value="2x-week">2 times per week</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">How often you want to post content</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SaveIcon className="w-5 h-5 mr-2" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </Form>
            </div>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
