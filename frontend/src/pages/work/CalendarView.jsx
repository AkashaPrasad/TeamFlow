import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TASK_PRIORITIES } from '../../lib/constants'

export function CalendarView({ tasks }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getTasksForDay(day) {
    return tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day))
  }

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayTasks = getTasksForDay(day)
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)

          return (
            <div
              key={idx}
              className={`min-h-[100px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800 ${
                idx % 7 === 0 ? '' : ''
              } ${!inMonth ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center text-sm mb-1 rounded-full font-medium ${
                  today
                    ? 'bg-brand-600 text-white'
                    : inMonth
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const priority = TASK_PRIORITIES.find((p) => p.id === task.priority)
                  return (
                    <div
                      key={task.id}
                      title={task.title}
                      className={`text-[11px] leading-tight px-1.5 py-0.5 rounded truncate font-medium cursor-default ${
                        task.status === 'done'
                          ? 'line-through text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-500'
                          : priority?.id === 'high'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : priority?.id === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}
                    >
                      {task.title}
                    </div>
                  )
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/40" /> High</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/40" /> Medium</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/40" /> Low</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" /> Done</div>
      </div>
    </div>
  )
}
