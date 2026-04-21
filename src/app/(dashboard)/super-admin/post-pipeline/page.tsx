'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  cadence: string | null
  notCreatedReason: 'setup_incomplete' | 'outside_window' | 'pending_generation' | 'deleted_by_user' | null
}

interface CronDaySummary {
  date: string
  dateLabel: string
  generation: {
    ran: boolean
    status: 'success' | 'failed' | null
    startedAt: string | null
    summary: Record<string, unknown> | null
    error: string | null
  }
  publishing: {
    fired: number
    failed: number
    published: number
  }
}

type SortKey = 'brandName' | 'subcategoryName' | 'scheduledFor' | 'status'
type SortDir = 'asc' | 'desc'
type TabId = 'pipeline' | 'cron'

const STATUS_CONFIG = {
  published: { label: 'Published', bg: 'bg-green-100', text: 'text-green-700' },
  approved_scheduled: { label: 'Approved & Scheduled', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  needs_attention: { label: 'Needs Attention', bg: 'bg-red-100', text: 'text-red-700' },
  not_created: { label: 'Not Created Yet', bg: 'bg-amber-100', text: 'text-amber-700' },
} as const

const NOT_CREATED_REASONS = {
  setup_incomplete: '(Setup incomplete)',
  outside_window: '(Outside 30-day window)',
  pending_generation: '(Pending generation)',
  deleted_by_user: '(Deleted by user)',
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
  const [activeTab, setActiveTab] = useState<TabId>('pipeline')
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
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null) // Exact brand name from dropdown
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Brand search autocomplete
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const brandSearchRef = useRef<HTMLDivElement>(null)

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('scheduledFor')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // CRON Jobs tab state
  const [cronDays, setCronDays] = useState<CronDaySummary[]>([])
  const [cronLoading, setCronLoading] = useState(false)
  const [cronError, setCronError] = useState<string | null>(null)

  // Close brand dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (brandSearchRef.current && !brandSearchRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch pipeline data
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

  // Fetch cron logs when switching to cron tab
  useEffect(() => {
    if (activeTab !== 'cron') return
    let cancelled = false

    async function fetchCronLogs() {
      try {
        setCronLoading(true)
        setCronError(null)
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          setCronError('Not authenticated')
          setCronLoading(false)
          return
        }

        const res = await fetch('/api/super-admin/cron-logs?days=14', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error('Failed to load cron logs')

        const data = await res.json()
        if (!cancelled) {
          setCronDays(data.days ?? [])
          setCronLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setCronError(err instanceof Error ? err.message : 'Unknown error')
          setCronLoading(false)
        }
      }
    }

    fetchCronLogs()
    return () => {
      cancelled = true
    }
  }, [activeTab])

  // Unique brand names for autocomplete
  const brandNames = useMemo(() => {
    const names = new Set(rows.map((r) => r.brandName))
    return Array.from(names).sort()
  }, [rows])

  const filteredBrands = useMemo(() => {
    if (!search) return brandNames.slice(0, 10)
    const q = search.toLowerCase()
    return brandNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 10)
  }, [brandNames, search])

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = rows

    if (selectedBrand) {
      // Exact match when a brand was picked from dropdown
      result = result.filter((r) => r.brandName === selectedBrand)
    } else if (search) {
      const q = search.toLowerCase()
      result = result.filter((r) => r.brandName.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    return result
  }, [rows, search, selectedBrand, statusFilter])

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

  // Summary counts (from all rows, not filtered)
  const counts = useMemo(() => {
    const c = { published: 0, approved_scheduled: 0, draft: 0, needs_attention: 0, not_created: 0 }
    for (const row of rows) {
      c[row.status]++
    }
    return c
  }, [rows])

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

  function handleCardClick(filterValue: string) {
    if (statusFilter === filterValue) {
      setStatusFilter('all')
    } else {
      setStatusFilter(filterValue)
    }
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

  const tabs: { id: TabId; name: string }[] = [
    { id: 'pipeline', name: 'Pipeline' },
    { id: 'cron', name: 'CRON Jobs' },
  ]

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-10">
          <h1 className="text-2xl font-bold leading-[1.2] text-gray-950 sm:text-3xl lg:text-[32px]">
            Post Pipeline
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

        {activeTab === 'pipeline' ? (
          <div className="p-4 sm:p-6 lg:p-10">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
              <SummaryCard
                label="Published"
                count={counts.published}
                bg="bg-green-50"
                border="border-green-200"
                text="text-green-700"
                active={statusFilter === 'published'}
                onClick={() => handleCardClick('published')}
              />
              <SummaryCard
                label="Approved & Scheduled"
                count={counts.approved_scheduled}
                bg="bg-indigo-50"
                border="border-indigo-200"
                text="text-indigo-700"
                active={statusFilter === 'approved_scheduled'}
                onClick={() => handleCardClick('approved_scheduled')}
              />
              <SummaryCard
                label="Drafts"
                count={counts.draft}
                bg="bg-gray-50"
                border="border-gray-200"
                text="text-gray-700"
                active={statusFilter === 'draft'}
                onClick={() => handleCardClick('draft')}
              />
              <SummaryCard
                label="Needs Attention"
                count={counts.needs_attention}
                bg="bg-red-50"
                border="border-red-200"
                text="text-red-700"
                active={statusFilter === 'needs_attention'}
                onClick={() => handleCardClick('needs_attention')}
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

              {/* Brand search with autocomplete */}
              <div className="relative" ref={brandSearchRef}>
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setSelectedBrand(null) // Clear exact match when user types
                    setShowBrandDropdown(true)
                  }}
                  onFocus={() => setShowBrandDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowBrandDropdown(false)
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] w-48"
                />
                {showBrandDropdown && filteredBrands.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20">
                    {filteredBrands.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 truncate"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSearch(name)
                          setSelectedBrand(name)
                          setShowBrandDropdown(false)
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
              <div key={`table-${selectedBrand ?? ''}-${search}-${statusFilter}`} className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
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
                      <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
                        Cadence
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
                              colSpan={5}
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
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {row.cadence ?? '-'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            {row.scheduledForLocal}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                            {row.status === 'not_created' && row.notCreatedReason && (
                              <span className="block text-[10px] text-amber-600 mt-0.5">
                                {NOT_CREATED_REASONS[row.notCreatedReason]}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* CRON Jobs Tab */
          <div className="p-4 sm:p-6 lg:p-10">
            {cronLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
            ) : cronError ? (
              <div className="flex items-center justify-center py-20 text-red-600">{cronError}</div>
            ) : cronDays.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                No cron logs found
              </div>
            ) : (
              <div className="space-y-3">
                {cronDays.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-lg border border-gray-200 bg-white px-5 py-4"
                  >
                    <div className="font-medium text-gray-900 mb-3">{day.dateLabel}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Draft Generation */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Draft Generation
                        </div>
                        {day.generation.ran ? (
                          <div className="flex items-center gap-2">
                            {day.generation.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-sm text-green-700">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm text-red-700">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Failed
                              </span>
                            )}
                            {day.generation.startedAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(day.generation.startedAt).toLocaleTimeString('en-NZ', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                            {day.generation.summary && (
                              <span className="text-xs text-gray-500">
                                ({(day.generation.summary as any).draftsCreated ?? 0} created
                                {typeof (day.generation.summary as any).draftsSkipped === 'number' && (
                                  <>, {(day.generation.summary as any).draftsSkipped} already existed</>
                                )})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-gray-300" />
                            No run
                          </span>
                        )}
                      </div>

                      {/* Publishing */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Publishing
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-700">
                            <span className="font-medium">{day.publishing.fired}</span>{' '}
                            <span className="text-gray-400">fired</span>
                          </span>
                          <span className={day.publishing.failed > 0 ? 'text-red-600' : 'text-gray-700'}>
                            <span className="font-medium">{day.publishing.failed}</span>{' '}
                            <span className="text-gray-400">failed</span>
                          </span>
                          <span className={day.publishing.published > 0 ? 'text-green-600' : 'text-gray-700'}>
                            <span className="font-medium">{day.publishing.published}</span>{' '}
                            <span className="text-gray-400">published</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
  active,
  onClick,
}: {
  label: string
  count: number
  bg: string
  border: string
  text: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border ${border} ${bg} px-4 py-3 text-left transition-all ${
        active ? 'ring-2 ring-[#6366F1] ring-offset-1' : ''
      } hover:opacity-80`}
    >
      <div className={`text-2xl font-bold ${text}`}>{count}</div>
      <div className="text-xs text-gray-600 mt-0.5">{label}</div>
    </button>
  )
}
