import { CalendarDays } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { enAU } from 'react-day-picker/locale'
import 'react-day-picker/style.css'

type Props = {
  value: string
  onChange: (value: string) => void
  max: Date
}

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const displayDate = (date: Date) => date.toLocaleDateString('en-AU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export default function DateOfBirthPicker({ value, onChange, max }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = parseDate(value)

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="details-date-picker" ref={rootRef}>
    <button
      ref={triggerRef}
      type="button"
      className="details-date-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="details-date-calendar"
      aria-label={selected ? `Date of birth: ${displayDate(selected)}. Change date` : 'Choose date of birth'}
      aria-required="true"
      onClick={() => setOpen(current => !current)}
    >
      <span className={selected ? '' : 'placeholder'}>{selected ? displayDate(selected) : 'Choose your date of birth'}</span>
      <CalendarDays size={19} aria-hidden="true" />
    </button>

    {open && <div className="details-date-popover" id="details-date-calendar" role="dialog" aria-label="Choose date of birth">
      <DayPicker
        mode="single"
        locale={enAU}
        selected={selected}
        defaultMonth={selected ?? max}
        startMonth={new Date(1900, 0)}
        endMonth={new Date(max.getFullYear(), max.getMonth())}
        disabled={{ after: max }}
        captionLayout="dropdown"
        navLayout="around"
        reverseYears
        fixedWeeks
        onSelect={date => {
          if (!date) return
          onChange(dateKey(date))
          setOpen(false)
          triggerRef.current?.focus()
        }}
      />
    </div>}

    <input
      className="details-date-native"
      type="date"
      autoComplete="bday"
      max={dateKey(max)}
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label="Date of birth"
    />
  </div>
}
