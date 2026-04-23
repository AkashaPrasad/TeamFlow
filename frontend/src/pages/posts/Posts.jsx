import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { useRealtime } from '../../hooks/useRealtime'
import { PostCard } from './PostCard'
import { NewPostModal } from './NewPostModal'
import { EmptyState } from '../../components/ui/EmptyState'
import { PLATFORMS, POST_STATUSES } from '../../lib/constants'
import { LayoutGrid } from 'lucide-react'

export default function Posts() {
  const { team, members } = useTeam()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({ platform: '', status: '', author_id: '' })

  const loadPosts = useCallback(async () => {
    if (!team) return
    setLoading(true)
    try {
      const params = {}
      if (filters.platform) params.platform = filters.platform
      if (filters.status) params.status = filters.status
      if (filters.author_id) params.author_id = filters.author_id
      const { posts: data } = await api.getPosts(team.id, params)
      setPosts(data || [])
    } finally {
      setLoading(false)
    }
  }, [team?.id, filters.platform, filters.status, filters.author_id])

  useEffect(() => { loadPosts() }, [loadPosts])
  useRealtime('posts', team ? { filter: `team_id=eq.${team.id}` } : null, () => loadPosts())

  function handleCreated(post) {
    if (post.visibility !== 'private') {
      setPosts((prev) => [{ ...post, post_images: [], post_reactions: [], comments: [] }, ...prev])
    }
  }

  function handleUpdate(updatedPost) {
    if (updatedPost) {
      setPosts((prev) => prev.map((p) => p.id === updatedPost.id ? { ...p, ...updatedPost } : p))
    } else {
      loadPosts()
    }
  }

  function handleDelete(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const activeFilters = filters.platform || filters.status || filters.author_id

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Team Feed</h2>
          <p className="section-subtitle mt-0.5">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </span>
        <select
          value={filters.platform}
          onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer transition-all duration-150"
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer transition-all duration-150"
        >
          <option value="">All statuses</option>
          {POST_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select
          value={filters.author_id}
          onChange={(e) => setFilters((f) => ({ ...f, author_id: e.target.value }))}
          className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none cursor-pointer transition-all duration-150"
        >
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.profiles?.name}</option>
          ))}
        </select>
        {activeFilters && (
          <button
            onClick={() => setFilters({ platform: '', status: '', author_id: '' })}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No posts yet"
          description="Create your first post to get the team's content pipeline moving."
          action={
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Create first post
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <div key={post.id} className="animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <PostCard post={post} onUpdate={handleUpdate} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      <NewPostModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
