import { useState, useRef, useEffect, useCallback } from 'react'
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

  // Notifications state
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults(null)
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
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-base font-semibold text-gray-900 dark:text-white flex-1 truncate">{title}</h1>

      {/* Global Search */}
      <div ref={searchRef} className="relative hidden sm:block w-56 lg:w-64">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none w-full"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSearchResults(null) }}>
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {query && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {searching ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">Searching…</div>
            ) : hasResults ? (
              <div className="max-h-72 overflow-y-auto">
                {searchResults.posts.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400 bg-gray-50 dark:bg-gray-700/50">Posts</div>
                    {searchResults.posts.map((p) => (
                      <button key={p.id} onClick={() => handleResultClick('post', p.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                        <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.caption || '(no caption)'}</span>
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400 bg-gray-50 dark:bg-gray-700/50">Tasks</div>
                    {searchResults.tasks.map((t) => (
                      <button key={t.id} onClick={() => handleResultClick('task', t.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                        <CheckSquare className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{t.title}</span>
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{t.status}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400 bg-gray-50 dark:bg-gray-700/50">Projects</div>
                    {searchResults.projects.map((p) => (
                      <button key={p.id} onClick={() => handleResultClick('project', p.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                        <FolderKanban className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No results for "{query}"</div>
            )}
          </div>
        )}
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={openNotifs}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${
                      !n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                    }`}
                  >
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
                    <div className={!n.read ? '' : 'ml-5'}>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{n.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
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

      {/* Avatar → settings */}
      <button onClick={() => navigate('/settings')} className="shrink-0">
        <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
      </button>
    </header>
  )
}
