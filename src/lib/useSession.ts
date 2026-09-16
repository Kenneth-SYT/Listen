import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) { setSession(value); setLoading(false) }
    })
    void supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setLoading(false) }
    }).catch(() => { if (active) setLoading(false) })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  return { session, loading }
}
