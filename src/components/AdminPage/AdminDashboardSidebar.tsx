import { ArrowLeft, CalendarDays, Clock3, MessageSquareQuote, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import type { AdminView } from './adminTypes'

const navigation = [
  { id: 'users' as const, label: 'Users', icon: UsersRound },
  { id: 'availability' as const, label: 'Availability', icon: Clock3 },
  { id: 'management' as const, label: 'Management', icon: UserRound },
  { id: 'bookings' as const, label: 'Bookings', icon: CalendarDays },
  { id: 'reviews' as const, label: 'Reviews', icon: MessageSquareQuote },
  { id: 'audit' as const, label: 'Audit history', icon: ShieldCheck },
]

type Props = {
  activeView: AdminView
  onChange: (view: AdminView) => void
}

export default function AdminDashboardSidebar({ activeView, onChange }: Props) {
  return <aside className="admin-dashboard-sidebar" aria-label="Admin navigation">
    <div className="admin-dashboard-sidebar-heading"><span>Admin workspace</span><strong>Dashboard</strong></div>
    <nav>{navigation.map(item => {
      const Icon = item.icon
      return <button key={item.id} type="button" className={activeView === item.id ? 'active' : ''} aria-pressed={activeView === item.id} onClick={() => onChange(item.id)}><Icon />{item.label}</button>
    })}</nav>
    <a href="/account"><ArrowLeft />My account</a>
  </aside>
}

