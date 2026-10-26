import { Route, Routes, Navigate } from 'react-router-dom'
import EmployerLayout from './components/EmployerLayout'
import { MessagingProvider } from './context/MessagingContext'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import Payslips from './pages/Payslips'
import Reports from './pages/Reports'
import EmployeeSettingsPage from './pages/EmployeeSettings'
import Profile from './pages/Profile'
import Inbox from './pages/Inbox'
import Announcements from './pages/Announcements'

function EmployerApp() {
  return (
    <MessagingProvider portalType="employer">
      <Routes>
        <Route element={<EmployerLayout />}>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<Leave />} />
          <Route path="time-off" element={<Leave />} />
          <Route path="announcements" element={<Announcements />} />

          {/* Payroll & Finance routes */}
          <Route path="payroll" element={<Payroll />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="salary" element={<Payroll />} />          {/* Reports & settings */}
          <Route path="reports" element={<Reports />} />
          {/* Personal settings (profile, preferences, notifications, security) */}
          <Route path="settings" element={<EmployeeSettingsPage />} />
          <Route path="profile" element={<Profile />} />

          {/* Inbox / messages */}
          <Route path="inbox" element={<Inbox />} />
          <Route path="inbox/:contactId" element={<Inbox />} />
        </Route>
      </Routes>
    </MessagingProvider>
  )
}

export default EmployerApp