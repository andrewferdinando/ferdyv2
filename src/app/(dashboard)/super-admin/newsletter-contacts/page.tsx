'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Modal from '@/components/ui/Modal'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type TabId = 'non_customers' | 'customers' | 'test_users' | 'broadcast'

interface NewsletterContact {
  id: string
  first_name: string
  last_name: string
  email: string
  contact_type: 'Prospect' | 'Referrer' | 'Friend'
  resend_contact_id: string | null
  created_at: string
}

interface ResendContact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  unsubscribed: boolean
}

interface TestUser {
  user_id: string
  name: string
  email: string
  is_test_user: boolean
  created_at: string
}

async function getToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || ''
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  return res.json()
}

// ─── Badge Component ─────────────────────────────────────
function Badge({ label, color }: { label: string; color: 'indigo' | 'green' | 'amber' | 'red' | 'gray' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  )
}

const contactTypeBadgeColor: Record<string, 'indigo' | 'green' | 'amber'> = {
  Prospect: 'indigo',
  Referrer: 'green',
  Friend: 'amber',
}

// ─── Non-Customers Tab ───────────────────────────────────
function NonCustomersTab() {
  const [contacts, setContacts] = useState<NewsletterContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', contact_type: 'Prospect' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const data = await apiFetch('/api/newsletter/contacts')
    setContacts(data.contacts || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  async function handleAdd() {
    setSaving(true)
    setError('')
    const result = await apiFetch('/api/newsletter/contacts', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }
    setShowAddModal(false)
    setFormData({ first_name: '', last_name: '', email: '', contact_type: 'Prospect' })
    setSaving(false)
    loadContacts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this contact from the newsletter audience?')) return
    setDeletingId(id)
    await apiFetch(`/api/newsletter/contacts?id=${id}`, { method: 'DELETE' })
    setDeletingId(null)
    loadContacts()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E6] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No contacts yet</p>
          <p className="text-sm mt-1">Add prospects, referrers, or friends to the newsletter audience.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Added</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{c.first_name} {c.last_name}</td>
                  <td className="py-3 px-4 text-gray-600">{c.email}</td>
                  <td className="py-3 px-4">
                    <Badge label={c.contact_type} color={contactTypeBadgeColor[c.contact_type] || 'gray'} />
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                    >
                      {deletingId === c.id ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Newsletter Contact" subtitle="Add a prospect, referrer, or friend to the Non-customers audience">
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={e => setFormData(f => ({ ...f, first_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => setFormData(f => ({ ...f, last_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.contact_type}
              onChange={e => setFormData(f => ({ ...f, contact_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            >
              <option value="Prospect">Prospect</option>
              <option value="Referrer">Referrer</option>
              <option value="Friend">Friend</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !formData.first_name || !formData.last_name || !formData.email}
              className="px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E6] transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Customers Tab ───────────────────────────────────────
function CustomersTab() {
  const [contacts, setContacts] = useState<ResendContact[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ synced: number; removed: number; errors: string[] } | null>(null)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    const data = await apiFetch('/api/newsletter/customers')
    setContacts(data.contacts || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    const data = await apiFetch('/api/newsletter/sync', { method: 'POST' })
    setSyncing(false)
    if (data.success) {
      setLastSynced(data.syncedAt)
      setSyncResult(data.result)
      loadCustomers()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{contacts.length} customer{contacts.length !== 1 ? 's' : ''} in audience</p>
          {lastSynced && (
            <p className="text-xs text-gray-400 mt-0.5">Last synced: {new Date(lastSynced).toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E6] transition-colors disabled:opacity-50"
        >
          {syncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>

      {syncResult && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Synced {syncResult.synced} customer{syncResult.synced !== 1 ? 's' : ''}.
          {syncResult.removed > 0 && ` Removed ${syncResult.removed} converted contact${syncResult.removed !== 1 ? 's' : ''} from Non-customers.`}
          {syncResult.errors.length > 0 && (
            <span className="text-red-600"> {syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''}.</span>
          )}
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No customers synced yet</p>
          <p className="text-sm mt-1">Click "Sync Now" to pull active customers into the audience.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Added</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{c.email}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {c.unsubscribed ? (
                      <Badge label="Unsubscribed" color="red" />
                    ) : (
                      <Badge label="Subscribed" color="green" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Test Users Tab ──────────────────────────────────────
function TestUsersTab() {
  const [testUsers, setTestUsers] = useState<TestUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadTestUsers = useCallback(async () => {
    setLoading(true)
    const data = await apiFetch('/api/newsletter/test-users')
    setTestUsers(data.testUsers || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTestUsers() }, [loadTestUsers])

  async function handleToggle(userId: string, currentValue: boolean) {
    setTogglingId(userId)
    await apiFetch('/api/newsletter/test-users', {
      method: 'PATCH',
      body: JSON.stringify({ user_id: userId, is_test_user: !currentValue }),
    })
    setTogglingId(null)
    loadTestUsers()
  }

  const filtered = testUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{testUsers.length} test user{testUsers.length !== 1 ? 's' : ''} — excluded from all syncs</p>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">{search ? 'No matching users' : 'No test users'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{u.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{u.email}</td>
                  <td className="py-3 px-4">
                    {u.is_test_user ? (
                      <Badge label="Test User" color="amber" />
                    ) : (
                      <Badge label="Pattern Match" color="gray" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggle(u.user_id, u.is_test_user)}
                      disabled={togglingId === u.user_id}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                        u.is_test_user
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {togglingId === u.user_id
                        ? 'Updating...'
                        : u.is_test_user
                          ? 'Unmark'
                          : 'Mark as Test'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── YouTube Helpers ─────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

// ─── Email Template Builder ──────────────────────────────
function buildEmailHtml(content: {
  heading: string
  body: string
  imageUrl: string
  youtubeUrl: string
  youtubePosition: 'above' | 'below'
  ctaText: string
  ctaUrl: string
}) {
  const paragraphs = content.body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')

  const imageBlock = content.imageUrl
    ? `<img src="${content.imageUrl}" alt="" style="width:100%;max-width:536px;border-radius:8px;margin:0 0 24px 0;" />`
    : ''

  // YouTube thumbnail with play button overlay (email-client safe: no position/flex)
  let youtubeBlock = ''
  if (content.youtubeUrl) {
    const videoId = extractYouTubeId(content.youtubeUrl)
    if (videoId) {
      const thumbnail = getYouTubeThumbnail(videoId)
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
      youtubeBlock = `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;width:100%;max-width:536px;">
          <tr>
            <td align="center" background="${thumbnail}" style="background-image:url('${thumbnail}');background-size:cover;background-position:center;border-radius:8px;height:300px;" valign="middle">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:536px;height:300px;">
              <v:fill type="frame" src="${thumbnail}" />
              <v:textbox inset="0,0,0,0">
              <![endif]-->
              <a href="${watchUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_play_button_icon_%282013%E2%80%932017%29.svg" alt="Play video" width="68" height="48" style="border:0;display:block;" />
              </a>
              <!--[if gte mso 9]>
              </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>
          <tr>
            <td style="padding-top:4px;">
              <a href="${watchUrl}" target="_blank" style="color:#6366F1;font-size:13px;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">▶ Watch on YouTube</a>
            </td>
          </tr>
        </table>`
    }
  }

  const ctaBlock = content.ctaText && content.ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background-color:#6366F1;border-radius:8px;">
            <a href="${content.ctaUrl}" target="_blank" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:16px;font-weight:500;text-decoration:none;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${content.ctaText}</a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="background-color:#FAFAFA;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 20px;margin:0;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;max-width:600px;margin:0 auto;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="padding:32px 32px 24px;border-bottom:2px solid #6366F1;text-align:center;">
        <span style="font-size:32px;font-weight:700;color:#6366F1;">Ferdy</span>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding:32px;">
        ${content.heading ? `<h1 style="color:#0A0A0A;font-size:24px;font-weight:700;line-height:1.3;margin:0 0 20px 0;">${content.heading}</h1>` : ''}
        ${imageBlock}
        ${content.youtubePosition === 'above' ? youtubeBlock : ''}
        ${paragraphs}
        ${content.youtubePosition === 'below' ? youtubeBlock : ''}
        ${ctaBlock}

        <!-- Sign-off -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0 0;border-top:1px solid #E5E7EB;padding-top:24px;width:100%;">
          <tr>
            <td style="vertical-align:top;padding-right:16px;width:80px;">
              <img src="https://www.ferdy.io/images/andrew-headshot.jpg" alt="Andrew" width="80" height="80" style="border-radius:50%;display:block;width:80px;height:80px;object-fit:cover;" />
            </td>
            <td style="vertical-align:middle;border-left:2px solid #E5E7EB;padding-left:16px;">
              <p style="color:#374151;font-size:15px;line-height:1.3;margin:0;">Best wishes,</p>
              <p style="color:#0A0A0A;font-size:16px;font-weight:700;line-height:1.3;margin:4px 0 2px 0;">Andrew Ferdinando</p>
              <p style="color:#6B7280;font-size:13px;line-height:1.3;margin:0 0 2px 0;">Founder of Ferdy</p>
              <p style="color:#6B7280;font-size:12px;line-height:1.3;margin:0 0 10px 0;">e: <a href="mailto:andrew@ferdy.io" style="color:#6366F1;text-decoration:none;">andrew@ferdy.io</a>&nbsp;&nbsp;|&nbsp;&nbsp;w: <a href="https://www.ferdy.io" style="color:#6366F1;text-decoration:none;">www.ferdy.io</a></p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:6px;">
                    <a href="https://www.linkedin.com/in/andrewferdinando/" target="_blank" style="display:inline-block;width:28px;height:28px;background-color:#333333;border-radius:50%;text-align:center;line-height:28px;text-decoration:none;color:#ffffff;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">in</a>
                  </td>
                  <td style="padding-right:6px;">
                    <a href="https://www.facebook.com/andrewjferdinando" target="_blank" style="display:inline-block;width:28px;height:28px;background-color:#333333;border-radius:50%;text-align:center;line-height:28px;text-decoration:none;color:#ffffff;font-size:15px;font-weight:700;font-family:Arial,sans-serif;">f</a>
                  </td>
                  <td>
                    <a href="https://www.instagram.com/ferdyinnz/" target="_blank" style="display:inline-block;width:28px;height:28px;background-color:#333333;border-radius:50%;text-align:center;line-height:28px;text-decoration:none;color:#ffffff;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">ig</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="border-top:1px solid #E5E7EB;padding:24px 32px;text-align:center;">
        <p style="color:#6B7280;font-size:14px;line-height:1.5;margin:4px 0;">&copy; ${new Date().getFullYear()} Ferdy. All rights reserved.</p>
        <p style="color:#6B7280;font-size:14px;line-height:1.5;margin:4px 0;">Questions? Contact us at <a href="mailto:andrew@ferdy.io" style="color:#6366F1;text-decoration:none;">andrew@ferdy.io</a></p>
        <p style="color:#9CA3AF;font-size:12px;line-height:1.5;margin:12px 0 0 0;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a> from future emails</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Broadcast Tab ───────────────────────────────────────
function BroadcastTab() {
  const [subject, setSubject] = useState('')
  const [heading, setHeading] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubePosition, setYoutubePosition] = useState<'above' | 'below'>('below')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const html = buildEmailHtml({ heading, body, imageUrl, youtubeUrl, youtubePosition, ctaText, ctaUrl })
  const hasContent = subject.trim() && (heading.trim() || body.trim())

  function toggleAudience(audience: string) {
    setSelectedAudiences(prev =>
      prev.includes(audience) ? prev.filter(a => a !== audience) : [...prev, audience]
    )
  }

  async function handleSendTest() {
    if (!testEmail) return

    setSendingTest(true)
    setResult(null)

    const data = await apiFetch('/api/newsletter/broadcast', {
      method: 'POST',
      body: JSON.stringify({ testEmail, subject, html }),
    })

    setSendingTest(false)

    if (data.error) {
      setResult({ success: false, message: data.error })
    } else {
      setResult({ success: true, message: `Test email sent to ${testEmail}. Check your inbox!` })
    }
  }

  async function handleSend() {
    if (!confirm(`Send this broadcast to ${selectedAudiences.join(' and ')}? This cannot be undone.`)) return

    setSending(true)
    setResult(null)

    const data = await apiFetch('/api/newsletter/broadcast', {
      method: 'POST',
      body: JSON.stringify({ audiences: selectedAudiences, subject, html }),
    })

    setSending(false)

    if (data.error) {
      setResult({ success: false, message: data.error })
    } else {
      setResult({ success: true, message: `Broadcast sent to ${selectedAudiences.join(' and ')}!` })
      setSubject('')
      setHeading('')
      setBody('')
      setImageUrl('')
      setYoutubeUrl('')
      setYoutubePosition('below')
      setCtaText('')
      setCtaUrl('')
      setSelectedAudiences([])
      setShowPreview(false)
    }
  }

  return (
    <div>
      {result && (
        <div className={`mb-4 p-3 border rounded-lg text-sm ${
          result.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Content Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. What's new at Ferdy this month"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
            <input
              type="text"
              value={heading}
              onChange={e => setHeading(e.target.value)}
              placeholder="e.g. Big updates are here"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <p className="text-xs text-gray-400 mb-1">Separate paragraphs with a blank line. Use merge fields for personalisation.</p>
            <textarea
              id="broadcast-body"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your newsletter content here..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-400">Insert:</span>
              {[
                { label: 'First Name', tag: '{{first_name}}' },
                { label: 'Last Name', tag: '{{last_name}}' },
                { label: 'Email', tag: '{{email}}' },
              ].map(field => (
                <button
                  key={field.tag}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('broadcast-body') as HTMLTextAreaElement | null
                    if (el) {
                      const start = el.selectionStart
                      const end = el.selectionEnd
                      const newVal = body.slice(0, start) + field.tag + body.slice(end)
                      setBody(newVal)
                      setTimeout(() => {
                        el.focus()
                        el.selectionStart = el.selectionEnd = start + field.tag.length
                      }, 0)
                    } else {
                      setBody(prev => prev + field.tag)
                    }
                  }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-mono rounded border border-gray-200 transition-colors"
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video <span className="text-gray-400 font-normal">(optional)</span></label>
            <p className="text-xs text-gray-400 mb-1">Paste a YouTube link to show a clickable thumbnail with play button.</p>
            <input
              type="url"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
            {youtubeUrl && !extractYouTubeId(youtubeUrl) && (
              <p className="text-xs text-red-500 mt-1">Could not detect a valid YouTube URL.</p>
            )}
            {youtubeUrl && extractYouTubeId(youtubeUrl) && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">Position:</span>
                {(['above', 'below'] as const).map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setYoutubePosition(pos)}
                    className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                      youtubePosition === pos
                        ? 'bg-[#6366F1] text-white border-[#6366F1]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {pos === 'above' ? 'Above body' : 'Below body'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="e.g. Learn More"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
              <input
                type="url"
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            </div>
          </div>

          {/* Send Test Email */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Send Test Email</label>
            <p className="text-xs text-gray-500 mb-3">Send a test to yourself before broadcasting. Subject will be prefixed with [TEST].</p>
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
              <button
                onClick={handleSendTest}
                disabled={!hasContent || !testEmail.trim() || sendingTest}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {sendingTest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
                    Sending...
                  </>
                ) : (
                  'Send Test'
                )}
              </button>
            </div>
          </div>

          {/* Audience Selection + Send */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Send to Audience</label>
            <div className="flex gap-3 mb-4">
              {[
                { id: 'customers', label: 'Customers' },
                { id: 'non_customers', label: 'Non-customers' },
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => toggleAudience(a.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedAudiences.includes(a.id)
                      ? 'bg-[#6366F1] text-white border-[#6366F1]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={!hasContent || selectedAudiences.length === 0 || sending}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-lg hover:bg-[#5558E6] transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Email Preview</label>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-[#6366F1] hover:underline lg:hidden"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
            {hasContent ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-[#FAFAFA]">
                <iframe
                  srcDoc={html}
                  title="Email preview"
                  className="w-full border-0"
                  style={{ height: '600px' }}
                  sandbox=""
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center text-sm text-gray-400">
                Fill in the subject and content to see a live preview of your email.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Setup Banner ────────────────────────────────────────
function SetupBanner() {
  const [setting, setSetting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; audiences?: any } | null>(null)

  async function handleSetup() {
    setSetting(true)
    setResult(null)
    const data = await apiFetch('/api/newsletter/setup', { method: 'POST' })
    setSetting(false)

    if (data.error) {
      setResult({ success: false, message: data.error })
    } else {
      setResult({
        success: true,
        message: 'Audiences created! Add these IDs as environment variables in Vercel, then redeploy.',
        audiences: data.audiences,
      })
    }
  }

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Resend audiences not configured</p>
          <p className="text-sm text-amber-700 mt-1">
            Click below to create the Customers and Non-customers audiences in Resend.
            You&apos;ll then need to add the returned IDs as environment variables.
          </p>

          {result && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              result.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{result.message}</p>
              {result.audiences && (
                <div className="mt-2 font-mono text-xs space-y-1">
                  <p>RESEND_AUDIENCE_CUSTOMERS=<span className="select-all font-bold">{result.audiences.customers.id}</span></p>
                  <p>RESEND_AUDIENCE_NON_CUSTOMERS=<span className="select-all font-bold">{result.audiences.nonCustomers.id}</span></p>
                </div>
              )}
            </div>
          )}

          {!result?.success && (
            <button
              onClick={handleSetup}
              disabled={setting}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {setting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Creating audiences...
                </>
              ) : (
                'Create Resend Audiences'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function NewsletterContactsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('non_customers')
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    // Check if audiences are configured by trying to list customers
    apiFetch('/api/newsletter/customers').then(data => {
      if (data.error && data.error.includes('RESEND_AUDIENCE')) {
        setNeedsSetup(true)
      }
    })
  }, [])

  const tabs: { id: TabId; name: string }[] = [
    { id: 'non_customers', name: 'Non-customers' },
    { id: 'customers', name: 'Customers' },
    { id: 'test_users', name: 'Test Users' },
    { id: 'broadcast', name: 'Send Broadcast' },
  ]

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-10">
          <h1 className="text-2xl font-bold leading-[1.2] text-gray-950 sm:text-3xl lg:text-[32px]">
            Newsletter Contacts
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 sm:gap-8 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 border-b-2 font-medium transition-all duration-200 text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          {needsSetup && <SetupBanner />}
          {activeTab === 'non_customers' && <NonCustomersTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'test_users' && <TestUsersTab />}
          {activeTab === 'broadcast' && <BroadcastTab />}
        </div>
      </div>
    </AppLayout>
  )
}
