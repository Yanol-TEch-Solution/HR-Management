import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageSquare,
  Search,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react'
import GlobalSearchModal from '../../components/GlobalSearchModal'
import Topbar from './Topbar'
import ProfileMenu from './ProfileMenu'
import PunchWidget from './PunchWidget'
import { useMessaging } from '../context/messagingStore'

const EMPLOYER_SEARCH_ENTRIES = [
  {
    id: 'dashboard',
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [{ label: 'Dashboard', path: '/employer/dashboard' }],
  },
  {
    id: 'teams',
    section: 'Teams',
    icon: Users,
    items: [
      { label: 'Attendance', path: '/employer/attendance' },
      { label: 'Leave', path: '/employer/leave' },
    ],
  },
  {
    id: 'announcements',
    section: 'Company',
    icon: Megaphone,
    items: [{ label: 'Announcements', path: '/employer/announcements' }],
  },
  {
    id: 'finance',
    section: 'Finance',
    icon: BadgeDollarSign,
    items: [
      { label: 'Payroll', path: '/employer/payroll' },
      { label: 'Payment Slips', path: '/employer/payslips' },
    ],
  },
  {
    id: 'reports',
    section: 'Reports',
    icon: BarChart3,
    items: [{ label: 'Reports', path: '/employer/reports' }],
  },
  {
    id: 'messages',
    section: 'Messages',
    icon: MessageSquare,
    items: [{ label: 'Inbox', path: '/employer/inbox' }],
  },
  {
    id: 'system',
    section: 'System',
    icon: SettingsIcon,
    items: [{ label: 'Settings', path: '/employer/settings' }],
  },
]

function EmployerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { totalUnread } = useMessaging()
  const [isHovered, setIsHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)
  // Expandable sections in the sidebar
  const [expandedSections, setExpandedSections] = useState({
    teams: true,
    finance: true,
  })

  // ⌘F / ⌘K opens the global search modal, like the HR workspace
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'k')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const isRouteActive = (path) => {
    if (path === '/employer/dashboard' && (location.pathname === '/employer/dashboard' || location.pathname === '/employer' || location.pathname === '/employer/')) {
      return true
    }
    return location.pathname === path
  }

  const collapsed = !isHovered

  // Live filter for sidebar navigation, same behavior as the HR sidebar
  const query = searchQuery.trim().toLowerCase()
  const isSearching = query.length > 0
  const matches = (label) => label.toLowerCase().includes(query)

  const teamsItems = [
    { label: 'Attendance', path: '/employer/attendance' },
    { label: 'Leave', path: '/employer/leave' },
  ]
  const financeItems = [
    { label: 'Payroll', path: '/employer/payroll' },
    { label: 'Payslips', path: '/employer/payslips' },
  ]
  const visibleTeams = isSearching ? teamsItems.filter((i) => matches(i.label)) : teamsItems
  const visibleFinance = isSearching ? financeItems.filter((i) => matches(i.label)) : financeItems

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] dark:bg-[#0a0d10] text-gray-800 dark:text-gray-200 flex flex-col antialiased print:h-auto print:overflow-visible print:bg-white">
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden print:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#15181d] border-b border-gray-200 dark:border-[#262b31] sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black dark:bg-[#3a4149] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v6m0 6v6" />
                <path d="M3 12h6m6 0h6" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-gray-950 dark:text-gray-100 text-sm">Yanol-HR</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PunchWidget />
          <Link
            to="/employer/inbox"
            className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors"
            aria-label="Inbox"
          >
            <MessageSquare size={18} />
            {totalUnread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gray-500" />
            )}
          </Link>
          <ProfileMenu compact />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar with Hover Collapse/Expand Resizing */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-[#0d1014] border-r border-gray-200/80 dark:border-[#262b31]
            flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none print:hidden
            ${collapsed ? 'lg:w-[72px]' : 'lg:w-[250px]'}
            ${mobileOpen ? 'translate-x-0 w-[260px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Logo & Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 dark:border-[#262b31]">
            <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-200 ${collapsed ? 'justify-center w-full' : ''}`}>
              <img src="/logo.png" alt="Yanol-HR" className="w-8 h-8 rounded-lg object-contain shrink-0 shadow-xs" />
              {!collapsed && (
                <span className="font-extrabold tracking-tight text-gray-950 dark:text-gray-100 text-sm font-sans whitespace-nowrap">
                  Yanol-HR
                </span>
              )}
            </div>
          </div>

          {/* Quick Search */}
          {!collapsed ? (
            <div className="px-3 pt-3 pb-1">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white dark:bg-[#15181d] dark:hover:bg-[#1c2026] dark:focus:bg-gray-900 text-[13px] text-gray-800 dark:text-gray-200 rounded-lg border border-gray-200/70 dark:border-[#33383f] focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          ) : (
            <div className="px-3 pt-3 flex justify-center">
              <div className="p-2 text-gray-400 rounded-lg" title="Hover to expand">
                <Search size={16} />
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm custom-scrollbar overflow-x-hidden">
            {/* Dashboard Item */}
            {(!isSearching || matches('Dashboard')) && (
            <Link
              to="/employer/dashboard"
              className={`relative flex items-center gap-3 border-l-[3px] px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isRouteActive('/employer/dashboard') && !location.pathname.includes('/employee')
                  ? 'border-gray-950 bg-gray-100 text-gray-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#1c2026]'
              }`}
              title={collapsed ? 'Dashboard' : undefined}
            >
              <LayoutDashboard size={18} className="shrink-0 text-gray-500" />
              {!collapsed && <span>Dashboard</span>}
            </Link>
            )}

            {/* Announcements Item */}
            {(!isSearching || matches('Announcements')) && (
            <Link
              to="/employer/announcements"
              className={`relative flex items-center gap-3 border-l-[3px] px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isRouteActive('/employer/announcements')
                  ? 'border-gray-950 bg-gray-100 text-gray-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#1c2026]'
              }`}
              title={collapsed ? 'Announcements' : undefined}
            >
              <Megaphone size={18} className="shrink-0 text-[#0092B8] dark:text-cyan-400" />
              {!collapsed && <span>Announcements</span>}
            </Link>
            )}

            {/* Teams Section (Expandable) */}
            {(!isSearching || visibleTeams.length > 0) && (
            <div className="pt-1">
              <button
                onClick={() => !collapsed && toggleSection('teams')}
                className={`w-full flex items-center justify-between border-l-[3px] px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center' : ''
                } ${
                  collapsed && (isRouteActive('/employer/attendance') ||
                    isRouteActive('/employer/leave'))
                    ? 'border-gray-950 bg-gray-100/70 text-gray-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                    : 'border-transparent text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="shrink-0 text-gray-500" />
                  {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100">Teams</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${
                      expandedSections.teams ? '' : '-rotate-90'
                    }`}
                  />
                )}
              </button>

              {/* Sub items under Teams */}
              {(!collapsed && (isSearching || expandedSections.teams)) && (
                <div className="pl-4 pr-1 mt-0.5 space-y-0.5 whitespace-nowrap">
                  {visibleTeams.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex items-center border-l-[3px] px-3 py-1.5 text-[13px] transition-colors ${
                        isRouteActive(item.path)
                          ? 'border-gray-950 bg-gray-50/60 font-semibold text-gray-950 dark:border-white dark:bg-[#1c2026] dark:text-white'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Finance Section (Expandable) */}
            {(!isSearching || visibleFinance.length > 0) && (
            <div className="pt-1">
              <button
                onClick={() => !collapsed && toggleSection('finance')}
                className={`w-full flex items-center justify-between border-l-[3px] px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center' : ''
                } ${
                  collapsed && (isRouteActive('/employer/payroll') ||
                    isRouteActive('/employer/payslips'))
                    ? 'border-gray-950 bg-gray-100/70 text-gray-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                    : 'border-transparent text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BadgeDollarSign size={18} className="shrink-0 text-gray-500" />
                  {!collapsed && <span className="font-semibold text-gray-900 dark:text-gray-100">Finance</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${
                      isSearching || expandedSections.finance ? '' : '-rotate-90'
                    }`}
                  />
                )}
              </button>

              {(!collapsed && (isSearching || expandedSections.finance)) && (
                <div className="pl-4 pr-1 mt-0.5 space-y-0.5 whitespace-nowrap">
                  {visibleFinance.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex items-center border-l-[3px] px-3 py-1.5 text-[13px] transition-colors ${
                        isRouteActive(item.path)
                          ? 'border-gray-950 bg-gray-50/60 font-semibold text-gray-950 dark:border-white dark:bg-[#1c2026] dark:text-white'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1c2026]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Bottom utility navigation */}
            {(!isSearching || matches('Reports')) && (
              <div className="pt-6 space-y-1 border-t border-gray-100 dark:border-[#262b31]">
                <Link
                  to="/employer/reports"
                  className={`relative flex items-center gap-3 border-l-[3px] px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isRouteActive('/employer/reports')
                      ? 'border-gray-950 bg-gray-100 text-gray-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-[#1c2026]'
                  }`}
                  title={collapsed ? 'Reports' : undefined}
                >
                  <BarChart3 size={18} className="shrink-0 text-gray-500" />
                  {!collapsed && <span>Reports</span>}
                </Link>
              </div>
            )}
          </div>

          {/* Bottom Settings button */}
          <div className="p-3 border-t border-gray-100 dark:border-[#262b31]">
            <Link
              to="/employer/settings"
              className={`w-full flex items-center gap-3 border-l-[3px] px-3 py-2 transition-all ${
                isRouteActive('/employer/settings')
                  ? 'border-gray-950 bg-gray-100 text-gray-950 font-semibold dark:border-white dark:bg-[#1c2026] dark:text-white'
                  : 'border-transparent text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#1c2026] font-medium'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? 'Settings' : undefined}
            >
              <SettingsIcon size={18} className="shrink-0" />
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-sm">Settings</span>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase font-semibold">You</span>
                </div>
              )}
            </Link>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#f4f5f7] dark:bg-[#0a0d10] print:overflow-visible print:bg-white print:h-auto print:p-0">
          <div className="print:hidden">
            <Topbar />
          </div>
          <Outlet />
        </main>
      </div>

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={() => setMobileOpen(false)}
        entries={EMPLOYER_SEARCH_ENTRIES}
      />
    </div>
  )
}

export default EmployerLayout
