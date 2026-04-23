import { useState, useRef, useEffect } from 'react'
import { Bell, Sun, Moon, Search, X, FileText, CheckSquare, FolderKanban, Menu } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { Avatar } from '../ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function TopBar({ title, onMenuClick }) {
  const { dark, toggleDark } = useTheme()
  const { profile } = useAuth()
  const { team } = useTeam()
  const navigate = useNavigate()

  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)
  const notifsRef = useRef(null)
  const debouncedQuery = useDebounce(query, 280)

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults(null)
      }
      if (notifsRef.current && !notifsRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim() || !team) {
      setSearchResults(null)
      return
    }
    runSearch(debouncedQuery.trim())
  }, [debouncedQuery, team?.id])

  async function runSearch(q) {
    setSearching(true)
    const pattern = `%${q}%`
    const [postsRes, tasksRes, projectsRes] = await Promise.all([
      supabase.from('posts').select('id, caption, status').eq('team_id', team.id).ilike('caption', pattern).limit(5),
      supabase.from('tasks').select('id, title, status, priority').eq('team_id', team.id).ilike('title', pattern).limit(5),
      supabase.from('projects').select('id, name, status').eq('team_id', team.id).ilike('name', pattern).limit(5),
    ])
    setSearchResults({
      posts: postsRes.data || [],
      tasks: tasksRes.data || [],
      projects: projectsRes.data || [],
    })
    setSearching(false)
  }

  function handleResultClick(type, id) {
    setQuery('')
    setSearchResults(null)
    if (type === 'post') navigate('/posts')
    else if (type === 'task') navigate('/work')
    else if (type === 'project') navigate(`/projects/${id}`)
  }

  async function openNotifs() {
    if (!showNotifs) {
      const { notifications } = await api.getNotifications()
      setNotifs(notifications || [])
      setUnread(notifications?.filter((n) => !n.read).length || 0)
    }
    setShowNotifs((v) => !v)
  }

  async function markAllRead() {
    await api.markAllRead()
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  const hasResults = searchResults &&
    (searchResults.posts.length + searchResults.tasks.length + searchResults.projects.length) > 0

  return (
    <header className="safe-top sticky top-0 z-30 shrink-0 border-b border-zinc-200/70 bg-white/92 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/88">
      <div className="flex min-h-14 items-center gap-2 px-3 sm:px-4">
        <button
          onClick={onMenuClick}
          className="btn-icon lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>

        <div ref={searchRef} className="relative hidden w-52 sm:block lg:w-60">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/90 px-3 py-1.5 transition-all duration-150 focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-zinc-700/80 dark:bg-zinc-900/90">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full bg-transparent text-sm text-zinc-700 outline-none placeholder-zinc-400 dark:text-zinc-300 dark:placeholder-zinc-500"
            />
            {query && (
              <button onClick={() => { setQuery(''); setSearchResults(null) }} className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {query && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-black/10 animate-fade-up dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40">
              {searching ? (
                <div className="px-4 py-3 text-center text-sm text-zinc-400">Searching…</div>
              ) : hasResults ? (
                <div className="max-h-72 overflow-y-auto">
                  {searchResults.posts.length > 0 && (
                    <div>
                      <div className="bg-zinc-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:bg-zinc-800/60">Posts</div>
                      {searchResults.posts.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleResultClick('post', p.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{p.caption || '(no caption)'}</span>
                          <span className="ml-auto shrink-0 text-xs text-zinc-400">{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <div className="bg-zinc-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:bg-zinc-800/60">Tasks</div>
                      {searchResults.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleResultClick('task', t.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{t.title}</span>
                          <span className="ml-auto shrink-0 text-xs text-zinc-400">{t.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.projects.length > 0 && (
                    <div>
                      <div className="bg-zinc-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:bg-zinc-800/60">Projects</div>
                      {searchResults.projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleResultClick('project', p.id)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                        >
                          <FolderKanban className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{p.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-zinc-400">{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 text-center text-sm text-zinc-400">No results for "{query}"</div>
              )}
            </div>
          )}
        </div>

        <button onClick={toggleDark} className="btn-icon">
          {dark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        <div className="relative" ref={notifsRef}>
          <button onClick={openNotifs} className="btn-icon relative">
            <Bell className="w-4.5 h-4.5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 h-[7px] w-[7px] rounded-full bg-brand-600 ring-2 ring-white dark:ring-zinc-950" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-black/10 animate-fade-up dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-400">No notifications</p>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 border-b border-zinc-50 px-4 py-3 last:border-0 dark:border-zinc-800 ${
                        !n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''
                      }`}
                    >
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                      <div className={!n.read ? '' : 'ml-[18px]'}>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200">{n.content}</p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => navigate('/settings')} className="shrink-0 rounded-full ring-2 ring-transparent transition-all duration-150 hover:ring-brand-300 dark:hover:ring-brand-700">
          <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
        </button>
      </div>
    </header>
  )
}
