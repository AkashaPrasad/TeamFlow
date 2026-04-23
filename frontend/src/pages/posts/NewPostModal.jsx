import { useState, useRef } from 'react'
import { Modal } from '../../components/ui/Modal'
import { PLATFORMS, POST_STATUSES } from '../../lib/constants'
import { PLATFORM_ICONS } from '../../components/icons/PlatformIcons'
import { api } from '../../lib/api'
import { useTeam } from '../../contexts/TeamContext'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { Image, X, Calendar, Lock, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function NewPostModal({ open, onClose, onCreated }) {
  const { team } = useTeam()
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    caption: '',
    platforms: [],
    visibility: 'team',
    status: 'draft',
    scheduled_at: '',
  })
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  function togglePlatform(id) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(id) ? f.platforms.filter((p) => p !== id) : [...f.platforms, id],
    }))
  }

  async function handleFiles(files) {
    const imageFiles = [...files].filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return toast.error('Please select image files only')
    setUploading(true)
    const uploaded = []
    for (const file of imageFiles) {
      try {
        const { url } = await uploadToCloudinary(file)
        uploaded.push(url)
      } catch (err) {
        toast.error(`Upload failed: ${err.message}`)
      }
    }
    setImages((prev) => [...prev, ...uploaded])
    setUploading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.caption.trim() && !images.length) return toast.error('Add a caption or image')
    setSaving(true)
    try {
      const { post } = await api.createPost(team.id, {
        ...form,
        scheduled_at: form.scheduled_at || null,
        image_urls: images,
      })
      onCreated(post)
      toast.success('Post created!')
      onClose()
      setForm({ caption: '', platforms: [], visibility: 'team', status: 'draft', scheduled_at: '' })
      setImages([])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Post" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Platform selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const Icon = PLATFORM_ICONS[p.id]
              const active = form.platforms.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                  style={active ? { backgroundColor: p.color } : {}}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Caption</label>
          <textarea
            value={form.caption}
            onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            placeholder="Write your post caption…"
            rows={4}
            className="input resize-none"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Images</label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (!uploading) handleFiles([...e.dataTransfer.files]) }}
            onClick={() => !uploading && fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${uploading ? 'border-brand-300 bg-brand-50/40 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30'}`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-6 h-6 text-brand-500 mx-auto mb-1 animate-spin" />
                <p className="text-xs text-brand-600 font-medium">Uploading to Cloudinary…</p>
              </>
            ) : (
              <>
                <Image className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Drag & drop or click to upload images</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Powered by Cloudinary</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles([...e.target.files])} />

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} className="w-16 h-16 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Visibility</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[{ v: 'private', icon: Lock, label: 'Only Me' }, { v: 'team', icon: Users, label: 'Team' }].map(({ v, icon: Icon, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, visibility: v }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    form.visibility === v ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="input"
            >
              {POST_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <Calendar className="inline w-4 h-4 mr-1 mb-0.5" />
            Schedule for (optional)
          </label>
          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            className="input"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="btn-primary">
            {saving ? 'Saving…' : 'Create Post'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
