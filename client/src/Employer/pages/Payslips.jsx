import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Printer,
  Search,
  LayoutGrid,
  List,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
  Calendar,
} from 'lucide-react'
import PaymentSlip, { formatSlipAmount } from '../../components/PaymentSlip'
import { resolveEmployee, getCurrentUser } from '../lib/currentUser'
import { fetchEmployees, fetchPayrollRecords } from '../lib/employerApi'
import useRealtimeRefetch from '../hooks/useRealtimeRefetch'

export default function Payslips() {
  const [employees, setEmployees] = useState([])
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const me = resolveEmployee(employees, getCurrentUser())

  const [viewType, setViewType] = useState('grid') // 'grid' (2-up), 'table' (summary list), 'single' (focused)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedEmpId, setSelectedEmpId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([fetchEmployees(), fetchPayrollRecords()])
      .then(([emps, payroll]) => {
        if (cancelled) return
        setEmployees(Array.isArray(emps) ? emps : [])
        setPayrollRecords(Array.isArray(payroll) ? payroll : [])
      })
      .catch((error) => {
        console.error('Load payslips error:', error)
        if (!cancelled) {
          setEmployees([])
          setPayrollRecords([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const reloadPayroll = useCallback(() => {
    fetchPayrollRecords()
      .then((records) => setPayrollRecords(Array.isArray(records) ? records : []))
      .catch((error) => console.error('Refresh payslips error:', error))
  }, [])

  useRealtimeRefetch('employee-payslips', reloadPayroll)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const periodLabel = `${monthNames[month - 1] || ''} ${year}`

  // Use only payroll records that actually exist in the database.
  // No calculated/fallback/mock payroll is created here.
  const slipsData = useMemo(() => {
    const employeeById = new Map()
    employees.forEach((emp) => {
      employeeById.set(String(emp.id), emp)
      employeeById.set(String(emp.employeeId), emp)
    })

    return payrollRecords
      .filter((record) => {
        const period = String(record.payrollMonth || '')
        const matchMonth = period === `${year}-${String(month).padStart(2, '0')}`
        const isPaid = String(record.paymentStatus || '').toLowerCase() === 'paid'
        return matchMonth && isPaid
      })
      .map((record) => {
        const emp = employeeById.get(String(record.employeeId)) || {}
        const earnings = {
          basicSalary: Number(record.basicSalary) || 0,
          transport: Number(record.transportAllowance) || 0,
          housing: Number(record.housingAllowance) || 0,
          mealOther: (Number(record.mealAllowance) || 0) + (Number(record.otherAllowance) || 0),
          otPay: Number(record.overtimePay) || 0,
          grossSalary: Number(record.grossSalary) || 0,
        }

        const deductions = {
          incomeTax: Number(record.incomeTax) || 0,
          pension: Number(record.pensionDeduction) || 0,
          otherDeduct: Number(record.otherDeduction) || 0,
          loanDeduct: Number(record.loanDeduction) || 0,
          totalDeduct: Number(record.totalDeductions) || 0,
          netSalary: Number(record.netSalary) || 0,
        }

        return {
          employee: {
            employeeId: emp.employeeId || record.employeeId || '',
            name: emp.name || record.employeeName || 'Employee',
            department: emp.department || record.department || '',
            jobTitle: emp.jobTitle || '',
            tin: emp.tin || '',
            bankAccount: emp.bankAccount || '',
          },
          earnings,
          deductions,
          payrollRecord: record,
        }
      })
  }, [employees, payrollRecords, month, year])

  // Detect whether payroll has been drafted for this month but not yet paid
  const unpaidPayrollRecord = useMemo(() => {
    return payrollRecords.find((record) => {
      const period = String(record.payrollMonth || '')
      const matchMonth = period === `${year}-${String(month).padStart(2, '0')}`
      const isPaid = String(record.paymentStatus || '').toLowerCase() === 'paid'
      const isForMe = !me?.employeeId || String(record.employeeId) === String(me.employeeId) || String(record.employeeId) === String(me.id)
      return matchMonth && !isPaid && isForMe
    })
  }, [payrollRecords, month, year, me])

  // This page is employee-self-service: only the currently logged-in employee's
  // real payroll records are allowed to appear here.
  const employeeSlips = useMemo(() => {
    if (!me?.employeeId) return []
    return slipsData.filter(
      (item) => String(item.employee.employeeId) === String(me.employeeId),
    )
  }, [slipsData, me?.employeeId])

  // Filtered slips for the currently logged-in employee only.
  const filteredSlips = useMemo(() => {
    return employeeSlips.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.employee.jobTitle && item.employee.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesDept = selectedDept === 'All' || item.employee.department === selectedDept
      return matchesSearch && matchesDept
    })
  }, [employeeSlips, searchQuery, selectedDept])

  const departments = useMemo(() => {
    return ['All', ...new Set(employeeSlips.map((s) => s.employee.department))]
  }, [employeeSlips])

  // Default the focused slip to the logged-in employee once data arrives
  const currentFocusedSlip = useMemo(() => {
    const id = me?.employeeId
    return (
      filteredSlips.find((s) => String(s.employee.employeeId) === String(id)) ||
      filteredSlips[0]
    )
  }, [filteredSlips, me?.employeeId])

  const handlePrev = () => {
    const idx = filteredSlips.findIndex((s) => s.employee.employeeId === currentFocusedSlip?.employee.employeeId)
    if (idx > 0) setSelectedEmpId(filteredSlips[idx - 1].employee.employeeId)
  }

  const handleNext = () => {
    const idx = filteredSlips.findIndex((s) => s.employee.employeeId === currentFocusedSlip?.employee.employeeId)
    if (idx < filteredSlips.length - 1) setSelectedEmpId(filteredSlips[idx + 1].employee.employeeId)
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <p className="text-sm font-bold text-gray-900">Loading payroll slips...</p>
          <p className="text-xs text-gray-500 mt-1">Loading recorded payroll data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* ── TOP CONTROLS & HEADER (HIDDEN IN PRINT) ── */}
      <div className="no-print space-y-4">
        {/* Title & Global Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] p-5 rounded-2xl shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
                Payment Slips
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                {periodLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              YANOLTECH SOLUTIONS PLC statutory payroll slips · Ethiopian Tax &amp; Pension Breakdown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] rounded-xl px-3 py-1.5 text-xs">
              <Calendar size={13} className="text-gray-500" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent font-bold text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-950 hover:bg-black text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>{viewType === 'single' ? 'Print Slip' : 'Print All Slips (2-Up)'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & View Mode Toggles */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] p-3 rounded-2xl shadow-2xs">
          {/* Search & Department Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] rounded-xl focus:outline-none focus:bg-white dark:focus:bg-[#15181d] text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#33383f] rounded-xl px-2.5 py-1 text-xs">
              <Building2 size={13} className="text-gray-500" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent font-semibold text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Showing {filteredSlips.length} of {employeeSlips.length} slips
            </span>
          </div>

          {/* View Type Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1c2026] p-1 rounded-xl shrink-0 border border-gray-200 dark:border-[#33383f]">
            <button
              onClick={() => setViewType('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'grid'
                  ? 'bg-white text-gray-950 shadow-xs dark:bg-[#282f37] dark:text-white'
                  : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              <span>2-Up Grid</span>
            </button>

            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'table'
                  ? 'bg-white text-gray-950 shadow-xs dark:bg-[#282f37] dark:text-white'
                  : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <List size={14} />
              <span>Summary Table</span>
            </button>

            <button
              onClick={() => setViewType('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'single'
                  ? 'bg-white text-gray-950 shadow-xs dark:bg-[#282f37] dark:text-white'
                  : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>Single Slip</span>
            </button>
          </div>
        </div>
      </div>

      {filteredSlips.length === 0 && (
        <div className="bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] rounded-2xl shadow-2xs p-8 text-center">
          {unpaidPayrollRecord ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 mb-2">
                <FileText size={26} />
              </div>
              <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-gray-100">
                Payroll Pending Disbursement
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Your payroll for {periodLabel} has been prepared and is awaiting payment disbursement by HR Admin. Your official payment slip will be automatically unlocked here once payment is disbursed.
              </p>
            </>
          ) : (
            <>
              <FileText className="mx-auto text-gray-300 dark:text-gray-600" size={34} />
              <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-100">No payment slip available</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                There is no disbursed payroll slip for {periodLabel}. Your official payment slip will automatically appear here once HR Admin processes and pays that month&apos;s payroll.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── 1. SUMMARY TABLE VIEW (STRUCTURED DIRECTORY) ── */}
      {viewType === 'table' && (
        <div className="no-print bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-[#262b31] flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-950 dark:text-gray-100">
              Payroll Slips Directory — {periodLabel}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Click any row or &quot;View Slip&quot; to inspect full details
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-[#1c2026] text-gray-600 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-[#262b31] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Department &amp; Title</th>
                  <th className="py-3 px-4 text-right">Basic Salary</th>
                  <th className="py-3 px-4 text-right">Gross Salary</th>
                  <th className="py-3 px-4 text-right">Total Deduct.</th>
                  <th className="py-3 px-4 text-right">Net Salary</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#262b31]">
                {filteredSlips.map((item) => (
                  <tr
                    key={item.employee.employeeId}
                    onClick={() => {
                      setSelectedEmpId(item.employee.employeeId)
                      setViewType('single')
                    }}
                    className="hover:bg-indigo-50/50 dark:hover:bg-[#1c2026] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                      {item.employee.employeeId}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-950 dark:text-gray-100">
                      {item.employee.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      <div>{item.employee.department}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{item.employee.jobTitle}</div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-medium text-gray-900 dark:text-gray-100">
                      {formatSlipAmount(item.earnings.basicSalary)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-gray-950 dark:text-gray-100">
                      {formatSlipAmount(item.earnings.grossSalary)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      {formatSlipAmount(item.deductions.totalDeduct)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {formatSlipAmount(item.deductions.netSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEmpId(item.employee.employeeId)
                          setViewType('single')
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-[#33383f] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#20252b] text-[11px] font-semibold"
                      >
                        <FileText size={12} />
                        <span>View Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 2. SINGLE SLIP VIEW (FOCUSED) ── */}
      {viewType === 'single' && currentFocusedSlip && (
        <div className="space-y-4">
          {/* Previous / Next Navigator (Hidden in Print) */}
          <div className="no-print flex items-center justify-between max-w-xl mx-auto bg-white dark:bg-[#15181d] border border-gray-200 dark:border-[#262b31] px-4 py-2.5 rounded-xl shadow-2xs">
            <button
              onClick={handlePrev}
              disabled={filteredSlips.findIndex((s) => s.employee.employeeId === currentFocusedSlip.employee.employeeId) <= 0}
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="text-center">
              <span className="text-xs font-bold text-gray-950 dark:text-gray-100">
                {currentFocusedSlip.employee.name}
              </span>
              <span className="text-[10px] text-gray-500 font-mono ml-2">
                ({currentFocusedSlip.employee.employeeId})
              </span>
            </div>

            <button
              onClick={handleNext}
              disabled={filteredSlips.findIndex((s) => s.employee.employeeId === currentFocusedSlip.employee.employeeId) >= filteredSlips.length - 1}
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-indigo-600 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Printable Single Slip */}
          <div id="printable-payment-slips" className="max-w-xl mx-auto">
            <PaymentSlip
              employee={currentFocusedSlip.employee}
              payrollPeriod={periodLabel}
              earnings={currentFocusedSlip.earnings}
              deductions={currentFocusedSlip.deductions}
            />
          </div>
        </div>
      )}

      {/* ── 3. 2-UP GRID / PRINT-READY LIST VIEW ── */}
      {(viewType === 'grid' || viewType === 'table') && (
        <div className={viewType === 'table' ? 'print:block hidden' : 'block'}>
          <div
            id="printable-payment-slips"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 max-w-full mx-auto"
          >
            {filteredSlips.map((item) => (
              <PaymentSlip
                key={item.employee.employeeId}
                employee={item.employee}
                payrollPeriod={periodLabel}
                earnings={item.earnings}
                deductions={item.deductions}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}