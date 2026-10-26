import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Megaphone,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  User,
  X,
  Filter,
  Sparkles,
  ArrowUpRight,
  Clock,
  ShieldAlert,
  Radio,
  Layers,
  CheckCheck,
} from 'lucide-react'
import { authHeaders } from '../../lib/hrApi'
import { getSocket } from '../../lib/socket'

const CATEGORIES = ['All', 'General', 'People & Culture', 'Operations', 'Benefits', 'Events']
const PRIORITIES = ['All', 'Urgent', 'Important', 'Normal']

const PRIORITY_THEMES = {
  Urgent: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    dot: 'bg-rose-500 animate-pulse',
    border: 'border-l-4 border-l-rose-500',
    cardGlow: 'hover:shadow-rose-500/10',
    icon: ShieldAlert,
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  Important: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
    dot: 'bg-amber-500',
    border: 'border-l-4 border-l-amber-500',
    cardGlow: 'hover:shadow-amber-500/10',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  Normal: {
    badge: 'bg-cyan-50 text-[#007a99] border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/60',
    dot: 'bg-cyan-500',
    border: 'border-l-4 border-l-cyan-500',
    cardGlow: 'hover:shadow-cyan-500/10',
    icon: Info,
    iconColor: 'text-[#0092B8] dark:text-cyan-400',
  },
}

function formatDate(value) {
  if (!value) return 'Recent'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getRelativeTime(value) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [activeModal, setActiveModal] = useState(null)
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('yanol-read-announcements') || '[]'))
    } catch {
      return new Set()
    }
  })
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const [highlightedId, setHighlightedId] = useState(null)

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await fetch('/api/announcements', {
        headers: authHeaders(),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || 'Unable to load announcements.')
      }
      setAnnouncements(Array.isArray(data) ? data : data.announcements || [])
      setError('')
    } catch (err) {
      console.error('Fetch announcements error:', err)
      setError(err.message || 'Unable to connect to announcements feed.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()

    let socket
    try {
      socket = getSocket()
      if (socket) {
        setIsLiveConnected(socket.connected)
        const onConnect = () => setIsLiveConnected(true)
        const onDisconnect = () => setIsLiveConnected(false)

        const handleNewAnnouncement = (newAnnouncement) => {
          if (!newAnnouncement?.id) return
          setAnnouncements((current) => {
            const filtered = current.filter((item) => item.id !== newAnnouncement.id)
            return [newAnnouncement, ...filtered]
          })
          setHighlightedId(newAnnouncement.id)
          setTimeout(() => setHighlightedId(null), 6000)
        }

        const handleDeleteAnnouncement = ({ id }) => {
          if (!id) return
          setAnnouncements((current) => current.filter((item) => item.id !== id))
        }

        socket.on('connect', onConnect)
        socket.on('disconnect', onDisconnect)
        socket.on('announcement:new', handleNewAnnouncement)
        socket.on('announcement:deleted', handleDeleteAnnouncement)

        return () => {
          socket.off('connect', onConnect)
          socket.off('disconnect', onDisconnect)
          socket.off('announcement:new', handleNewAnnouncement)
          socket.off('announcement:deleted', handleDeleteAnnouncement)
        }
      }
    } catch (socketError) {
      console.warn('Socket connection error in announcements:', socketError)
    }
  }, [fetchAnnouncements])

  const markAsRead = useCallback((id) => {
    if (!id) return
    setReadIds((prev) => {
      const updated = new Set(prev)
      updated.add(String(id))
      try {
        localStorage.setItem('yanol-read-announcements', JSON.stringify([...updated]))
      } catch {}
      return updated
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    const allIds = new Set(announcements.map((a) => String(a.id)))
    setReadIds(allIds)
    try {
      localStorage.setItem('yanol-read-announcements', JSON.stringify([...allIds]))
    } catch {}
  }, [announcements])

  const handleCardClick = (announcement) => {
    markAsRead(announcement.id)
    setActiveModal(announcement)
  }

  // Filter & Search Logic
  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase()
    return announcements.filter((item) => {
      const matchesSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.author?.name?.toLowerCase().includes(query)

      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
      const matchesPriority = selectedPriority === 'All' || item.priority === selectedPriority

      return matchesSearch && matchesCat && matchesPriority
    })
  }, [announcements, search, selectedCategory, selectedPriority])

  const stats = useMemo(() => {
    const total = announcements.length
    const unread = announcements.filter((a) => !readIds.has(String(a.id))).length
    const urgent = announcements.filter((a) => a.priority === 'Urgent').length
    const important = announcements.filter((a) => a.priority === 'Important').length
    return { total, unread, urgent, important }
  }, [announcements, readIds])

  const urgentBroadcast = useMemo(() => {
    return announcements.find((a) => a.priority === 'Urgent')
  }, [announcements])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. PAGE HEADER & LIVE STATUS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-[#0092B8] dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/60 shadow-xs">
              <Megaphone size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Company Announcements
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Feed
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Direct updates, policy changes, and organization broadcasts published by HR Administration.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action: Mark all read */}
        {stats.unread > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] shadow-2xs hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-all cursor-pointer"
          >
            <CheckCheck size={14} className="text-[#0092B8]" />
            <span>Mark all as read ({stats.unread})</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC STATS TILES
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/80 dark:border-[#262b31] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Updates</span>
            <Layers size={16} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">
            {stats.total}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Published announcements</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/80 dark:border-[#262b31] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Unread</span>
            <Bell size={16} className="text-[#0092B8]" />
          </div>
          <p className="text-2xl font-bold text-[#0092B8] dark:text-cyan-400 mt-2 tabular-nums">
            {stats.unread}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">New since last review</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/80 dark:border-[#262b31] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Urgent</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2 tabular-nums">
            {stats.urgent}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Critical priority</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/80 dark:border-[#262b31] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Important</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {stats.important}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">High priority notices</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. FEATURED URGENT BROADCAST BANNER (IF PRESENT)
         ───────────────────────────────────────────────────────────── */}
      {urgentBroadcast && (
        <div
          onClick={() => handleCardClick(urgentBroadcast)}
          className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border border-rose-200 dark:border-rose-900/60 cursor-pointer shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5 min-w-0">
              <span className="p-2.5 rounded-xl bg-rose-500 text-white shadow-sm shrink-0 mt-0.5">
                <ShieldAlert size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200">
                    Urgent Notice
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(urgentBroadcast.createdAt)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-950 dark:text-white mt-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {urgentBroadcast.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 max-w-3xl">
                  {urgentBroadcast.content}
                </p>
              </div>
            </div>

            <div className="self-end sm:self-center shrink-0 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
              <span>Read notice</span>
              <ArrowUpRight size={15} />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SEARCH & FILTER CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/80 dark:border-[#262b31] shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search announcements by keyword, topic, or sender…"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1c2026] text-xs sm:text-sm text-gray-900 dark:text-gray-100 rounded-xl border border-gray-200 dark:border-[#33383f] focus:outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100 transition-all placeholder:text-gray-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mr-1 flex items-center gap-1">
              <Filter size={12} /> Priority:
            </span>
            {PRIORITIES.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setSelectedPriority(priority)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedPriority === priority
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1c2026]'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 border-t border-gray-100 dark:border-[#262b31]/70">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 mr-1 shrink-0">
            Category:
          </span>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === category
                  ? 'bg-cyan-50 text-[#007a99] border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1c2026] border border-transparent'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. FEED OF ANNOUNCEMENTS
         ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200 dark:border-[#262b31]">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-3">Loading company announcements…</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
          <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{error}</p>
          <button
            type="button"
            onClick={fetchAnnouncements}
            className="mt-3 px-4 py-2 bg-white dark:bg-[#15181d] border border-rose-200 text-xs font-bold rounded-xl text-rose-700 hover:bg-rose-50 transition"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-[#15181d] rounded-3xl border border-gray-200/80 dark:border-[#262b31] shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 dark:bg-[#1c2026] text-gray-400 flex items-center justify-center">
            <Megaphone size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3.5">
            No announcements found
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
            {search || selectedCategory !== 'All' || selectedPriority !== 'All'
              ? 'No announcements match your search or filter criteria. Try clearing filters.'
              : 'You are all caught up! There are currently no active announcements from HR Administration.'}
          </p>
          {(search || selectedCategory !== 'All' || selectedPriority !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedCategory('All')
                setSelectedPriority('All')
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1c2026] hover:bg-gray-200 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((item) => {
            const isRead = readIds.has(String(item.id))
            const priorityTheme = PRIORITY_THEMES[item.priority] || PRIORITY_THEMES.Normal
            const isHighlighted = highlightedId === item.id

            return (
              <article
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#15181d] border border-gray-200/80 dark:border-[#262b31] shadow-2xs hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  priorityTheme.border
                } ${isHighlighted ? 'ring-2 ring-cyan-500 bg-cyan-50/20' : ''}`}
              >
                <div>
                  {/* Top bar: Category + Priority badge + Unread dot + Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-[#1c2026] text-gray-700 dark:text-gray-300">
                        {item.category || 'General'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityTheme.badge}`}>
                        {item.priority || 'Normal'}
                      </span>
                      {!isRead && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0092B8] dark:text-cyan-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0092B8]" />
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
                      {getRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#0092B8] dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {item.title}
                  </h2>

                  {/* Content snippet */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed line-clamp-3">
                    {item.content}
                  </p>
                </div>

                {/* Footer: Author & Read full button */}
                <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-[#262b31] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-[#0092B8] dark:text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {item.author?.name ? item.author.name[0].toUpperCase() : 'H'}
                    </div>
                    <span className="truncate font-semibold text-gray-700 dark:text-gray-300">
                      {item.author?.name || 'HR Administration'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-[#0092B8] dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                    Read notice <ArrowUpRight size={13} />
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. FULL ANNOUNCEMENT DETAIL MODAL
         ───────────────────────────────────────────────────────────── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}
        >
          <div className="w-full max-w-2xl bg-white dark:bg-[#15181d] rounded-3xl border border-gray-200 dark:border-[#262b31] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#262b31] flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-[#1c2026] text-gray-700 dark:text-gray-300">
                    {activeModal.category || 'General'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      (PRIORITY_THEMES[activeModal.priority] || PRIORITY_THEMES.Normal).badge
                    }`}
                  >
                    {activeModal.priority || 'Normal'}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(activeModal.createdAt)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug">
                  {activeModal.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-[#1c2026] dark:hover:text-gray-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Full announcement text */}
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-line font-sans">
                {activeModal.content}
              </div>
            </div>

            {/* Modal Footer: Author + Close button */}
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-[#262b31] bg-gray-50/50 dark:bg-[#181c22]/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950 text-[#0092B8] dark:text-cyan-300 flex items-center justify-center font-bold text-xs">
                  {activeModal.author?.name ? activeModal.author.name[0].toUpperCase() : 'H'}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {activeModal.author?.name || 'HR Administration'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Official Issuer
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition shadow-xs cursor-pointer"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
