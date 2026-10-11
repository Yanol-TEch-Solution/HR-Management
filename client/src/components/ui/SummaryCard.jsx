import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

const iconVariants = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-orange-100 text-orange-600',
  violet: 'bg-violet-100 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-600',
}

const avatarColors = [
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
]

function AnimatedNumber({ value }) {
  const numericValue = Number(value)
  const isNumeric = Number.isFinite(numericValue)
  const [display, setDisplay] = useState(isNumeric ? 0 : value)

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value)
      return undefined
    }

    let frame
    const start = performance.now()

    const animate = (now) => {
      const progress = Math.min((now - start) / 700, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(numericValue * eased))

      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frame)
  }, [value, isNumeric, numericValue])

  return isNumeric ? display : value
}

export default function SummaryCard({
  title,
  description,
  value,
  icon: Icon,
  iconVariant = 'blue',
  valueLabel = 'People',
  employees = [],
  showAvatars = false,
  showArchived = false,
  onClick,
  className = '',
  animationDelay = 0,
}) {
  const [clicked, setClicked] = useState(false)

  const isTerminated = (emp) => {
    if (!emp) return false
    const status = String(emp.employmentStatus || emp.status || '').toLowerCase()
    return Boolean(
      emp.isArchived ||
      status === 'terminated' ||
      status === 'archived'
    )
  }

  const avatarEmployees = showArchived
    ? employees
    : employees.filter((emp) => !isTerminated(emp))

  function handleClick() {
    if (!onClick) return

    setClicked(false)
    requestAnimationFrame(() => setClicked(true))
    onClick()
  }

  const initialsFor = (employee) =>
    employee?.initials ||
    employee?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'EM'

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          handleClick()
        }
      }}
      className={[
        'group relative overflow-hidden rounded-[18px] border border-slate-200/80 bg-[#E8F1F9] p-5',
        'shadow-[0_3px_14px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)]',
        onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300' : '',
        clicked ? 'animate-[statCardClick_700ms_cubic-bezier(.22,1,.36,1)]' : '',
        className,
      ].join(' ')}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${iconVariants[iconVariant] || iconVariants.blue}`}>
          {Icon && <Icon size={20} strokeWidth={1.8} />}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60 text-slate-500 shadow-sm ring-1 ring-slate-200/60 transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRight size={17} />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-slate-800">
          {title}
        </p>

        {description && (
          <p className="mt-1 text-[12px] font-medium text-slate-400">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-slate-400">
            {valueLabel}
          </p>
          <p className="mt-0.5 text-[27px] font-bold leading-none tracking-tight text-slate-950">
            <AnimatedNumber value={value} />
          </p>
        </div>

        {showAvatars && avatarEmployees.length > 0 && (
          <div className="flex items-center pb-0.5 pl-2">
            {avatarEmployees.slice(0, 3).map((employee, index) => (
              <div
                key={employee?.id || employee?.employeeId || index}
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[8px] font-bold ${index > 0 ? '-ml-2' : ''} ${avatarColors[index % avatarColors.length]}`}
                title={employee?.name || 'Employee'}
              >
                {employee?.photo || employee?.profileImage || employee?.avatar ? (
                  <img
                    src={employee.photo || employee.profileImage || employee.avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsFor(employee)
                )}
              </div>
            ))}

            {avatarEmployees.length > 3 && (
              <span className="-ml-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-white/80 px-1.5 text-[9px] font-bold text-slate-500 shadow-sm">
                +{Math.max(avatarEmployees.length - 3, 0)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
