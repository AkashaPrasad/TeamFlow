export function Badge({ children, color = 'bg-gray-100 text-gray-600', className = '' }) {
  return (
    <span className={`badge ${color} ${className}`}>
      {children}
    </span>
  )
}
