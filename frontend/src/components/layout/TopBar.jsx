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
    <header className="h-14 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center px-4 gap-3 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="btn-icon lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-[15px] font-semibold text-zinc-900 dark:text-white flex-1 truncate tracking-tight">{title}</h1>

      {/* Global Search */}
      <div ref={searchRef} className="relative hidden sm:block w-52 lg:w-60">
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg px-3 py-1.5 focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all duration-150">
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="bg-transparent text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none w-full"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearchResults(null) }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {query && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-zinc-200 dark:border-zinc-700 z-50 overflow-hidden animate-fade-up">
            {searching ? (
              <div className="px-4 py-3 text-sm text-zinc-400 text-center">Searching…</div>
            ) : hasResults ? (
              <div className="max-h-72 overflow-y-auto">
                {searchResults.posts.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60">Posts</div>
                    {searchResults.posts.map((p) => (
                      <button key={p.id} onClick={() => handleResultClick('post', p.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors">
                        <FileText className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{p.caption || '(no caption)'}</span>
                        <span className="text-xs text-zinc-400 ml-auto shrink-0">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60">Tasks</div>
                    {searchResults.tasks.map((t) => (
                      <button key={t.id} onClick={() => handleResultClick('task', t.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{t.title}</span>
                        <span className="text-xs text-zinc-400 ml-auto shrink-0">{t.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60">Projects</div>
                    {searchResults.projects.map((p) => (
                      <button key={p.id} onClick={() => handleResultClick('project', p.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors">
                        <FolderKanban className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{p.name}</span>
                        <span className="text-xs text-zinc-400 ml-auto shrink-0">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-zinc-400 text-center">No results for "{query}"</div>
            )}
          </div>
        )}
      </div>

      {/* Dark mode toggle */}
      <button onClick={toggleDark} className="btn-icon">
        {dark
          ? <Sun className="w-4.5 h-4.5" />
          : <Moon className="w-4.5 h-4.5" />
        }
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifsRef}>
        <button onClick={openNotifs} className="btn-icon relative">
          <Bell className="w-4.5 h-4.5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-brand-600 rounded-full ring-2 ring-white dark:ring-zinc-950" />
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-zinc-200 dark:border-zinc-700 z-50 animate-fade-up overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">No notifications</p>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-3 border-b border-zinc-50 dark:border-zinc-800 last:border-0 ${
                      !n.read ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''
                    }`}
                  >
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0" />}
                    <div className={!n.read ? '' : 'ml-[18px]'}>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">{n.content}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
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

      {/* Avatar */}
      <button onClick={() => navigate('/settings')} className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-brand-300 dark:hover:ring-brand-700 transition-all duration-150">
        <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
      </button>
    </header>
  )
}
