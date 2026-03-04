'use client'

import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase-browser'

interface PipelineRow {
  key: string
  brandId: string
  brandName: string
  subcategoryId: string | null
  subcategoryName: string
  scheduledFor: string
  scheduledForLocal: string
  status: 'draft' | 'approved_scheduled' | 'published' | 'needs_attention' | 'not_created'
  draftId: string | null
}

type SortKey = 'brandName' | 'subcategoryName' | 'scheduledFor' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG = {
  published: { label: 'Published', bg: 'bg-green-100', text: 'text-green-700' },
  approved_scheduled: { label: 'Approved & Scheduled', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  needs_attention: { label: 'Needs Attention', bg: 'bg-red-100', text: 'text-red-700' },
  not_created: { label: 'Not Created Yet', bg: 'bg-amber-100', text: 'text-amber-700' },
} as const

const STATUS_ORDER = ['needs_attention', 'not_created', 'draft', 'approved_scheduled', 'published'] as const

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDayLabel(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function PostPipelinePage() {
  const [rows, setRows] = useState<PipelineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date range defaults: -5 days to +10 days
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 5)
    return formatDateForInput(d)
  })
  const [toDate, setToDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 10)
    return formatDateForInput(d)
  })

  // Client-side filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('scheduledFor')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const params = new URLSearchParams({ from: fromDate, to: toDate })
        const res = await fetch(`/api/super-admin/post-pipeline?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error('Failed to load pipeline data')

        const data = await res.json()
        if (!cancelled) {
          setRows(data.rows ?? [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [fromDate, toDate])

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = rows

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((r) => r.brandName.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    return result
  }, [rows, search, statusFilter])

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'status') {
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      } else {
        const aVal = a[sortKey] ?? ''
        const bVal = b[sortKey] ?? ''
        cmp = aVal.localeCompare(bVal)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  // Summary counts
  const counts = useMemo(() => {
    const c = { published: 0, approved_scheduled: 0, draft: 0, needs_attention: 0, not_created: 0 }
    for (const row of filtered) {
      c[row.status]++
    }
    return c
  }, [filtered])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function renderSortIndicator(key: SortKey) {
    if (sortKey !== key) return null
    return <span className="text-[10px] ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  // Build rows with day separators
  const tableRows: Array<{ type: 'separator'; label: string } | { type: 'data'; row: PipelineRow }> =
    useMemo(() => {
      const result: Array<{ type: 'separator'; label: string } | { type: 'data'; row: PipelineRow }> = []
      let lastDay = ''

      for (const row of sorted) {
        const day = row.scheduledFor.slice(0, 10)
        if (day !== lastDay) {
          result.push({ type: 'separator', label: getDayLabel(row.scheduledFor) })
          lastDay = day
        }
        result.push({ type: 'data', row })
      }

      return result
    }, [sorted])

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-10">
          <h1 className="text-2xl font-bold leading-[1.2] text-gray-950 sm:text-3xl lg:text-[32px]">
            Post Pipeline
          </h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-10">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
            <SummaryCard
              label="Published"
              count={counts.published}
              bg="bg-green-50"
              border="border-green-200"
              text="text-green-700"
            />
            <SummaryCard
              label="Approved & Scheduled"
              count={counts.approved_scheduled}
              bg="bg-indigo-50"
              border="border-indigo-200"
              text="text-indigo-700"
            />
            <SummaryCard
              label="Drafts"
              count={counts.draft + counts.not_created}
              bg="bg-gray-50"
              border="border-gray-200"
              text="text-gray-700"
            />
            <SummaryCard
              label="Needs Attention"
              count={counts.needs_attention}
              bg="bg-red-50"
              border="border-red-200"
              text="text-red-700"
            />
          </div>

          {/* Filter Bar */}
          <div className="sticky top-0 z-10 bg-white rounded-lg border border-gray-200 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            <input
              type="text"
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] w-48"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
            >
              <option value="all">Status: All</option>
              <option value="published">Published</option>
              <option value="approved_scheduled">Approved & Scheduled</option>
              <option value="draft">Draft</option>
              <option value="needs_attention">Needs Attention</option>
              <option value="not_created">Not Created Yet</option>
            </select>

            <span className="text-sm text-gray-500 ml-auto">
              {filtered.length} row{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-600">{error}</div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              No posts found for this date range
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('brandName')}
                    >
                      Brand{renderSortIndicator('brandName')}
                    </th>
                    <th
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('subcategoryName')}
                    >
                      Category{renderSortIndicator('subcategoryName')}
                    </th>
                    <th
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('scheduledFor')}
                    >
                      Date{renderSortIndicator('scheduledFor')}
                    </th>
                    <th
                      className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900"
                      onClick={() => handleSort('status')}
                    >
                      Status{renderSortIndicator('status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((item, idx) => {
                    if (item.type === 'separator') {
                      return (
                        <tr key={`sep-${idx}`} className="bg-gray-50">
                          <td
                            colSpan={4}
                            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {item.label}
                          </td>
                        </tr>
                      )
                    }

                    const { row } = item
                    const cfg = STATUS_CONFIG[row.status]

                    return (
                      <tr
                        key={row.key}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-gray-900 font-medium">{row.brandName}</td>
                        <td className="px-4 py-2.5 text-gray-700">{row.subcategoryName}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {row.scheduledForLocal}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function SummaryCard({
  label,
  count,
  bg,
  border,
  text,
}: {
  label: string
  count: number
  bg: string
  border: string
  text: string
}) {
  return (
    <div className={`rounded-lg border ${border} ${bg} px-4 py-3`}>
      <div className={`text-2xl font-bold ${text}`}>{count}</div>
      <div className="text-xs text-gray-600 mt-0.5">{label}</div>
    </div>
  )
}
