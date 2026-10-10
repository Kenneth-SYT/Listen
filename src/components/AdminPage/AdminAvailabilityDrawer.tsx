import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}

export default function AdminAvailabilityDrawer({ eyebrow, title, description, onClose, children }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return <div className="admin-drawer-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <aside className="admin-availability-drawer" role="dialog" aria-modal="true" aria-labelledby="availability-drawer-title">
      <header>
        <div><span>{eyebrow}</span><h3 id="availability-drawer-title">{title}</h3><p>{description}</p></div>
        <button type="button" aria-label="Close panel" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="admin-drawer-content">{children}</div>
    </aside>
  </div>
}
