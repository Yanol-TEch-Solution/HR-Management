import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import HRManagerApp from './HR-Manager/HRManagerApp'
import EmployerApp from './Employer/EmployerApp'

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase()

  if (value === 'EMPLOYER' || value === 'EMPLOYEE') {
    return 'EMPLOYEE'
  }

  if (
    value === 'ADMIN' ||
    value === 'HR' ||
    value === 'HR_ADMIN' ||
    value === 'HR_MANAGER'
  ) {
    return 'HR_MANAGER'
  }

  return value
}

function ProtectedRoute({ children, allowedRole, loginPath }) {
  const user = getStoredUser()

  if (!user?.token) {
    return <Navigate to={loginPath} replace />
  }

  if (normalizeRole(user.role) !== allowedRole) {
    return <Navigate to={loginPath} replace />
  }

  return children
}

function AnimatedSearchPlaceholders() {
  useEffect(() => {
    const timers = new Map()
    const animate = (input) => {
      if (!(input instanceof HTMLInputElement) || input.dataset.animatedSearchPlaceholder) return
      const original = input.getAttribute('placeholder') || ''
      if (!/search/i.test(original)) return
      input.dataset.animatedSearchPlaceholder = original
      let index = 0
      let deleting = false
      let pause = 0
      const timer = window.setInterval(() => {
        if (!input.isConnected) {
          window.clearInterval(timer)
          timers.delete(input)
          return
        }
        if (pause > 0) { pause -= 1; return }
        if (!deleting) {
          index += 1
          input.setAttribute('placeholder', original.slice(0, index))
          if (index >= original.length) { deleting = true; pause = 12 }
        } else {
          index -= 1
          input.setAttribute('placeholder', original.slice(0, index))
          if (index <= 0) { deleting = false; pause = 3 }
        }
      }, 65)
      timers.set(input, timer)
    }
    const scan = (root) => {
      if (root instanceof HTMLInputElement) animate(root)
      root.querySelectorAll?.('input[placeholder]').forEach(animate)
    }

    scan(document)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') mutation.addedNodes.forEach((node) => node.nodeType === Node.ELEMENT_NODE && scan(node))
        else if (mutation.target instanceof HTMLInputElement && !mutation.target.dataset.animatedSearchPlaceholder) animate(mutation.target)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder'] })
    return () => {
      observer.disconnect()
      timers.forEach((timer) => window.clearInterval(timer))
    }
  }, [])

  return null
}

function LoginRedirect() {
  const user = getStoredUser()
  const role = normalizeRole(user?.role)
  if (role === 'EMPLOYEE') {
    return <Navigate to="/employee/login" replace />
  }
  return <Navigate to="/hr-manager/login" replace />
}

function RootRedirect() {
  const user = getStoredUser()
  const role = normalizeRole(user?.role)
  if (role === 'EMPLOYEE') {
    return <Navigate to="/employer/dashboard" replace />
  }
  return <Navigate to="/hr-manager" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedSearchPlaceholders />
      <Routes>

        {/* HR ADMIN LOGIN */}
        <Route
          path="/hr-manager/login"
          element={<Login />}
        />

        {/* EMPLOYEE LOGIN */}
        <Route
          path="/employee/login"
          element={<Login />}
        />
        <Route
          path="/employer/login"
          element={
            <Navigate
              to="/employee/login"
              replace
            />
          }
        />

        {/* PASSWORD RESET (public - reached from the emailed link) */}
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* LOGIN EMAIL CONFIRMATION (public - reached from the emailed link) */}
        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        {/* LOGIN URL REDIRECT (Smart based on role/portal) */}
        <Route
          path="/login"
          element={<LoginRedirect />}
        />

        {/* HR MANAGER / HR DASHBOARD */}
        <Route
          path="/hr-manager/*"
          element={
            <ProtectedRoute
              allowedRole="HR_MANAGER"
              loginPath="/hr-manager/login"
            >
              <HRManagerApp />
            </ProtectedRoute>
          }
        />

        {/* EMPLOYEE PORTAL */}
        <Route
          path="/employer/*"
          element={
            <ProtectedRoute
              allowedRole="EMPLOYEE"
              loginPath="/employee/login"
            >
              <EmployerApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/*"
          element={
            <ProtectedRoute
              allowedRole="EMPLOYEE"
              loginPath="/employee/login"
            >
              <EmployerApp />
            </ProtectedRoute>
          }
        />

        {/* MAIN ROUTE */}
        <Route
          path="/"
          element={<RootRedirect />}
        />

        {/* UNKNOWN ROUTES */}
        <Route
          path="*"
          element={<RootRedirect />}
        />

      </Routes>
    </BrowserRouter>
  )
}
