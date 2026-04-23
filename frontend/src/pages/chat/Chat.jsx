import { useState, useEffect, useRef, useCallback } from 'react'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { uploadFileToCloudinary } from '../../lib/cloudinary'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/Avatar'
import { cn } from '../../lib/utils'
import { Send, Paperclip, Hash, Download, X, Loader2, Trash2 } from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

function formatMsgTime(ts) {
  const d = parseISO(ts)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`
  return format(d, 'MMM d, h:mm a')
}

function FileAttachment({ attachment, isOwn }) {
  const isImage = attachment?.type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment?.url || '')
  if (!attachment) return null
  return (
    <div className="mb-1.5">
      {isImage ? (
        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-w-full max-h-48 rounded-xl object-contain cursor-zoom-in"
          />
        </a>
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors',
            isOwn
              ? 'bg-white/15 hover:bg-white/25 text-white'
              : 'bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200'
          )}
        >
          <Paperclip className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[180px] font-medium">{attachment.name}</span>
          <Download className="w-3 h-3 shrink-0 ml-auto opacity-60" />
        </a>
      )}
    </div>
  )
}

function MessageBubble({ msg, isOwn, onDelete }) {
  return (
    <div className={cn('flex gap-2.5 group', isOwn && 'flex-row-reverse')}>
      {!isOwn && (
        <Avatar name={msg.sender?.name} src={msg.sender?.avatar_url} size="xs" className="mt-1 shrink-0" />
      )}
      <div className={cn('max-w-[68%]', isOwn && 'flex flex-col items-end')}>
        {!isOwn && (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1 pl-1">{msg.sender?.name}</p>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isOwn
              ? 'bg-brand-600 text-white rounded-br-md'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
          )}
        >
          {msg.attachment && <FileAttachment attachment={msg.attachment} isOwn={isOwn} />}
          {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
        </div>
        <p className={cn('text-[10px] text-zinc-400 mt-1 px-1', isOwn && 'text-right')}>
          {formatMsgTime(msg.created_at)}
        </p>
      </div>
      {isOwn && (
        <button
          onClick={() => onDelete(msg.id)}
          className="self-start mt-1 p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          title="Delete message"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default function Chat() {
  const { team, members } = useTeam()
  const { user } = useAuth()
  const [activeConv, setActiveConv] = useState('team')
  const [messages, setMessages] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const messagesEndRef = useRef(null)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)

  const otherMembers = members.filter((m) => m.user_id !== user?.id)
  const activePartner = activeConv !== 'team' ? members.find((m) => m.user_id === activeConv) : null

  const loadMessages = useCallback(async () => {
    if (!team) return
    setLoadingMsgs(true)
    try {
      if (activeConv === 'team') {
        const { messages: data } = await api.getTeamMessages(team.id)
        setMessages(data)
      } else {
        const { messages: data } = await api.getDMs(team.id, activeConv)
        setMessages(data)
        await api.markDMsRead(team.id, activeConv)
        setUnreadCounts((prev) => ({ ...prev, [activeConv]: 0 }))
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingMsgs(false)
    }
  }, [team?.id, activeConv])

  useEffect(() => { loadMessages() }, [loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load unread counts on mount
  useEffect(() => {
    if (!team) return
    api.getDMUnreadCounts(team.id)
      .then(({ counts }) => setUnreadCounts(counts))
      .catch(() => {})
  }, [team?.id])

  // Real-time: team messages
  useEffect(() => {
    if (!team) return

    const teamCh = supabase
      .channel(`team_msgs_${team.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'team_messages',
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        supabase
          .from('team_messages')
          .select('*, sender:profiles!sender_id(id, name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }) => {
            if (!data) return
            if (activeConv === 'team') {
              setMessages((prev) => [...prev, data])
            }
          })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_messages' }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(teamCh) }
  }, [team?.id, activeConv])

  // Real-time: direct messages
  useEffect(() => {
    if (!team || !user) return

    const dmCh = supabase
      .channel(`dms_${team.id}_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        const { sender_id, receiver_id } = payload.new
        if (receiver_id !== user.id && sender_id !== user.id) return

        const isCurrentConv = activeConv !== 'team' && (
          (sender_id === activeConv && receiver_id === user.id) ||
          (sender_id === user.id && receiver_id === activeConv)
        )

        supabase
          .from('direct_messages')
          .select('*, sender:profiles!sender_id(id, name, avatar_url)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }) => {
            if (!data) return
            if (isCurrentConv) {
              setMessages((prev) => [...prev, data])
              if (receiver_id === user.id) {
                api.markDMsRead(team.id, sender_id).catch(() => {})
              }
            } else if (receiver_id === user.id) {
              setUnreadCounts((prev) => ({ ...prev, [sender_id]: (prev[sender_id] || 0) + 1 }))
            }
          })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(dmCh) }
  }, [team?.id, user?.id, activeConv])

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const result = await uploadFileToCloudinary(file, 'teamflow/chat')
      setPendingFile(result)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() && !pendingFile) return
    setSending(true)
    try {
      if (activeConv === 'team') {
        await api.sendTeamMessage(team.id, text.trim() || null, pendingFile)
      } else {
        await api.sendDM(team.id, activeConv, text.trim() || null, pendingFile)
      }
      setText('')
      setPendingFile(null)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(msgId) {
    try {
      if (activeConv === 'team') {
        await api.deleteTeamMessage(msgId)
      } else {
        await api.deleteDM(msgId)
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleTextareaInput(e) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden">
      {/* Conversation list */}
      <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800/60 flex flex-col bg-white dark:bg-zinc-950">
        <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60">
          <h2 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Messages</h2>
        </div>

        <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto py-1.5">
          {/* Team chat */}
          <button
            onClick={() => setActiveConv('team')}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left shrink-0 md:w-full',
              activeConv === 'team'
                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <span className="truncate">Team Chat</span>
          </button>

          {/* DM section */}
          {otherMembers.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 shrink-0">
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Direct</p>
              </div>
              {otherMembers.map((m) => {
                const unread = unreadCounts[m.user_id] || 0
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setActiveConv(m.user_id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 transition-colors text-left shrink-0 md:w-full',
                      activeConv === m.user_id
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar name={m.profiles?.name} src={m.profiles?.avatar_url} size="sm" />
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                    <span className={cn('text-sm truncate', unread > 0 && 'font-semibold')}>{m.profiles?.name}</span>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 min-h-0">
        {/* Thread header */}
        <div className="h-14 px-5 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-3 shrink-0">
          {activeConv === 'team' ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shrink-0">
                <Hash className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Team Chat</p>
                <p className="text-[11px] text-zinc-400">{members.length} members</p>
              </div>
            </>
          ) : (
            <>
              <Avatar name={activePartner?.profiles?.name} src={activePartner?.profiles?.avatar_url} size="sm" />
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{activePartner?.profiles?.name}</p>
                <p className="text-[11px] text-zinc-400">Direct message</p>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-zinc-300 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                {activeConv === 'team'
                  ? <Hash className="w-5 h-5 text-zinc-400" />
                  : <Avatar name={activePartner?.profiles?.name} src={activePartner?.profiles?.avatar_url} size="sm" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {activeConv === 'team' ? 'Team Chat' : activePartner?.profiles?.name}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {activeConv === 'team' ? 'Send a message to your whole team.' : `Start a conversation with ${activePartner?.profiles?.name}.`}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.sender_id === user?.id}
                onDelete={handleDelete}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
          {pendingFile && (
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl px-3 py-2 mb-2">
              <Paperclip className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1">{pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} className="text-zinc-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingFile}
              className="p-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
              title="Attach file"
            >
              {uploadingFile
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Paperclip className="w-4 h-4" />
              }
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextareaInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder={activeConv === 'team' ? 'Message team… (Enter to send)' : `Message ${activePartner?.profiles?.name}…`}
              rows={1}
              className="flex-1 input resize-none py-2.5 leading-normal min-h-[42px]"
            />
            <button
              type="submit"
              disabled={sending || (!text.trim() && !pendingFile)}
              className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0 active:scale-95"
            >
              {sending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
