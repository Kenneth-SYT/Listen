import type { FormEvent } from 'react'
import type { Listener } from '../../lib/supabase'
import AdminAvailabilityCalendar from './AdminAvailabilityCalendar'
import type { AdminSlot } from './adminTypes'

type Props = {
  listeners: Listener[]
  slots: AdminSlot[]
  busy: boolean
  onAddWindow: (event: FormEvent<HTMLFormElement>) => Promise<boolean>
  setBusy: (value: boolean) => void
  setMessage: (value: string) => void
  refresh: () => void
}

export default function AdminAvailabilitySection({ listeners, slots, busy, onAddWindow, setBusy, setMessage, refresh }: Props) {
  return <section className="admin-section admin-availability-section">
    <AdminAvailabilityCalendar listeners={listeners} slots={slots} busy={busy} onAddWindow={onAddWindow} setBusy={setBusy} setMessage={setMessage} refresh={refresh} />
  </section>
}

