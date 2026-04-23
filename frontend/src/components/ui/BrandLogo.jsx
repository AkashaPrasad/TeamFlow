import { cn } from '../../lib/utils'

export function BrandLogo({ size = 'md', showWordmark = false, className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 rounded-xl',
    md: 'h-10 w-10 rounded-2xl',
    lg: 'h-14 w-14 rounded-[1.25rem]',
  }

  const imageSize = sizes[size] || sizes.md

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img src="/logo.png" alt="TeamFlow" className={cn(imageSize, 'object-cover shadow-lg shadow-black/10')} />
      {showWordmark ? (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">TeamFlow</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Workspace</p>
        </div>
      ) : null}
    </div>
  )
}
