import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, CheckSquare, FolderKanban, Settings, LogOut, BookOpen, X, MessageSquare } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from '../../contexts/TeamContext'
import { Avatar } from '../ui/Avatar'
import { BrandLogo } from '../ui/BrandLogo'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/posts', icon: LayoutGrid, label: 'Posts' },
  { to: '/work', icon: CheckSquare, label: 'Work' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/info', icon: BookOpen, label: 'Info' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar({ open, onClose }) {
  const { profile, signOut } = useAuth()
  const { team } = useTeam()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const content = (
    <div className="w-[220px] h-full bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800/60 flex flex-col">
      {/* Team header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate leading-tight">
              {team?.name || 'TeamPost'}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Workspace</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.18, ease: 'easeOut' }}
          >
            <NavLink
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-brand-600 dark:bg-brand-500 rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-150',
                      isActive
                        ? 'text-brand-600 dark:text-brand-500'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'
                    )}
                  />
                  {label}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <button
          onClick={() => { navigate('/settings'); onClose?.() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group text-left"
        >
          <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 dark:text-white truncate leading-tight">{profile?.name}</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Member</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleSignOut() }}
            className="p-1.5 rounded-md text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all duration-150"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0 h-screen">
        {content}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 z-50 h-full lg:hidden shadow-2xl shadow-black/20"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
