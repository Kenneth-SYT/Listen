import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Check, Circle, MessageCircle, Plus, Send, X } from 'lucide-react'
import { errorMessage, getSupabase } from '../../lib/supabase'
import './SupportWorkspace.css'

export type SupportContact = { listenerId: string; userId: string; name: string }
type SupportMessage = { id: string; listener_id: string; user_id: string; sender_user_id: string; body: string; created_at: string }
type SupportTodo = { id: string; listener_id: string; user_id: string; title: string; details: string; due_date: string | null; status: 'open' | 'completed' | 'cancelled'; created_at: string }
type ThreadReadReceipt = { listener_id: string; user_id: string; messages_read_at: string }

export default function SupportWorkspace({ role, mode, currentUserId, contacts, onUnreadChange }: { role: 'listener' | 'customer'; mode: 'messages' | 'todos'; currentUserId: string; contacts: SupportContact[]; onUnreadChange?: () => void }) {
  const [selectedKey, setSelectedKey] = useState('')
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [todos, setTodos] = useState<SupportTodo[]>([])
  const [readReceipts, setReadReceipts] = useState<ThreadReadReceipt[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
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
      client.from('support_thread_read_receipts').select('listener_id,user_id,messages_read_at').eq('reader_user_id', currentUserId),
    ]).then(([messageResult, todoResult, receiptResult]) => {
      if (!active) return
      if (messageResult.error || todoResult.error || receiptResult.error) throw messageResult.error || todoResult.error || receiptResult.error
      setMessages((messageResult.data || []) as SupportMessage[])
      setTodos((todoResult.data || []) as SupportTodo[])
      setReadReceipts((receiptResult.data || []) as ThreadReadReceipt[])
    }).catch(error => { if (active) setNotice(errorMessage(error)) })
    return () => { active = false }
  }, [contacts.length, currentUserId, refresh])
  useEffect(() => {
    if (!contacts.length) return
    const client = getSupabase()
    const table = mode === 'messages' ? 'support_messages' : 'support_todos'
    const channel = client.channel(`support-workspace-${mode}-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => setRefresh(value => value + 1))
      .subscribe()
    const timer = window.setInterval(() => setRefresh(value => value + 1), 5000)
    const refreshOnFocus = () => setRefresh(value => value + 1)
    window.addEventListener('focus', refreshOnFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshOnFocus)
      void client.removeChannel(channel)
    }
  }, [contacts.length, currentUserId, mode])

  const thread = useMemo(() => selected ? messages.filter(item => item.listener_id === selected.listenerId && item.user_id === selected.userId) : [], [messages, selected])
  const assignedTodos = useMemo(() => selected ? todos.filter(item => item.listener_id === selected.listenerId && item.user_id === selected.userId && item.status !== 'cancelled') : [], [todos, selected])
  const unreadByContact = useMemo(() => Object.fromEntries(contacts.map(contact => {
    const receipt = readReceipts.find(item => item.listener_id === contact.listenerId && item.user_id === contact.userId)
    const readAt = Date.parse(receipt?.messages_read_at || '1970-01-01T00:00:00.000Z')
    const unread = messages.filter(item => item.listener_id === contact.listenerId && item.user_id === contact.userId && item.sender_user_id !== currentUserId && Date.parse(item.created_at) > readAt).length
    return [keyFor(contact), unread]
  })), [contacts, currentUserId, messages, readReceipts])
  const contactSummary = (contact: SupportContact) => {
    const latest = messages.filter(item => item.listener_id === contact.listenerId && item.user_id === contact.userId).at(-1)
    return latest ? { preview: latest.sender_user_id === currentUserId ? `You: ${latest.body}` : latest.body, time: new Date(latest.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) } : { preview: 'No messages yet', time: '' }
  }
  const todoSummary = (contact: SupportContact) => {
    const contactTodos = todos.filter(item => item.listener_id === contact.listenerId && item.user_id === contact.userId && item.status !== 'cancelled')
    return { preview: contactTodos[0]?.title || 'No tasks yet', count: contactTodos.filter(item => item.status === 'open').length }
  }
  useEffect(() => {
    if (mode !== 'messages' || !selected) return
    const latestIncoming = thread.filter(item => item.sender_user_id !== currentUserId).at(-1)
    if (!latestIncoming || (unreadByContact[effectiveSelectedKey] || 0) === 0) return
    let active = true
    void getSupabase().rpc('mark_support_thread_read', { p_listener: selected.listenerId, p_user: selected.userId }).then(result => {
      if (!active) return
      if (result.error) { setNotice(errorMessage(result.error)); return }
      setReadReceipts(current => [
        ...current.filter(item => item.listener_id !== selected.listenerId || item.user_id !== selected.userId),
        { listener_id: selected.listenerId, user_id: selected.userId, messages_read_at: new Date().toISOString() },
      ])
      onUnreadChange?.()
    })
    return () => { active = false }
  }, [currentUserId, effectiveSelectedKey, mode, onUnreadChange, selected, thread, unreadByContact])
  useEffect(() => {
    if (mode !== 'messages') return
    const frame = window.requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [mode, effectiveSelectedKey, thread.length])
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
    const form = event.currentTarget
    const data = new FormData(form); setBusy(true); setNotice('')
    try {
      const { error } = await getSupabase().rpc('listener_create_support_todo', { p_user: selected.userId, p_title: String(data.get('title')), p_details: String(data.get('details')), p_due_date: String(data.get('dueDate')) || null })
      if (error) throw error
      form.reset(); setTodoModalOpen(false); setRefresh(value => value + 1)
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
  return <section className={`support-workspace${mode === 'messages' ? ' support-workspace-messages' : ' support-workspace-todos'}`}>
    <header><div><span>{mode === 'messages' ? 'Conversations' : 'Shared next steps'}</span><h2>{mode === 'messages' ? 'Messages' : 'To-do list'}</h2><p>{role === 'listener' ? 'Communicate with customers from confirmed sessions.' : 'Keep in touch with your listener between appointments.'}</p></div>{mode === 'todos' && role === 'listener' && <button type="button" className="support-add-todo" onClick={() => setTodoModalOpen(true)}><Plus />Add</button>}</header>
    {notice && <p className="support-notice" role="status">{notice}</p>}
    {mode === 'messages' ? <>
      <div className="support-inbox">
        <aside className="support-contact-list" aria-label={role === 'listener' ? 'Customer conversations' : 'Listener conversations'}><div className="support-contact-list-heading"><strong>{role === 'listener' ? 'Customers' : 'Listeners'}</strong><span>{contacts.length}</span></div>{contacts.map(contact => { const key = keyFor(contact); const summary = contactSummary(contact); const unread = unreadByContact[key] || 0; return <button type="button" className={key === effectiveSelectedKey ? 'active' : ''} aria-current={key === effectiveSelectedKey ? 'true' : undefined} onClick={() => setSelectedKey(key)} key={key}><span className="support-contact-avatar" aria-hidden="true">{contact.name.trim().charAt(0).toUpperCase()}</span><span className="support-contact-copy"><strong>{contact.name}</strong><small>{summary.preview}</small></span><span className="support-contact-meta">{summary.time && <time>{summary.time}</time>}{unread > 0 && <b aria-label={`${unread} unread messages`}>{unread > 99 ? '99+' : unread}</b>}</span></button> })}</aside>
        <div className="support-conversation"><div className="support-conversation-heading"><span className="support-contact-avatar" aria-hidden="true">{selected?.name.trim().charAt(0).toUpperCase()}</span><div><strong>{selected?.name}</strong><span>{role === 'listener' ? 'Customer' : 'Listener'}</span></div></div><div className="support-thread" ref={threadRef} aria-live="polite">{thread.map(item => <article className={item.sender_user_id === currentUserId ? 'mine' : ''} key={item.id}><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></article>)}{thread.length === 0 && <div className="support-thread-empty"><MessageCircle /><strong>No messages yet</strong><span>Start the conversation with {selected?.name}.</span></div>}</div>
        <form className="support-composer" onSubmit={sendMessage}><div><textarea id="support-message" aria-label="Message" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!busy && draft.trim()) event.currentTarget.form?.requestSubmit() } }} maxLength={2000} rows={3} placeholder="Type a message" required /><button disabled={busy || !draft.trim()}><Send />Send</button></div></form></div>
      </div>
    </> : <>
      <div className="support-inbox support-todo-inbox">
        <aside className="support-contact-list" aria-label={role === 'listener' ? 'Customer task lists' : 'Listener task lists'}><div className="support-contact-list-heading"><strong>{role === 'listener' ? 'Customers' : 'Listeners'}</strong><span>{contacts.length}</span></div>{contacts.map(contact => { const key = keyFor(contact); const summary = todoSummary(contact); return <button type="button" className={key === effectiveSelectedKey ? 'active' : ''} aria-current={key === effectiveSelectedKey ? 'true' : undefined} onClick={() => setSelectedKey(key)} key={key}><span className="support-contact-avatar" aria-hidden="true">{contact.name.trim().charAt(0).toUpperCase()}</span><span className="support-contact-copy"><strong>{contact.name}</strong><small>{summary.preview}</small></span><span className="support-contact-meta">{summary.count > 0 && <b aria-label={`${summary.count} open tasks`}>{summary.count > 99 ? '99+' : summary.count}</b>}</span></button> })}</aside>
        <div className="support-todo-panel"><div className="support-conversation-heading"><span className="support-contact-avatar" aria-hidden="true">{selected?.name.trim().charAt(0).toUpperCase()}</span><div><strong>{selected?.name}</strong><span>{role === 'listener' ? 'Customer tasks' : 'Tasks from your listener'}</span></div></div><div className="support-todo-list">{assignedTodos.map(todo => <article className={todo.status} key={todo.id}><button className="support-todo-check" type="button" disabled={busy} onClick={() => setTodoStatus(todo.id, todo.status === 'completed' ? 'open' : 'completed')} aria-label={todo.status === 'completed' ? 'Reopen task' : 'Complete task'}>{todo.status === 'completed' ? <Check /> : <Circle />}</button><div><h3>{todo.title}</h3>{todo.details && <p>{todo.details}</p>}<span>{todo.due_date && <>Due {new Date(`${todo.due_date}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} · </>}{todo.status}</span></div>{role === 'listener' && <button className="support-todo-remove" type="button" disabled={busy} onClick={() => setTodoStatus(todo.id, 'cancelled')} aria-label="Remove task"><X /></button>}</article>)}{assignedTodos.length === 0 && <div className="support-thread-empty"><Check /><strong>You’re all caught up</strong><span>{role === 'listener' ? 'Add a useful next step for this customer.' : 'New tasks from your listener will appear here.'}</span></div>}</div></div>
      </div>
      {role === 'listener' && todoModalOpen && <div className="support-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setTodoModalOpen(false) }}><section className="support-todo-modal" role="dialog" aria-modal="true" aria-labelledby="support-todo-modal-title"><header><div><span>New shared task</span><h3 id="support-todo-modal-title">Add a to-do for {selected?.name}</h3></div><button type="button" aria-label="Close add to-do dialog" disabled={busy} onClick={() => setTodoModalOpen(false)}><X /></button></header><form className="support-todo-form" onSubmit={createTodo}><label><span>Task</span><input name="title" maxLength={160} placeholder="e.g. Write down one thing that helped this week" required autoFocus /></label><label><span>Notes <small>Optional</small></span><textarea name="details" maxLength={1000} rows={4} placeholder="Add helpful context for the customer" /></label><label><span>Due date <small>Optional</small></span><input name="dueDate" type="date" min={new Date().toISOString().slice(0, 10)} /></label><div className="support-todo-modal-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setTodoModalOpen(false)}>Cancel</button><button type="submit" disabled={busy}><Plus />{busy ? 'Adding…' : 'Add to-do'}</button></div></form></section></div>}
    </>}
  </section>
}
