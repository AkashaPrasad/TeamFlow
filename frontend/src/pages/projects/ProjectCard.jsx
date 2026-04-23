import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Calendar, ArrowRight, Trash2 } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { GlowingCard } from '../../components/aceternity/GlowingCard'
import { PROJECT_STATUSES, PLATFORMS } from '../../lib/constants'
import { PLATFORM_ICONS } from '../../components/icons/PlatformIcons'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import toast from 'react-hot-toast'

export function ProjectCard({ project, onDelete }) {
  const { team, isAdmin } = useTeam()
  const statusInfo = PROJECT_STATUSES.find((s) => s.id === project.status)
  const members = project.project_members || []

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Delete this project? All linked tasks will be unlinked.')) return
    try {
      await api.deleteProject(team.id, project.id)
      onDelete?.(project.id)
    } catch (err) { toast.error(err.message) }
  }

  return (
    <Link to={`/projects/${project.id}`} className="block group">
      <GlowingCard className="p-5 transition-transform duration-200 group-hover:-translate-y-0.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge color={statusInfo?.color}>{statusInfo?.label}</Badge>
            {isAdmin && (
              <button
                onClick={handleDelete}
                className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Platform icons */}
        {project.platforms?.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {project.platforms.map((pid) => {
              const plat = PLATFORMS.find((p) => p.id === pid)
              const Icon = PLATFORM_ICONS[pid]
              return plat && Icon ? (
                <span
                  key={pid}
                  title={plat.label}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                  style={{ backgroundColor: plat.color }}
                >
                  <Icon className="w-2.5 h-2.5" />
                </span>
              ) : null
            })}
          </div>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400 dark:text-zinc-500">{project.completed_task_count ?? 0}/{project.task_count ?? 0} tasks</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">{project.progress ?? 0}%</span>
          </div>
          <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${project.progress ?? 0}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {members.slice(0, 4).map((m) => (
                <Avatar key={m.id} name={m.profiles?.name} src={m.profiles?.avatar_url} size="xs" className="ring-2 ring-white dark:ring-zinc-900" />
              ))}
              {members.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  +{members.length - 4}
                </div>
              )}
            </div>
            {(project.start_date || project.end_date) && (
              <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <Calendar className="w-3 h-3" />
                {project.start_date && format(parseISO(project.start_date), 'MMM d')}
                {project.start_date && project.end_date && ' → '}
                {project.end_date && format(parseISO(project.end_date), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all duration-150" />
        </div>
      </GlowingCard>
    </Link>
  )
}
