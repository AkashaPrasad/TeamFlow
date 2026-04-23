import { useState, useEffect } from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { EmptyState } from '../../components/ui/EmptyState'

export default function Projects() {
  const { team } = useTeam()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!team) return
    loadProjects()
  }, [team?.id])

  async function loadProjects() {
    setLoading(true)
    try {
      const { projects: data } = await api.getProjects(team.id)
      setProjects(data || [])
    } finally {
      setLoading(false)
    }
  }

  function handleCreated(project) {
    setProjects((prev) => [{ ...project, task_count: 0, completed_task_count: 0, progress: 0, project_members: [] }, ...prev])
  }

  function handleDelete(id) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projects</h2>
          <p className="text-sm text-gray-500">{projects.length} projects</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-4" />
              <div className="h-1.5 bg-gray-200 rounded w-full mb-4" />
              <div className="flex gap-1">
                {[1, 2, 3].map((j) => <div key={j} className="w-6 h-6 rounded-full bg-gray-200" />)}
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Organize your campaigns and initiatives into projects with timelines and goals."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create first project
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <NewProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
