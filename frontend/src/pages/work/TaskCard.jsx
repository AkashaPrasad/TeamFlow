import { useEffect, useMemo, useState } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { Calendar, ChevronDown, MessageSquare, Pencil, Send, Trash2, User, X } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/constants'
import { getTaskStatusOptions, resolveTaskStatusChange } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { NewTaskModal } from './NewTaskModal'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

function sortComments(comments) {
  return [...(comments || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export function TaskCard({ task, onUpdate, onDelete, compact = false }) {
  const { team } = useTeam()
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [showReasonBox, setShowReasonBox] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editProjects, setEditProjects] = useState(task.projects ? [task.projects] : [])
  const [reason, setReason] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [submittingReason, setSubmittingReason] = useState(false)
  const [submittingChat, setSubmittingChat] = useState(false)

  const priorityInfo = TASK_PRIORITIES.find((p) => p.id === task.priority)
  const statusInfo = TASK_STATUSES.find((s) => s.id === task.status)
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date))
  const isAssignee = task.profiles?.id === user?.id
  const isCreator = task.creator?.id === user?.id
  const isLockedForAssignee = task.status === 'couldnt_do' && isAssignee && !isCreator
  const statusOptions = getTaskStatusOptions(task, user?.id)
  const currentStatusInfo = TASK_STATUSES.find((status) => status.id === task.status)
  const selectedStatusValue =
    statusOptions.find((option) => option.status === task.status)?.value ?? task.status
  const visibleStatusOptions = statusOptions.some((option) => option.value === selectedStatusValue)
    ? statusOptions
    : [{ value: task.status, status: task.status, label: currentStatusInfo?.label || task.status }, ...statusOptions]
  const canChangeStatus = statusOptions.length > 0 && !isLockedForAssignee
  const comments = useMemo(() => sortComments(task.task_comments), [task.task_comments])
  const latestCouldntDoComment = [...comments].reverse().find((comment) =>
    comment.content?.startsWith("❌ Couldn't do:")
  )
  const canDelete = isCreator
  const canEdit = isCreator

  useEffect(() => {
    if (!showEditModal) return
    let cancelled = false
    api.getProjects(team.id).then(({ projects }) => {
      if (!cancelled) setEditProjects(projects || [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [showEditModal, team.id])

  async function updateStatus(status) {
    try {
      const { task: updated } = await api.updateTask(team.id, task.id, { status })
      onUpdate?.(updated)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleStatusChange(newStatus) {
    const resolved = resolveTaskStatusChange(task, user?.id, newStatus)
    if (!resolved.allowed) return
    if (resolved.status === 'couldnt_do') {
      setShowReasonBox(true)
      return
    }
    await updateStatus(resolved.status)
    if (resolved.message) toast.success(resolved.message)
  }

  async function submitReason(e) {
    e.preventDefault()
    setSubmittingReason(true)
    try {
      const detail = reason.trim()
      if (detail) await api.addTaskComment(task.id, `❌ Couldn't do: ${detail}`)
      await updateStatus('couldnt_do')
      setShowReasonBox(false)
      setReason('')
      setExpanded(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingReason(false)
    }
  }

  async function submitChat(e) {
    e.preventDefault()
    const message = chatMessage.trim()
    if (!message) return
    setSubmittingChat(true)
    try {
      const { task: updated } = await api.addTaskComment(task.id, message)
      onUpdate?.(updated)
      setChatMessage('')
      setChatOpen(true)
      setExpanded(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingChat(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    try {
      await api.deleteTask(team.id, task.id)
      onDelete?.(task.id)
    } catch (err) {
      toast.error(err.message)
    }
  }

  function handleSave(updated) {
    onUpdate?.(updated)
    setShowEditModal(false)
    setExpanded(true)
  }

  function openChat() {
    setExpanded(true)
    setChatOpen(true)
  }

  if (compact) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-200 cursor-grab active:cursor-grabbing">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-white leading-snug line-clamp-2">{task.title}</p>
          {canDelete && (
            <button onClick={handleDelete} className="p-0.5 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {task.projects && (
          <p className="text-xs text-brand-600 dark:text-brand-400 mb-1.5 truncate">{task.projects.name}</p>
        )}
        {latestCouldntDoComment && (
          <p className="mb-2 text-[11px] text-amber-600 dark:text-amber-400 line-clamp-2">
            {latestCouldntDoComment.content.replace("❌ Couldn't do:", '').trim()}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${priorityInfo?.dot || 'bg-zinc-400'}`} />
            {task.due_date && (
              <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
          </div>
          {task.profiles && (
            <Avatar name={task.profiles.name} src={task.profiles.avatar_url} size="xs" />
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'card p-4 cursor-pointer transition-all duration-200',
          'hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
          expanded && 'ring-1 ring-brand-200 dark:ring-brand-900/40 border-brand-200/60 dark:border-brand-900/40'
        )}
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1.5">
              <span className={`mt-[5px] w-2 h-2 rounded-full shrink-0 ${priorityInfo?.dot || 'bg-zinc-300'}`} />
              <div className="min-w-0">
                <p className={`text-sm font-semibold text-zinc-900 dark:text-white leading-snug ${expanded ? '' : 'line-clamp-1'}`}>{task.title}</p>
                {!expanded && task.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{task.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pl-4">
              <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
              <Badge color={priorityInfo?.color}>{priorityInfo?.label}</Badge>
              {task.projects && (
                <span className="text-xs text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-md">{task.projects.name}</span>
              )}
              {task.due_date && (
                <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-zinc-400'}`}>
                  <Calendar className="w-3 h-3" />
                  {isOverdue ? 'Overdue · ' : ''}{format(parseISO(task.due_date), 'MMM d, yyyy')}
                </span>
              )}
            </div>

            {!expanded && latestCouldntDoComment && (
              <p className="mt-1.5 pl-4 text-xs text-amber-600 dark:text-amber-400 line-clamp-1">
                Couldn't do: {latestCouldntDoComment.content.replace("❌ Couldn't do:", '').trim()}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-[130px] text-right">
              {task.creator && (
                <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">{task.creator.name}</span>
                </div>
              )}
              {task.profiles && (
                <div className="mt-1 flex items-center justify-end gap-1.5 text-xs text-zinc-400">
                  <span className="truncate">{task.profiles.name}</span>
                  <Avatar name={task.profiles.name} src={task.profiles.avatar_url} size="xs" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={openChat}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-150"
                title="Team chat"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{comments.length}</span>
              </button>
              {canChangeStatus && (
                <select
                  value={selectedStatusValue}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 bg-white dark:bg-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all duration-150 cursor-pointer"
                >
                  {visibleStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              )}
              {canEdit && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                  title="Edit ticket"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete} className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete ticket">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4" onClick={(e) => e.stopPropagation()}>
            {task.description && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Description</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Team Chat</p>
                <span className="text-[11px] text-zinc-400">
                  {comments.length} {comments.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
              <form
                onSubmit={submitChat}
                className={cn(
                  'flex gap-2 items-center rounded-xl border p-2.5',
                  isLockedForAssignee
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
                    : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'
                )}
              >
                <input
                  autoFocus={chatOpen}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={isLockedForAssignee || submittingChat}
                  placeholder={
                    isLockedForAssignee
                      ? 'Ticket locked until creator reopens it.'
                      : 'Comment on this ticket…'
                  }
                  className="flex-1 bg-transparent text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 outline-none disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={isLockedForAssignee || submittingChat || !chatMessage.trim()}
                  className="p-1.5 bg-brand-600 text-white rounded-lg disabled:opacity-40 hover:bg-brand-500 transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>

              {comments.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">No messages yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {comments.map((comment) => {
                    const isCouldntDo = comment.content?.startsWith("❌ Couldn't do:")
                    const isReopen = comment.content?.startsWith('↩ Reopened:')
                    return (
                      <div
                        key={comment.id}
                        className={cn(
                          'rounded-xl border px-3 py-2.5',
                          isCouldntDo
                            ? 'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10'
                            : isReopen
                              ? 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10'
                              : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={comment.profiles?.name} src={comment.profiles?.avatar_url} size="xs" />
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">{comment.profiles?.name || 'User'}</span>
                          </div>
                          <span className="text-[11px] text-zinc-400 shrink-0">
                            {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {showReasonBox && (
              <form onSubmit={submitReason} className="flex gap-2 items-center bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/60 rounded-xl p-2.5">
                <input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why couldn't you do this?"
                  className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 outline-none"
                />
                <button type="button" onClick={() => setShowReasonBox(false)} className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button type="submit" disabled={submittingReason || !reason.trim()} className="p-1.5 bg-red-500 text-white rounded-lg disabled:opacity-40 hover:bg-red-600 transition-colors">
                  <Send className="w-3 h-3" />
                </button>
              </form>
            )}

            {isLockedForAssignee && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                This ticket is locked for you until the creator reopens or reassigns it.
              </p>
            )}
          </div>
        )}
      </div>

      <NewTaskModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={handleSave}
        projects={editProjects}
        task={task}
        title="Edit Ticket"
      />
    </>
  )
}
