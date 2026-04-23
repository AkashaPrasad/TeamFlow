import { Avatar } from '../../components/ui/Avatar'
import { TaskCard } from './TaskCard'
import { UserX } from 'lucide-react'

export function PodsView({ tasks, members, onUpdate, onDelete }) {
  // Group tasks by assignee_id; unassigned goes to a separate group
  const byMember = {}
  const unassigned = []

  for (const task of tasks) {
    if (task.assignee_id) {
      if (!byMember[task.assignee_id]) byMember[task.assignee_id] = []
      byMember[task.assignee_id].push(task)
    } else {
      unassigned.push(task)
    }
  }

  // Build ordered list: members who have tasks first, then others, then unassigned
  const memberPods = members
    .map((m) => ({
      member: m,
      tasks: byMember[m.user_id] || [],
    }))

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {memberPods.map(({ member, tasks: memberTasks }) => (
        <div
          key={member.user_id}
          className="shrink-0 w-72 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col"
        >
          {/* Pod header */}
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <Avatar name={member.profiles?.name} src={member.profiles?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{member.profiles?.name}</p>
            </div>
            <span className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
              {memberTasks.length}
            </span>
          </div>

          {/* Tasks */}
          <div className="space-y-2 flex-1">
            {memberTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs">
                No tasks assigned
              </div>
            ) : (
              memberTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  compact
                />
              ))
            )}
          </div>
        </div>
      ))}

      {/* Unassigned pod */}
      {unassigned.length > 0 && (
        <div className="shrink-0 w-72 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserX className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Unassigned</p>
            </div>
            <span className="text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
              {unassigned.length}
            </span>
          </div>
          <div className="space-y-2">
            {unassigned.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
