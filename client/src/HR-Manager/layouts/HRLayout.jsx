import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import HRSidebar from '../components/HRSidebar'
import HRTopbar from '../components/HRTopbar'
import { MessagingProvider } from '../../Employer/context/MessagingContext'
import { setAttendanceConfig } from '../../Employer/lib/workTime'
import { authHeaders } from '../../lib/hrApi'
import { getUser } from '../../lib/auth'
import { permissionsOf } from '../../lib/rbac'

function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [accessPermissions, setAccessPermissions] = useState(null)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('hr-theme') === 'dark' || localStorage.getItem('theme') === 'dark'
  })

  // Start from what the account carried at login so the first paint already
  // hides nothing, then replace it with a fresh read.
  const [permissions, setPermissions] = useState(() => permissionsOf())

  const loadAccount = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: authHeaders(),
        cache: 'no-store',
      })

      if (!response.ok) return

      const data = await response.json()
      const next = Array.isArray(data?.user?.permissions) ? data.user.permissions : []

      setPermissions(next)

      // Keep the stored session in step, so a permission change survives a
      // page reload even before /me is asked again.
      const stored = getUser()
      if (stored) {
        localStorage.setItem('user', JSON.stringify({ ...stored, permissions: next }))
      }
    } catch {
      // Keep whatever we already had if the account cannot be read right now.
    }
  }, [])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  // A permission change made in User & Role Management fires this so the
  // sidebar and the buttons update without a sign-out.
  useEffect(() => {
    const reload = () => loadAccount()
    window.addEventListener('hr-permissions-updated', reload)
    return () => window.removeEventListener('hr-permissions-updated', reload)
  }, [loadAccount])

  useEffect(() => {
    let active = true
    const loadAccess = async () => {
      try {
        const response = await fetch('/api/hr-manager/settings', {
          headers: authHeaders(),
          cache: 'no-store',
        })
        if (!response.ok) return
        const settings = await response.json()
        if (!active) return

        setAccessPermissions(settings.accessPermissions || {})

        // Seed the shared attendance store with the times saved on this
        // same page. The daily-log table and the record-attendance modal
        // both read from it, so they pre-fill with the admin's real
        // check-in / check-out times instead of hard-coded 08:00 / 17:30.
        if (settings.attendanceConfiguration) {
          setAttendanceConfig(settings.attendanceConfiguration)
        }
      } catch {
        // Keep access usable if settings are temporarily unavailable.
      }
    }
    loadAccess()
    const interval = window.setInterval(loadAccess, 5000)
    window.addEventListener('hr-access-updated', loadAccess)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('hr-access-updated', loadAccess)
    }
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    const handleTheme = (e) => {
      const isDark = Boolean(e.detail?.darkMode)
      setDarkMode(isDark)
    }
    window.addEventListener('hr-theme-change', handleTheme)
    return () => window.removeEventListener('hr-theme-change', handleTheme)
  }, [])

  return (
    <MessagingProvider portalType="hr">
    <div className={`h-screen overflow-hidden transition-colors duration-300 ${darkMode ? 'dark bg-[#0a0d12] text-white' : 'bg-[#f4f5f7] text-slate-900'}`}>
      <HRSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        permissions={permissions}
      />

      <div
        className={[
          'flex h-screen min-h-0 flex-col transition-[padding] duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
        ].join(' ')}
      >
        <HRTopbar
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className={`min-h-0 flex-1 overflow-y-auto overscroll-contain transition-colors duration-300 ${darkMode ? 'bg-[#0d1015]' : 'bg-[#f4f5f7]'}`}>
          <Outlet context={{ accessPermissions, permissions, reloadAccess: loadAccount }} />
        </main>
      </div>
    </div>
    </MessagingProvider>
  )
}

export default HRLayout
