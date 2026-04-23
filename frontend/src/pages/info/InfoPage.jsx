import { useState, useEffect, useCallback } from 'react'
import { Plus, Eye, EyeOff, Copy, Check, Trash2, Link, X } from 'lucide-react'
import { api } from '../../lib/api'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { INFO_TYPES, API_PROVIDERS } from '../../lib/constants'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

function InfoCard({ item, onDelete }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const typeInfo = INFO_TYPES.find((t) => t.id === item.type)
  const providerInfo = API_PROVIDERS.find((p) => p.id === item.provider)

  async function copyContent() {
    await navigator.clipboard.writeText(item.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied!')
  }

  async function handleDelete() {
    if (!confirm('Delete this info box?')) return
    try {
      await api.deleteInfoItem(item.id)
      onDelete(item.id)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const renderContent = () => {
    switch (item.type) {
      case 'photo':
        return item.content ? (
          <img src={item.content} alt={item.title} className="w-full h-40 object-cover rounded-lg mt-2" />
        ) : <p className="text-xs text-zinc-400 mt-2">No image</p>

      case 'api_key':
        return (
          <div className="mt-2 space-y-2">
            {providerInfo && (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: providerInfo.color }}
                />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{providerInfo.label}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
              <code className="flex-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
                {visible ? item.content : '•'.repeat(Math.min(item.content?.length || 8, 32))}
              </code>
              <button onClick={() => setVisible((v) => !v)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0">
                {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={copyContent} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )

      case 'number':
        return (
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{item.content}</p>
        )

      case 'prompt':
      case 'claude_skill':
        return (
          <div className="mt-2 relative">
            <pre className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 font-mono line-clamp-6">
              {item.content}
            </pre>
            <button
              onClick={copyContent}
              className="absolute top-2 right-2 p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-400 hover:text-zinc-600"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )

      default: // text
        return (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap line-clamp-4">{item.content}</p>
        )
    }
  }

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeInfo?.icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{item.title}</h3>
            <p className="text-xs text-zinc-400">{typeInfo?.label}</p>
          </div>
        </div>
        <button onClick={handleDelete} className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {renderContent()}

      {item.note && (
        <div className="mt-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Note</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{item.note}</p>
        </div>
      )}

      {item.tasks && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
          <Link className="w-3 h-3" />
          <span>{item.tasks.title}</span>
        </div>
      )}

      {item.creator && (
        <div className="mt-3 flex items-center gap-1.5">
          <Avatar name={item.creator?.name} src={item.creator?.avatar_url} size="xs" />
          <span className="text-xs text-zinc-400">{item.creator?.name}</span>
        </div>
      )}
    </div>
  )
}

function CreateInfoModal({ open, onClose, onCreated, tasks }) {
  const { team } = useTeam()
  const [type, setType] = useState('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [note, setNote] = useState('')
  const [provider, setProvider] = useState('')
  const [taskId, setTaskId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setType('text'); setTitle(''); setContent(''); setNote(''); setProvider(''); setTaskId('')
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadToCloudinary(file, 'teampost/info')
      setContent(url)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title required')
    setSaving(true)
    try {
      const { item } = await api.createInfoItem(team.id, {
        title: title.trim(),
        type,
        content: content.trim() || null,
        note: note.trim() || null,
        provider: provider || null,
        task_id: taskId || null,
      })
      onCreated(item)
      toast.success('Info box created!')
      reset()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const renderContentField = () => {
    switch (type) {
      case 'photo':
        return (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Image</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="input" />
            {uploading && <p className="text-xs text-zinc-400 mt-1">Uploading…</p>}
            {content && <img src={content} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
          </div>
        )
      case 'api_key':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Provider</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
                <option value="">Select provider…</option>
                {API_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">API Key</label>
              <input
                type="password"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="sk-…"
                className="input font-mono"
              />
            </div>
          </>
        )
      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Value</label>
            <input type="number" value={content} onChange={(e) => setContent(e.target.value)} placeholder="0" className="input" />
          </div>
        )
      case 'prompt':
      case 'claude_skill':
        return (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {type === 'claude_skill' ? 'Instructions / Skill' : 'Prompt'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'claude_skill' ? 'You are a helpful assistant…' : 'Write a compelling post about…'}
              rows={5}
              className="input resize-none font-mono text-xs"
            />
          </div>
        )
      default:
        return (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Notes, links, any text…"
              rows={4}
              className="input resize-none"
            />
          </div>
        )
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="New Info Box">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {INFO_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setType(t.id); setContent(''); setProvider('') }}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                  type === t.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-500'
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-xs font-medium leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Groq API Key" className="input" required />
        </div>

        {/* Dynamic content field */}
        {renderContentField()}

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for this box…"
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Link to task */}
        {tasks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Link to task (optional)</label>
            <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input">
              <option value="">No task</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => { reset(); onClose() }} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function InfoPage() {
  const { team } = useTeam()
  const [items, setItems] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')

  const loadItems = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const { items: data } = await api.getInfoItems(team.id)
      setItems(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id])

  useEffect(() => { loadItems() }, [loadItems])

  useEffect(() => {
    if (!team) return
    api.getTasks(team.id).then(({ tasks }) => setTasks(tasks || []))
  }, [team?.id])

  useRealtime('info_items', team ? { filter: `team_id=eq.${team.id}` } : null, loadItems)

  function handleCreated(item) { setItems((prev) => [item, ...prev]) }
  function handleDelete(id) { setItems((prev) => prev.filter((i) => i.id !== id)) }

  const displayed = filter
    ? items.filter((i) => i.type === filter)
    : items

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Info</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Team knowledge base — API keys, prompts, notes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Box
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            filter === ''
              ? 'bg-brand-600 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          All ({items.length})
        </button>
        {INFO_TYPES.map((t) => {
          const count = items.filter((i) => i.type === t.id).length
          if (count === 0) return null
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                filter === t.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {t.icon} {t.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-3" />
              <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No info boxes yet"
          description="Store API keys, prompts, notes, and other team knowledge here."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create first box
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((item) => (
            <InfoCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateInfoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
        tasks={tasks}
      />
    </div>
  )
}
