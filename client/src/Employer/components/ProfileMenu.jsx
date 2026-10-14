import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown, Settings as SettingsIcon, Sun, Moon, CircleUserRound } from 'lucide-react'
import { logout } from '../../lib/auth'
import { useTheme } from '../../lib/theme'

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200 dark:bg-[#1c2026] dark:border-[#33383f]">
      <button
        onClick={() => dark && toggleTheme()}
        disabled={!dark}
        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
          !dark
            ? 'bg-white text-gray-900 shadow-sm border border-gray-200 dark:bg-[#3a4149] dark:text-white dark:border-[#3a4149]'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        <Sun size={13} /> Light
      </button>
      <button
        onClick={() => !dark && toggleTheme()}
        disabled={dark}
        className={`flex items-center justify-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
          dark
            ? 'bg-gray-900 text-white shadow-sm border border-gray-700'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Moon size={13} /> Dark
      </button>
    </div>
  )
}

function ProfileMenu({ compact = false, basePath = '/employer', profilePath }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const raw = localStorage.getItem('user')
  let user = {
    name: 'Employer',
    email: 'employer@yanol.com',
    role: 'EMPLOYER',
    company: 'Yanol Technology',
  }
  if (raw) {
    try {
      user = { ...user, ...JSON.parse(raw) }
    } catch {
      /* ignore malformed stored user */
    }
  }

  const initials = getInitials(user.name)
  const roleLabel = String(user.role || 'EMPLOYER').replace('_', ' ')

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const close = () => setOpen(false)
  const handleLogout = async () => {
    await logout()
    navigate('/employee/login')
  }

  const menuItemClass =
    'flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-[#1c2026] dark:hover:text-white rounded-lg transition-colors'

  const sectionLabelClass =
    'text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 block'

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl transition-colors ${
          open ? 'bg-gray-100 dark:bg-[#1c2026]' : 'hover:bg-gray-100 dark:hover:bg-[#1c2026]'
        }`}
        title={user.name}
      >
        <div className="w-8 h-8 rounded-full bg-gray-950 text-white dark:bg-[#3a4149] text-xs font-bold flex items-center justify-center shadow-sm shrink-0 dark:text-gray-100">
          {initials}
        </div>
        {!compact && (
          <>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[110px]">
                {user.name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize truncate max-w-[110px]">
                {roleLabel}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#33383f] rounded-2xl shadow-xl dark:shadow-black/40 z-50 overflow-hidden origin-top-right animate-in zoom-in-95 duration-150">
          {/* Profile header */}
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-[#262b31] flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gray-950 text-white dark:bg-[#3a4149] text-sm font-bold flex items-center justify-center shrink-0 shadow-sm dark:text-gray-100">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-950 dark:text-gray-100 bg-gray-100 dark:bg-[#1c2026] px-2 py-0.5 rounded-full shrink-0">
              {roleLabel}
            </span>
          </div>

          {/* Account shortcuts */}
          <div className="p-2 border-b border-gray-100 dark:border-[#262b31]">
            {profilePath && (
              <Link to={profilePath} onClick={close} className={menuItemClass}>
                <CircleUserRound size={14} className="text-gray-400 shrink-0" /> My Profile
              </Link>
            )}
            <Link to={`${basePath}/settings`} onClick={close} className={menuItemClass}>
              <SettingsIcon size={14} className="text-gray-400 shrink-0" /> My Settings
            </Link>
          </div>

          {/* Appearance */}
          <div className="p-3">
            <span className={`${sectionLabelClass} mb-1.5`}>Appearance</span>
            <ThemeToggle />
          </div>

          {/* Log out */}
          <div className="p-2 mt-1 border-t border-gray-100 dark:border-[#262b31]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-200 dark:hover:bg-red-500/10 dark:hover:text-red-400 rounded-lg transition-colors text-left"
            >
              <LogOut size={14} className="shrink-0" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu