import type { Slot } from '../../lib/supabase'

export type AdminView = 'bookings' | 'users' | 'availability' | 'management' | 'audit'
export type UserRoleFilter = 'all' | 'admin' | 'listener' | 'user'

export type AuditEntry = {
  id: number
  actor_user_id: string | null
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

export type AdminSlot = Slot & { enabled: boolean }

export type AdminUser = {
  user_id: string
  email: string
  account_created_at: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  date_of_birth: string | null
  mobile: string | null
  gender: string | null
  booking_count: number
  confirmed_booking_count: number
  next_booking_at: string | null
  listener_name: string | null
  administrator: boolean
}

export type Intake = {
  user_id: string
  selected_slot_id: string
  topics: string[]
  questionnaire_type: 'short' | 'long'
  k6_score: number | null
  k10_score: number | null
  listener_note: string
}

export type AuditIdentity = { name: string; detail: string }

