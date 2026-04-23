export function Badge({ children, color = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300', className = '' }) {
  return (
    <span className={`badge ${color} ${className}`}>
      {children}
    </span>
  )
}
