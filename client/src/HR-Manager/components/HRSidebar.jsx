import { useEffect, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Megaphone,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

/**
 * Navigation, each entry naming the permission that makes it reachable.
 *
 * A link is hidden when the account does not hold the permission, and the route
 * behind it is guarded by the same permission on both the client and the
 * server. Hiding it is a courtesy that stops somebody opening a screen full of
 * buttons that would all fail; the 403 is what actually stops them.
 *
 * The dashboard aggregates every module, so it asks for any one of them rather
 * than a permission of its own.
 */
const navigation = [
  {
    label: 'Dashboard',
    path: '/hr-manager',
    icon: LayoutDashboard,
    end: true,
    anyOf: [
      'employees.view',
      'attendance.view',
      'leave.view',
      'payroll.view',
      'payment_slips.view',
      'reports.view',
      'users.view',
    ],
  },
  {
    label: 'Employees',
    path: '/hr-manager/employees',
    icon: Users,
    permission: 'employees.view',
  },
  {
    label: 'Attendance',
    path: '/hr-manager/attendance',
    icon: CalendarDays,
    permission: 'attendance.view',
  },
  {
    label: 'Leave Management',
    path: '/hr-manager/leave',
    icon: ClipboardList,
    permission: 'leave.view',
  },
  {
    label: 'Payroll',
    path: '/hr-manager/payroll',
    icon: Wallet,
    permission: 'payroll.view',
  },
  {
    label: 'Payment Slips',
    path: '/hr-manager/payslips',
    icon: FileText,
    permission: 'payment_slips.view',
  },
  {
    label: 'Company Announcements',
    path: '/hr-manager/announcements',
    icon: Megaphone,
    permission: 'announcements.view',
  },
  {
    label: 'HR Reports',
    path: '/hr-manager/reports',
    icon: FileBarChart,
    permission: 'reports.view',
  },
  {
    label: 'HR Settings',
    path: '/hr-manager/settings',
    icon: Settings,
    permission: 'settings.view',
  },
  {
    label: 'User & Role Management',
    path: '/hr-manager/users',
    icon: ShieldCheck,
    anyOf: ['users.view', 'users.permissions'],
  },
]

function isVisible(item, permissions) {
  if (item.anyOf) {
    return item.anyOf.some((permission) => permissions.includes(permission))
  }
  return permissions.includes(item.permission)
}

function HRSidebar({ mobileOpen = false, onClose, permissions = [] }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('hr-theme') === 'dark' || localStorage.getItem('theme') === 'dark'
  })

  const [hoveredItem, setHoveredItem] = useState(null)

  useEffect(() => {
    const isDark = Boolean(darkMode)
    localStorage.setItem('hr-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    window.dispatchEvent(
      new CustomEvent('hr-theme-change', {
        detail: {
          darkMode: isDark,
        },
      }),
    )
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode((current) => !current)
  }

  return (
    <>
      {/* -----------------------------------------------------------
          MOBILE OVERLAY
      ----------------------------------------------------------- */}
      <div
        className={[
          'fixed inset-0 z-40 lg:hidden',
          'bg-black/50 backdrop-blur-sm',
          'transition-all duration-300 ease-out',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      {/* -----------------------------------------------------------
          SIDEBAR
      ----------------------------------------------------------- */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col',
          'overflow-hidden',
          'border-r',
          'shadow-xl shadow-slate-200/30',
          'transition-all duration-300 ease-out',

          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',

          darkMode
            ? 'border-slate-800 bg-slate-950 text-white shadow-black/30'
            : 'border-slate-200 bg-white text-slate-900',
        ].join(' ')}
      >
        {/* ---------------------------------------------------------
            TOP BRAND
        --------------------------------------------------------- */}
        <div
          className={[
            'relative flex h-16 shrink-0 items-center justify-between',
            'border-b px-4',
            darkMode
              ? 'border-slate-800'
              : 'border-slate-200',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            {/* Logo */}
            <img src="/logo.png" alt="Yanol-HR" className="relative flex h-10 w-10 rounded-xl object-contain transition-all duration-300 hover:scale-105" />

            <div className="min-w-0">
              <p
                className={[
                  'text-sm font-bold transition-colors duration-300',
                  darkMode
                    ? 'text-white'
                    : 'text-slate-950',
                ].join(' ')}
              >
                Yanol Tech
              </p>

              <p
                className={[
                  'text-xs transition-colors duration-300',
                  darkMode
                    ? 'text-slate-400'
                    : 'text-slate-500',
                ].join(' ')}
              >
                HR Management
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className={[
              'rounded-lg p-2 transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'lg:hidden',
              darkMode
                ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* ---------------------------------------------------------
            NAVIGATION
        --------------------------------------------------------- */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className={[
              'px-3 pb-3 text-[11px] font-semibold uppercase',
              'tracking-[0.12em] transition-colors duration-300',
              darkMode
                ? 'text-slate-500'
                : 'text-slate-400',
            ].join(' ')}
          >
            HR Management
          </p>

          <div className="space-y-1.5">
            {navigation
              .filter((item) => isVisible(item, permissions))
              .map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={({ isActive }) =>
                    [
                      'group relative flex items-center gap-3',
                      'overflow-hidden rounded-xl px-3 py-2.5',
                      'text-sm font-medium',
                      'transition-all duration-300 ease-out',

                      isActive
                        ? darkMode
                          ? 'bg-white text-slate-950 shadow-lg shadow-black/20'
                          : 'bg-slate-900 text-white shadow-md shadow-slate-300/50'
                        : darkMode
                          ? 'text-slate-400 hover:bg-slate-900 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',

                      hoveredItem === item.path && !isActive
                        ? 'translate-x-1'
                        : 'translate-x-0',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Animated active background glow */}
                      {isActive && (
                        <span
                          className={[
                            'absolute inset-y-0 left-0 w-1',
                            'rounded-r-full',
                            'transition-all duration-300',
                            darkMode
                              ? 'bg-slate-950'
                              : 'bg-white',
                          ].join(' ')}
                        />
                      )}

                      {/* Hover light sweep */}
                      <span
                        className={[
                          'absolute inset-0 -translate-x-full',
                          'bg-gradient-to-r from-transparent',
                          'to-transparent opacity-0',
                          'transition-all duration-500',
                          'group-hover:translate-x-full',
                          'group-hover:opacity-100',
                          darkMode
                            ? 'via-white/5'
                            : 'via-white/30',
                        ].join(' ')}
                      />

                      {/* Icon */}
                      <span
                        className={[
                          'relative z-10 flex h-5 w-5 shrink-0',
                          'items-center justify-center',
                          'transition-all duration-300',
                          isActive
                            ? 'scale-110'
                            : 'group-hover:scale-110 group-hover:rotate-[-3deg]',
                        ].join(' ')}
                      >
                        <Icon
                          size={19}
                          strokeWidth={isActive ? 2.3 : 2}
                          className="transition-all duration-300"
                        />
                      </span>

                      {/* Label */}
                      <span className="relative z-10 flex-1 truncate">
                        {item.label}
                      </span>

                      {/* Active arrow */}
                      <ChevronRight
                        size={16}
                        className={[
                          'relative z-10 shrink-0',
                          'transition-all duration-300',
                          isActive
                            ? 'translate-x-0 opacity-100'
                            : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60',
                        ].join(' ')}
                      />
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* ---------------------------------------------------------
            LIGHT / DARK MODE
        --------------------------------------------------------- */}
        <div
          className={[
            'border-t p-3',
            darkMode ? 'border-slate-800' : 'border-slate-200',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={toggleDarkMode}
            className={[
              'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left',
              'transition-all duration-300',
              darkMode
                ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            ].join(' ')}
          >
            <span className={[
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              'transition-all duration-500 group-hover:scale-105',
              darkMode ? 'bg-slate-800' : 'bg-white shadow-sm',
            ].join(' ')}>
              {darkMode ? (
                <Moon size={18} className="rotate-[-15deg] transition-transform duration-500 group-hover:rotate-0" />
              ) : (
                <Sun size={18} className="transition-transform duration-500 group-hover:rotate-45" />
              )}
            </span>

            <span className="flex-1">
              <span className="block text-sm font-semibold">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <span className={['block text-[11px]', darkMode ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                {darkMode ? 'Dark appearance enabled' : 'Light appearance enabled'}
              </span>
            </span>

            <span className={['relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', darkMode ? 'bg-white' : 'bg-slate-300'].join(' ')}>
              <span className={['absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-all duration-300', darkMode ? 'left-[18px] bg-slate-950' : 'left-0.5 bg-white'].join(' ')} />
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default HRSidebar
