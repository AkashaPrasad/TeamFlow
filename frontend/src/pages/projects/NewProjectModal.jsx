import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { PROJECT_STATUSES, PLATFORMS } from '../../lib/constants'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function NewProjectModal({ open, onClose, onCreated }) {
  const { team, members } = useTeam()
  const [form, setForm] = useState({
    name: '',
    description: '',
    goals: [''],
    start_date: '',
    end_date: '',
    member_ids: [],
    platforms: [],
    status: 'planning',
    notes: '',
    visibility: 'team',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function setGoal(i, val) {
    const goals = [...form.goals]
    goals[i] = val
    set('goals', goals)
  }

  function addGoal() { set('goals', [...form.goals, '']) }
  function removeGoal(i) { set('goals', form.goals.filter((_, j) => j !== i)) }

  function toggleMember(uid) {
    set('member_ids', form.member_ids.includes(uid) ? form.member_ids.filter((id) => id !== uid) : [...form.member_ids, uid])
  }

  function togglePlatform(id) {
    set('platforms', form.platforms.includes(id) ? form.platforms.filter((p) => p !== id) : [...form.platforms, id])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Project name required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        goals: form.goals.filter((g) => g.trim()),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
      }
      const { project } = await api.createProject(team.id, payload)
      onCreated(project)
      toast.success('Project created!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Project name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Q2 LinkedIn Campaign" className="input" required />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What is this project about?" rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start date</label>
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target completion</label>
            <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input">
              {PROJECT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Goals</label>
          <div className="space-y-2">
            {form.goals.map((g, i) => (
              <div key={i} className="flex gap-2">
                <input value={g} onChange={(e) => setGoal(i, e.target.value)} placeholder={`Goal ${i + 1}`} className="input flex-1" />
                {form.goals.length > 1 && (
                  <button type="button" onClick={() => removeGoal(i)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addGoal} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add goal
            </button>
          </div>
        </div>

        {/* Platform focus */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platform focus</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  form.platforms.includes(p.id) ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={form.platforms.includes(p.id) ? { backgroundColor: p.color } : {}}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign members</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => toggleMember(m.user_id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  form.member_ids.includes(m.user_id) ? 'bg-brand-600 text-white border-transparent' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {m.profiles?.name}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visibility</label>
          <div className="flex gap-2">
            {[{ id: 'team', label: '👥 Team — everyone can see', desc: 'All team members' }, { id: 'private', label: '🔒 Private — selected members only', desc: 'Only assigned members' }].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => set('visibility', v.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all text-left ${
                  form.visibility === v.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {form.visibility === 'private' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">Only members you assign will be able to view this project.</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional context…" rows={2} className="input resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating…' : 'Create Project'}</button>
        </div>
      </form>
    </Modal>
  )
}
