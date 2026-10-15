import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Check, Circle, MessageCircle, Plus, Send, X } from 'lucide-react'
import { errorMessage, getSupabase } from '../../lib/supabase'
import './SupportWorkspace.css'

export type SupportContact = { listenerId: string; userId: string; name: string }
type SupportMessage = { id: string; listener_id: string; user_id: string; sender_user_id: string; body: string; created_at: string }
type SupportTodo = { id: string; listener_id: string; user_id: string; title: string; details: string; due_date: string | null; status: 'open' | 'completed' | 'cancelled'; created_at: string }

export default function SupportWorkspace({ role, mode, currentUserId, contacts }: { role: 'listener' | 'customer'; mode: 'messages' | 'todos'; currentUserId: string; contacts: SupportContact[] }) {
  const [selectedKey, setSelectedKey] = useState('')
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [todos, setTodos] = useState<SupportTodo[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const keyFor = (contact: SupportContact) => `${contact.listenerId}:${contact.userId}`
  const selected = contacts.find(contact => keyFor(contact) === selectedKey) || contacts[0]
  const effectiveSelectedKey = selected ? keyFor(selected) : ''
  useEffect(() => {
    if (!contacts.length) return
    let active = true
    const client = getSupabase()
    void Promise.all([
      client.from('support_messages').select('*').order('created_at', { ascending: true }),
      client.from('support_todos').select('*').order('created_at', { ascending: false }),
    ]).then(([messageResult, todoResult]) => {
      if (!active) return
      if (messageResult.error || todoResult.error) throw messageResult.error || todoResult.error
      setMessages((messageResult.data || []) as SupportMessage[])
      setTodos((todoResult.data || []) as SupportTodo[])
    }).catch(error => { if (active) setNotice(errorMessage(error)) })
    return () => { active = false }
  }, [contacts.length, refresh])

  const thread = useMemo(() => selected ? messages.filter(item => item.listener_id === selected.listenerId && item.user_id === selected.userId) : [], [messages, selected])
  const assignedTodos = useMemo(() => selected ? todos.filter(item => item.listener_id === selected.listenerId && item.user_id === selected.userId && item.status !== 'cancelled') : [], [todos, selected])
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || !draft.trim()) return
    setBusy(true); setNotice('')
    try {
      const rpc = role === 'listener' ? 'listener_send_support_message' : 'customer_send_support_message'
      const args = role === 'listener' ? { p_user: selected.userId, p_body: draft } : { p_listener: selected.listenerId, p_body: draft }
      const { error } = await getSupabase().rpc(rpc, args)
      if (error) throw error
      setDraft(''); setRefresh(value => value + 1)
    } catch (error) { setNotice(errorMessage(error)) } finally { setBusy(false) }
  }
  const createTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return
    const data = new FormData(event.currentTarget); setBusy(true); setNotice('')
    try {
      const { error } = await getSupabase().rpc('listener_create_support_todo', { p_user: selected.userId, p_title: String(data.get('title')), p_details: String(data.get('details')), p_due_date: String(data.get('dueDate')) || null })
      if (error) throw error
      event.currentTarget.reset(); setRefresh(value => value + 1)
    } catch (error) { setNotice(errorMessage(error)) } finally { setBusy(false) }
  }
  const setTodoStatus = async (todoId: string, status: 'open' | 'completed' | 'cancelled') => {
    setBusy(true); setNotice('')
    try {
      const rpc = role === 'listener' ? 'listener_set_support_todo_status' : 'customer_set_support_todo_status'
      const { error } = await getSupabase().rpc(rpc, { p_todo: todoId, p_status: status })
      if (error) throw error
      setRefresh(value => value + 1)
    } catch (error) { setNotice(errorMessage(error)) } finally { setBusy(false) }
  }

  if (!contacts.length) return <section className="support-empty"><MessageCircle /><h2>{mode === 'messages' ? 'Messages' : 'To-do list'}</h2><p>{role === 'listener' ? 'This area becomes available after your first confirmed session.' : 'Book a session to start communicating with your listener.'}</p></section>
  return <section className="support-workspace">
    <header><div><span>{mode === 'messages' ? 'Conversations' : 'Shared next steps'}</span><h2>{mode === 'messages' ? 'Messages' : 'To-do list'}</h2><p>{role === 'listener' ? 'Communicate with customers from confirmed sessions.' : 'Keep in touch with your listener between appointments.'}</p></div><label><span>{role === 'listener' ? 'Customer' : 'Listener'}</span><select value={effectiveSelectedKey} onChange={event => setSelectedKey(event.target.value)}>{contacts.map(contact => <option key={keyFor(contact)} value={keyFor(contact)}>{contact.name}</option>)}</select></label></header>
    {notice && <p className="support-notice" role="status">{notice}</p>}
    {mode === 'messages' ? <>
      <div className="support-thread" aria-live="polite">{thread.map(item => <article className={item.sender_user_id === currentUserId ? 'mine' : ''} key={item.id}><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></article>)}{thread.length === 0 && <div className="support-thread-empty"><MessageCircle /><strong>No messages yet</strong><span>Start the conversation with {selected?.name}.</span></div>}</div>
      <form className="support-composer" onSubmit={sendMessage}><label htmlFor="support-message">Message</label><div><textarea id="support-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={3} placeholder="Write a private message…" required /><button disabled={busy || !draft.trim()}><Send />Send</button></div></form>
    </> : <>
      {role === 'listener' && <form className="support-todo-form" onSubmit={createTodo}><label><span>Task</span><input name="title" maxLength={160} placeholder="e.g. Write down one thing that helped this week" required /></label><label><span>Notes <small>Optional</small></span><textarea name="details" maxLength={1000} rows={2} placeholder="Add helpful context for the customer" /></label><label><span>Due date <small>Optional</small></span><input name="dueDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label><button disabled={busy}><Plus />Add to-do</button></form>}
      <div className="support-todo-list">{assignedTodos.map(todo => <article className={todo.status} key={todo.id}><button className="support-todo-check" type="button" disabled={busy} onClick={() => setTodoStatus(todo.id, todo.status === 'completed' ? 'open' : 'completed')} aria-label={todo.status === 'completed' ? 'Reopen task' : 'Complete task'}>{todo.status === 'completed' ? <Check /> : <Circle />}</button><div><h3>{todo.title}</h3>{todo.details && <p>{todo.details}</p>}<span>{todo.due_date ? `Due ${new Date(`${todo.due_date}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}` : 'No due date'} · {todo.status}</span></div>{role === 'listener' && <button className="support-todo-remove" type="button" disabled={busy} onClick={() => setTodoStatus(todo.id, 'cancelled')} aria-label="Remove task"><X /></button>}</article>)}{assignedTodos.length === 0 && <div className="support-thread-empty"><Check /><strong>You’re all caught up</strong><span>{role === 'listener' ? 'Add a useful next step for this customer.' : 'New tasks from your listener will appear here.'}</span></div>}</div>
    </>}
  </section>
}
