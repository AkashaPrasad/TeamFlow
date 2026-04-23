import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ArrowLeft, GripVertical, Plus, Target, Calendar } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { TaskCard } from '../work/TaskCard'
import { NewTaskModal } from '../work/NewTaskModal'
import { SortableTaskList } from '../work/SortableTaskList'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { PROJECT_STATUSES, PLATFORMS } from '../../lib/constants'
import toast from 'react-hot-toast'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const { team } = useTeam()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)

  useEffect(() => {
    if (!team) return
    loadProject()
  }, [team?.id, projectId])

  async function loadProject() {
    setLoading(true)
    try {
      const { project: data } = await api.getProject(team.id, projectId)
      setProject(data)
      setTasks(data.tasks || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleTaskCreated(task) { setTasks((prev) => [task, ...prev]) }
  function handleTaskUpdate(updated) { setTasks((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t)) }
  function handleTaskDelete(id) { setTasks((prev) => prev.filter((t) => t.id !== id)) }

  async function handleTaskReorder(activeId, overId) {
    const oldIndex = tasks.findIndex((task) => task.id === activeId)
    const newIndex = tasks.findIndex((task) => task.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const next = [...tasks]
    const [moved] = next.splice(oldIndex, 1)
    next.splice(newIndex, 0, moved)
    setTasks(next.map((task, index) => ({ ...task, sort_order: index })))

    try {
      await api.reorderTasks(team.id, project.id, next.map((task) => task.id))
    } catch (err) {
      toast.error(err.message)
      loadProject()
    }
  }

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="card p-5 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    </div>
  )

  if (!project) return <div className="p-6 text-center text-gray-500">Project not found</div>

  const statusInfo = PROJECT_STATUSES.find((s) => s.id === project.status)
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0

  const totalDays = project.start_date && project.end_date
    ? differenceInDays(parseISO(project.end_date), parseISO(project.start_date))
    : null

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
            <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
          </div>
          {project.description && <p className="text-gray-500">{project.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Overview card */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="font-semibold text-brand-600">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{doneTasks} of {tasks.length} tasks complete</p>
          </div>

          {/* Timeline */}
          {(project.start_date || project.end_date) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 text-brand-500" />
              {project.start_date && format(parseISO(project.start_date), 'MMM d, yyyy')}
              {project.start_date && project.end_date && ' — '}
              {project.end_date && format(parseISO(project.end_date), 'MMM d, yyyy')}
              {totalDays && <span className="text-gray-400">({totalDays} days)</span>}
            </div>
          )}

          {/* Goals */}
          {project.goals?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                <Target className="w-4 h-4 text-brand-500" />
                Goals
              </h3>
              <ul className="space-y-1">
                {project.goals.filter(Boolean).map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-brand-400 mt-0.5">•</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Platforms */}
          {project.platforms?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Platform focus</h3>
              <div className="flex gap-2 flex-wrap">
                {project.platforms.map((pid) => {
                  const plat = PLATFORMS.find((p) => p.id === pid)
                  return plat ? (
                    <span key={pid} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white font-medium" style={{ backgroundColor: plat.color }}>
                      {plat.icon} {plat.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes</h3>
              <p className="text-sm text-gray-500 whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Team members</h3>
          <div className="space-y-3">
            {(project.project_members || []).map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.profiles?.name} src={m.profiles?.avatar_url} size="sm" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{m.profiles?.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tasks ({tasks.length})</h2>
          <div className="flex items-center gap-2">
            {tasks.length > 1 ? (
              <button
                type="button"
                onClick={() => setReorderMode((value) => !value)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  reorderMode
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                <GripVertical className="w-3.5 h-3.5" />
                Reorder
              </button>
            ) : null}
            <button onClick={() => setShowTaskModal(true)} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No tasks yet. Add tasks to track progress.</div>
        ) : reorderMode ? (
          <SortableTaskList tasks={tasks} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} onReorder={handleTaskReorder} />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
            ))}
          </div>
        )}
      </div>

      <NewTaskModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onCreated={handleTaskCreated}
        projects={[{ id: project.id, name: project.name }]}
      />
    </div>
  )
}
