import { useState, useEffect, useCallback } from 'react'
import { Plus, List, Columns, Calendar, Users, ArrowUpDown, Filter } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { TaskCard } from './TaskCard'
import { SortableTaskList } from './SortableTaskList'
import { KanbanView } from './KanbanView'
import { CalendarView } from './CalendarView'
import { PodsView } from './PodsView'
import { NewTaskModal } from './NewTaskModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { CheckSquare } from 'lucide-react'
import { TASK_PRIORITIES, TASK_STATUSES } from '../../lib/constants'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

const SORT_OPTIONS = [
  { id: 'manual', label: 'Manual order' },
  { id: 'created_desc', label: 'Newest first' },
  { id: 'due_asc', label: 'Due date ↑' },
  { id: 'due_desc', label: 'Due date ↓' },
  { id: 'priority', label: 'Priority' },
]

const MODE_OPTIONS = [
  { id: 'my_tasks', label: 'My Tasks' },
  { id: 'i_assigned', label: 'I Assigned' },
  { id: 'all', label: 'All' },
]

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function sortTasks(tasks, sort) {
  const copy = [...tasks]
  switch (sort) {
    case 'due_asc':
      return copy.sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date) - new Date(b.due_date)
      })
    case 'due_desc':
      return copy.sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(b.due_date) - new Date(a.due_date)
      })
    case 'priority':
      return copy.sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
      )
    case 'manual':
      return copy.sort((a, b) => {
        const leftOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER
        const rightOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER
        if (leftOrder !== rightOrder) return leftOrder - rightOrder
        return new Date(b.created_at) - new Date(a.created_at)
      })
    default:
      return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

export default function Work() {
  const { team, members } = useTeam()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [mode, setMode] = useState('my_tasks')
  const [showModal, setShowModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('todo')
  const [filters, setFilters] = useState({ priority: '', status: '' })
  const [sort, setSort] = useState('created_desc')

  const loadTasks = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const params = { mode: mode === 'all' ? undefined : mode }
      if (filters.priority) params.priority = filters.priority
      if (filters.status) params.status = filters.status
      const { tasks: data } = await api.getTasks(team.id, params)
      setTasks(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id, mode, filters.priority, filters.status])

  useEffect(() => { loadTasks() }, [loadTasks])

  useEffect(() => {
    if (!team) return
    api.getProjects(team.id).then(({ projects }) => setProjects(projects || []))
  }, [team?.id])

  useRealtime('tasks', team ? { filter: `team_id=eq.${team.id}` } : null, () => loadTasks())

  function handleCreated(task) { setTasks((prev) => [task, ...prev]) }
  function handleUpdate(updated) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t))
  }
  function handleDelete(id) { setTasks((prev) => prev.filter((t) => t.id !== id)) }

  function openModalForColumn(status) {
    setDefaultStatus(status)
    setShowModal(true)
  }

  async function handleReorder(activeId, overId) {
    const oldIndex = displayedTasks.findIndex((task) => task.id === activeId)
    const newIndex = displayedTasks.findIndex((task) => task.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const nextDisplayed = [...displayedTasks]
    const [moved] = nextDisplayed.splice(oldIndex, 1)
    nextDisplayed.splice(newIndex, 0, moved)

    const orderMap = new Map(nextDisplayed.map((task, index) => [task.id, index]))
    setTasks((prev) => prev.map((task) => (
      orderMap.has(task.id) ? { ...task, sort_order: orderMap.get(task.id) } : task
    )))

    try {
      await api.reorderTasks(team.id, null, nextDisplayed.map((task) => task.id))
    } catch (err) {
      toast.error(err.message)
      loadTasks()
    }
  }

  const activeFilters = Object.values(filters).some(Boolean)
  const displayedTasks = sortTasks(tasks, sort)
  const reorderEnabled = view === 'list' && sort === 'manual' && !activeFilters

  const views = [
    { id: 'list', icon: List, label: 'List' },
    { id: 'kanban', icon: Columns, label: 'Kanban' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'pods', icon: Users, label: 'Pods' },
  ]

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Tasks</h2>
          <p className="section-subtitle mt-0.5">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-0.5">
            {views.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                  view === id
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setDefaultStatus('todo'); setShowModal(true) }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-0.5 mb-4 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {MODE_OPTIONS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 -mb-px',
              mode === m.id
                ? 'border-brand-600 text-brand-700 dark:text-brand-400 dark:border-brand-500'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Filters + sort */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
          <Filter className="w-3.5 h-3.5" />
        </span>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer transition-all duration-150"
        >
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {view === 'list' && (
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer transition-all duration-150"
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}

        <span className="flex items-center gap-1 ml-1 text-xs text-zinc-400 dark:text-zinc-500">
          <ArrowUpDown className="w-3.5 h-3.5" />
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer transition-all duration-150"
        >
          {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>

        {activeFilters && (
          <button
            onClick={() => setFilters({ priority: '', status: '' })}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 && !activeFilters ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks here"
          description={mode === 'my_tasks' ? 'No tasks assigned to you yet.' : 'No tasks match this filter.'}
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Create task
            </button>
          }
        />
      ) : view === 'list' ? (
        reorderEnabled ? (
          <SortableTaskList tasks={displayedTasks} onUpdate={handleUpdate} onDelete={handleDelete} onReorder={handleReorder} />
        ) : (
          <div className="space-y-3">
            {displayedTasks.map((task, i) => (
              <div key={task.id} className="animate-fade-up" style={{ animationDelay: `${i * 25}ms` }}>
                <TaskCard task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        )
      ) : view === 'kanban' ? (
        <KanbanView
          tasks={displayedTasks}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAddTask={openModalForColumn}
        />
      ) : view === 'calendar' ? (
        <CalendarView tasks={displayedTasks} />
      ) : (
        <PodsView tasks={displayedTasks} members={members} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}

      {view === 'list' && sort === 'manual' && activeFilters ? (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">Clear filters to reorder tasks manually.</p>
      ) : null}

      <NewTaskModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
        projects={projects}
        defaultStatus={defaultStatus}
      />
    </div>
  )
}
