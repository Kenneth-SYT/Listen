import type { Listener, Slot } from './supabase'

export type ListenerMatch = {
  listener: Listener
  matchedTopics: string[]
  availableSlots: number
}

const normalise = (value: string) => value.trim().toLocaleLowerCase('en-AU')

export function rankListeners(listeners: Listener[], slots: Slot[], topics: string[], durationMinutes: number): ListenerMatch[] {
  const availableByListener = new Map<string, number>()
  for (const slot of slots) {
    if (Date.parse(slot.ends_at) - Date.parse(slot.starts_at) < durationMinutes * 60_000) continue
    availableByListener.set(slot.listener_id, (availableByListener.get(slot.listener_id) ?? 0) + 1)
  }
  const selected = new Set(topics.map(normalise))
  return listeners.map(listener => ({
    listener,
    matchedTopics: listener.matches.filter(topic => selected.has(normalise(topic))),
    availableSlots: availableByListener.get(listener.id) ?? 0,
  })).sort((a, b) =>
    Number(b.availableSlots > 0) - Number(a.availableSlots > 0)
    || b.matchedTopics.length - a.matchedTopics.length
    || a.listener.name.localeCompare(b.listener.name)
    || a.listener.id.localeCompare(b.listener.id),
  )
}

export function recommendedListener(matches: ListenerMatch[]): ListenerMatch | null {
  if (matches.length === 1) return matches[0]
  return matches.find(match => match.availableSlots > 0 && match.matchedTopics.length > 0) ?? null
}
