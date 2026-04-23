export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {Icon && (
        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700/60">
          <Icon className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
