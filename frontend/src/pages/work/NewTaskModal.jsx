import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { TASK_PRIORITIES } from '../../lib/constants'
import { CREATOR_STATUS_OPTIONS } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import toast from 'react-hot-toast'

const DRAFT_KEY = 'draft_new_task'
const DEFAULT_CREATOR_STATUS = 'todo'

function normalizeStatus(status) {
  return CREATOR_STATUS_OPTIONS.some((option) => option.status === status)
    ? status
    : DEFAULT_CREATOR_STATUS
}

function buildForm(task, defaultStatus) {
  return {
    title: task?.title || '',
    description: task?.description || '',
    assignee_id: task?.assignee_id || '',
    priority: task?.priority || 'medium',
    status: normalizeStatus(task?.status || defaultStatus),
    due_date: task?.due_date || '',
    project_id: task?.project_id || '',
    visibility: task?.visibility || 'team',
    reopen_note: '',
  }
}

export function NewTaskModal({
  open,
  onClose,
  onCreated,
  onSaved,
  projects = [],
  defaultStatus = 'todo',
  task = null,
  title = null,
}) {
  const { team, members } = useTeam()
  const [form, setForm] = useState(buildForm(task, defaultStatus))
  const [saving, setSaving] = useState(false)

  const isEditing = Boolean(task)

  useEffect(() => {
    if (!open) return
    if (task) {
      setForm(buildForm(task, defaultStatus))
    } else {
      try {
        const saved = localStorage.getItem(DRAFT_KEY)
        if (saved) {
          setForm({ ...buildForm(null, defaultStatus), ...JSON.parse(saved) })
        } else {
          setForm(buildForm(null, defaultStatus))
        }
      } catch {
        setForm(buildForm(null, defaultStatus))
      }
    }
  }, [task, defaultStatus, open])

  // Persist draft for new tasks only
  useEffect(() => {
    if (!open || isEditing) return
    const { reopen_note, ...draftable } = form
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftable))
  }, [form, open, isEditing])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const wasCouldntDo = task?.status === 'couldnt_do'
  const assigneeChanged = isEditing && (task.assignee_id || '') !== (form.assignee_id || '')
  const statusChanged = isEditing && task.status !== form.status
  const reopenedFromCouldntDo = wasCouldntDo && (assigneeChanged || statusChanged)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Task title required')
    if (reopenedFromCouldntDo && !form.reopen_note.trim()) {
      return toast.error('Add a reopen reason before reassigning or reopening this ticket')
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        assignee_id: form.assignee_id || null,
        priority: form.priority,
        status:
          wasCouldntDo && assigneeChanged && form.status === 'couldnt_do'
            ? 'todo'
            : form.status,
        due_date: form.due_date || null,
        project_id: form.project_id || null,
        visibility: form.visibility,
      }

      let savedTask
      if (isEditing) {
        const { task: updated } = await api.updateTask(team.id, task.id, payload)
        savedTask = updated
      } else {
        const { task: created } = await api.createTask(team.id, payload)
        savedTask = created
      }

      if (isEditing && reopenedFromCouldntDo) {
        await api.addTaskComment(
          task.id,
          `↩ Reopened by ${members.find((member) => member.user_id === savedTask.created_by)?.profiles?.name || 'creator'}: ${form.reopen_note.trim()}`
        )
        const { task: refreshed } = await api.updateTask(team.id, task.id, {})
        savedTask = refreshed
      }

      if (isEditing) {
        onSaved?.(savedTask)
        toast.success('Ticket updated!')
      } else {
        onCreated?.(savedTask)
        localStorage.removeItem(DRAFT_KEY)
        toast.success('Task created!')
      }

      onClose()
      setForm(buildForm(null, defaultStatus))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title || (isEditing ? 'Edit Ticket' : 'New Task')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Task name *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Write LinkedIn post copy" className="input" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional details…" rows={3} className="input resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Assign to</label>
            <select value={form.assignee_id} onChange={(e) => set('assignee_id', e.target.value)} className="input">
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.profiles?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Priority</label>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="input">
              {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              {CREATOR_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.status}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Due date</label>
            <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} className="input" />
          </div>
        </div>
        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Link to project</label>
            <select value={form.project_id} onChange={(e) => set('project_id', e.target.value)} className="input">
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {reopenedFromCouldntDo && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Reopen reason *</label>
            <textarea
              value={form.reopen_note}
              onChange={(e) => set('reopen_note', e.target.value)}
              placeholder="Why are you reopening or reassigning this ticket?"
              rows={3}
              className="input resize-none"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Visibility</label>
          <div className="flex gap-2">
            {[{ id: 'team', label: 'Team' }, { id: 'private', label: 'Only me' }].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => set('visibility', v.id)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  form.visibility === v.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Ticket' : 'Create Task')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
