import { CalendarDays, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { DayPicker, type DropdownOption, type DropdownProps } from 'react-day-picker'
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

function CalendarCaptionDropdown({ options = [], value, onChange, disabled, className, 'aria-label': ariaLabel }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listId = useId()
  const selected = options.find(option => option.value === Number(value))
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === Number(value)))

  useEffect(() => {
    if (!open) return
    optionRefs.current[focusedIndex]?.focus()
    optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex, open])

  const chooseOption = (option: DropdownOption) => {
    if (option.disabled) return
    onChange?.({ target: { value: String(option.value) } } as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const moveFocus = (event: ReactKeyboardEvent, index: number) => {
    let nextIndex: number
    if (event.key === 'ArrowDown') nextIndex = Math.min(options.length - 1, index + 1)
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1)
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = options.length - 1
    else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    } else return

    event.preventDefault()
    setFocusedIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
    optionRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' })
  }

  return <span
    className={`details-calendar-dropdown ${className ?? ''}`}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
    }}
  >
    <button
      ref={triggerRef}
      type="button"
      className="details-calendar-dropdown-trigger"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      disabled={disabled}
      onClick={() => {
        if (!open) setFocusedIndex(selectedIndex)
        setOpen(!open)
      }}
    >
      <span>{selected?.label}</span>
      <ChevronDown className={open ? 'open' : ''} size={15} aria-hidden="true" />
    </button>
    {open && <span
      id={listId}
      className="details-calendar-dropdown-list"
      role="listbox"
      aria-label={ariaLabel}
    >
      {options.map((option, index) => <button
        ref={element => { optionRefs.current[index] = element }}
        key={option.value}
        type="button"
        role="option"
        aria-selected={option.value === Number(value)}
        className={option.value === Number(value) ? 'selected' : ''}
        disabled={option.disabled}
        tabIndex={focusedIndex === index ? 0 : -1}
        onClick={() => chooseOption(option)}
        onKeyDown={event => moveFocus(event, index)}
      >{option.label}</button>)}
    </span>}
  </span>
}

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
        components={{ MonthsDropdown: CalendarCaptionDropdown, YearsDropdown: CalendarCaptionDropdown }}
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
