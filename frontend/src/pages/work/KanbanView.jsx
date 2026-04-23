import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { TASK_STATUSES } from '../../lib/constants'
import { resolveTaskStatusChange } from '../../lib/taskStatusRules'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useAuth } from '../../contexts/AuthContext'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'

function SortableTask({ task, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onUpdate={onUpdate} onDelete={onDelete} compact />
    </div>
  )
}

export function KanbanView({ tasks, onUpdate, onDelete, onAddTask }) {
  const { team } = useTeam()
  const { user } = useAuth()
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeTask = tasks.find((t) => t.id === activeId)

  async function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const overTask = tasks.find((t) => t.id === over.id)
    const overColumn = TASK_STATUSES.find((s) => s.id === over.id)

    const newStatus = overColumn?.id || overTask?.status
    const activeTask = tasks.find((t) => t.id === active.id)

    if (newStatus && newStatus !== activeTask?.status) {
      const resolved = resolveTaskStatusChange(activeTask, user?.id, newStatus)
      if (!resolved.allowed) return
      if (resolved.status === activeTask?.status) {
        if (resolved.message) toast.success(resolved.message)
        return
      }

      try {
        const { task: updated } = await api.updateTask(team.id, active.id, { status: resolved.status })
        onUpdate(updated)
        if (resolved.message) toast.success(resolved.message)
      } catch {}
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <button onClick={() => onAddTask(col.id)} className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div
                id={col.id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 min-h-[200px] space-y-2"
              >
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map((task) => (
                    <SortableTask key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
                  ))}
                </SortableContext>
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} compact /> : null}
      </DragOverlay>
    </DndContext>
  )
}
