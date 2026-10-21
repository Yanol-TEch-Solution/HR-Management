import { useState, useMemo, useEffect, useCallback } from 'react'
import { calcPayroll, formatETB, roundMoney } from '../lib/payroll'
import { SETTINGS } from '../data/settingsData'
import LuxuryDataTable from '../components/LuxuryDataTable'
import { resolveEmployee, getCurrentUser } from '../lib/currentUser'
import { attendanceTotals } from '../lib/attendanceUtils'
import { fetchEmployees, fetchAttendance, fetchPayrollRecords } from '../lib/employerApi'
import useRealtimeRefetch from '../hooks/useRealtimeRefetch'

function Payroll() {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [payrollRecords, setPayrollRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const currentEmployeeId = resolveEmployee(employees, getCurrentUser()).employeeId
  const showAllEmployees = currentEmployeeId === '—'

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [overrides, setOverrides] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchPayrollRecords()])
      .then(([emps, payroll]) => {
        if (!cancelled) {
          setEmployees(Array.isArray(emps) ? emps : [])
          setPayrollRecords(Array.isArray(payroll) ? payroll : [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setAttendance([])
    fetchAttendance({ month, year })
      .then((att) => {
        if (!cancelled) setAttendance(Array.isArray(att) ? att : (att?.attendance || []))
      })
      .catch(() => {
        if (!cancelled) setAttendance([])
      })
    return () => {
      cancelled = true
    }
  }, [month, year])

  // Live refresh: a punch or HR status change instantly recomputes the
  // payroll rows for the selected month (OT hours feed the rows).
  const reloadAttendance = useCallback(() => {
    fetchAttendance({ month, year })
      .then((att) => setAttendance(Array.isArray(att) ? att : (att?.attendance || [])))
      .catch(() => {})
    fetchPayrollRecords()
      .then((records) => setPayrollRecords(Array.isArray(records) ? records : []))
      .catch(() => {})
  }, [month, year])
  useRealtimeRefetch(`${month}-${year}`, reloadAttendance)

  const period = `${year}-${String(month).padStart(2, '0')}`

  const officialPayrollByEmp = useMemo(() => {
    const map = new Map()
    payrollRecords.forEach((rec) => {
      if (String(rec.payrollMonth || '') === period) {
        map.set(String(rec.employeeId), rec)
      }
    })
    return map
  }, [payrollRecords, period])

  const filteredEmployees = useMemo(() => {
    if (showAllEmployees) return employees.filter((emp) => emp.employmentStatus !== 'Resigned' && emp.employmentStatus !== 'Terminated')
    return employees.filter((emp) => emp.employeeId === currentEmployeeId)
  }, [employees, currentEmployeeId, showAllEmployees])

  const rows = useMemo(() => {
    const attTotals = attendanceTotals(attendance)
    return filteredEmployees.map((emp) => {
      const official = officialPayrollByEmp.get(String(emp.id)) || officialPayrollByEmp.get(String(emp.employeeId))
      const base = calcPayroll(emp, attTotals[emp.id] || attTotals[emp.employeeId] || { totalOtHours: 0 })
      const ov = overrides[emp.employeeId]
      const otherDeductions = official ? official.otherDeduction : (ov?.otherDeductions ?? emp.otherDeductions ?? 0)
      const loanDeductions = official ? official.loanDeduction : (ov?.loanDeductions ?? emp.loanDeductions ?? 0)
      const totalDeductions = official ? official.totalDeductions : (base.incomeTax + base.pensionEmployee + otherDeductions + loanDeductions)
      const netSalary = official ? official.netSalary : roundMoney(base.gross - totalDeductions)

      return {
        ...base,
        basicSalary: official ? official.basicSalary : base.basicSalary,
        gross: official ? official.grossSalary : base.gross,
        incomeTax: official ? official.incomeTax : base.incomeTax,
        pensionEmployee: official ? official.pensionDeduction : base.pensionEmployee,
        otherDeductions,
        loanDeductions,
        totalDeductions,
        netSalary,
        hasOfficialRecord: Boolean(official),
        paymentStatus: official?.paymentStatus || (official ? 'Draft' : 'Not Run'),
        paidAt: official?.paidAt || null,
      }
    })
  }, [filteredEmployees, attendance, overrides, officialPayrollByEmp])

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.active)
    return {
      gross: roundMoney(active.reduce((s, r) => s + r.gross, 0)),
      tax: roundMoney(active.reduce((s, r) => s + r.incomeTax, 0)),
      pensionEmp: roundMoney(active.reduce((s, r) => s + r.pensionEmployee, 0)),
      pensionEmpR: roundMoney(active.reduce((s, r) => s + r.pensionEmployer, 0)),
      net: roundMoney(active.reduce((s, r) => s + r.netSalary, 0)),
      otherDed: roundMoney(active.reduce((s, r) => s + r.otherDeductions + r.loanDeductions, 0)),
    }
  }, [rows])

  const handleOverride = (employeeId, field, value) => {
    const num = Number(value) || 0
    setOverrides((prev) => ({ ...prev, [employeeId]: { ...(prev[employeeId] || {}), [field]: num } }))
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">Payroll</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tax brackets per Proclamation No. 1395/2025 · Pension {SETTINGS.pension.employeeRate * 100}% / {SETTINGS.pension.employerRate * 100}% · OT {SETTINGS.overtimeMultiplier}x · {SETTINGS.standardMonthlyHours}h std
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] font-semibold text-gray-800 dark:text-gray-200"
          >
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 text-xs border border-gray-200 dark:border-[#33383f] rounded-lg bg-white dark:bg-[#15181d] font-semibold text-gray-800 dark:text-gray-200">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Gross Payroll', value: totals.gross, color: 'text-gray-950 dark:text-gray-100' },
          { label: 'Income Tax', value: totals.tax, color: 'text-sky-600' },
          { label: 'Emp Pension', value: totals.pensionEmp, color: 'text-teal-600' },
          { label: 'Empr Pension', value: totals.pensionEmpR, color: 'text-violet-600' },
          { label: 'Net Payroll', value: totals.net, color: 'text-emerald-600' },
        ].map((t) => (
          <div key={t.label} className="bg-white dark:bg-[#15181d] rounded-2xl p-4 border border-gray-200/90 dark:border-[#262b31] shadow-2xs">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.label}</p>
            <p className={`text-lg font-bold mt-1 ${t.color}`}>{formatETB(t.value)}</p>
          </div>
        ))}
      </div>

      {/* Computed Payroll Table (Luxury Table) */}
      <LuxuryDataTable
        title={`Computed Payroll — ${month}/${year}`}
        subtitle="Detailed statutory breakdown with editable deductions & net disbursement"
        countBadge={`${rows.length} records`}
        data={rows}
        searchable={true}
        searchPlaceholder="Search staff name, ID, department..."
        searchKeys={['name', 'employeeId', 'department', 'employmentType']}
        exportable={true}
        exportFilename={`Employer_Payroll_${month}_${year}`}
        columns={[
          {
            key: 'name',
            header: 'Employee',
            sortable: true,
            render: (r) => (
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.employeeId} · {r.department}</p>
              </div>
            ),
          },
          {
            key: 'employmentType',
            header: 'Type',
            sortable: true,
            render: (r) => (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  r.exempt ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-700 dark:bg-[#1c2026] dark:text-gray-300'
                }`}
              >
                {r.employmentType} {r.exempt && '· exempt'}
              </span>
            ),
          },
          {
            key: 'basicSalary',
            header: 'Basic',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums font-medium">{formatETB(r.basicSalary)}</span>,
            exportValue: (r) => r.basicSalary,
          },
          {
            key: 'allowances',
            header: 'Allow.',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums">
                {formatETB(r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance)}
              </span>
            ),
            exportValue: (r) => r.transportAllowance + r.housingAllowance + r.mealAllowance + r.otherAllowance,
          },
          {
            key: 'otHours',
            header: 'OT',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-xs">
                {r.otHours}h <span className="text-[10px] text-gray-400">({formatETB(r.otPay)})</span>
              </span>
            ),
            exportValue: (r) => `${r.otHours}h (${r.otPay})`,
          },
          {
            key: 'gross',
            header: 'Gross',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums font-semibold">{formatETB(r.gross)}</span>,
            exportValue: (r) => r.gross,
          },
          {
            key: 'incomeTax',
            header: 'Tax',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums text-sky-600 font-medium">{formatETB(r.incomeTax)}</span>,
            exportValue: (r) => r.incomeTax,
          },
          {
            key: 'pensionEmployee',
            header: 'Pension',
            sortable: true,
            align: 'right',
            render: (r) => <span className="tabular-nums text-teal-600 font-medium">{formatETB(r.pensionEmployee)}</span>,
            exportValue: (r) => r.pensionEmployee,
          },
          {
            key: 'netSalary',
            header: 'Net Salary',
            sortable: true,
            align: 'right',
            render: (r) => (
              <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                {formatETB(r.netSalary)}
              </span>
            ),
            exportValue: (r) => r.netSalary,
          },
          {
            key: 'paymentStatus',
            header: 'Status',
            sortable: true,
            render: (r) => {
              if (String(r.paymentStatus).toLowerCase() === 'paid') {
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Paid
                  </span>
                )
              }
              if (r.hasOfficialRecord) {
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                    Pending
                  </span>
                )
              }
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-[#1c2026] dark:text-gray-400">
                  Not Run
                </span>
              )
            },
            exportValue: (r) => r.paymentStatus || 'Not Run',
          },
        ]}
      />

    </div>
  )
}

export default Payroll
