import { CalendarDays, Clock3, ShieldCheck, UsersRound } from 'lucide-react'

type Props = {
  accounts: number
  bookings: number
  confirmed: number
  upcoming: number
}

export default function AdminStats({ accounts, bookings, confirmed, upcoming }: Props) {
  return <section className="admin-stats" aria-label="Dashboard summary">
    <article><UsersRound /><div><strong>{accounts}</strong><span>Total accounts</span></div></article>
    <article><CalendarDays /><div><strong>{bookings}</strong><span>All bookings</span></div></article>
    <article><ShieldCheck /><div><strong>{confirmed}</strong><span>Confirmed bookings</span></div></article>
    <article><Clock3 /><div><strong>{upcoming}</strong><span>Upcoming sessions</span></div></article>
  </section>
}

