import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTeam } from '../../contexts/TeamContext'
import { Avatar } from '../../components/ui/Avatar'
import { api } from '../../lib/api'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { Copy, Check, Camera, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { profile, updateProfile } = useAuth()
  const { team, members, isAdmin, reloadMembers } = useTeam()
  const [name, setName] = useState(profile?.name || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const { url } = await uploadToCloudinary(file, 'teamflow/avatars')
      await updateProfile({ avatar_url: url })
      toast.success('Profile photo updated!')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await updateProfile({ name: name.trim() })
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile updated!')
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(team?.invite_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invite code copied!')
  }

  async function handleRemoveMember(userId) {
    if (!confirm('Remove this member from the team?')) return
    try {
      await api.removeMember(team.id, userId)
      await reloadMembers()
      toast.success('Member removed')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-up">
      {/* Profile card */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-5">Your Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0"
              title="Change profile photo"
            >
              <Avatar name={profile?.name} src={profile?.avatar_url} size="xl" />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {uploadingPhoto
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-4 h-4 text-white" />
                }
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{profile?.name}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Click avatar to change photo</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Team card */}
      {team && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-5">
            Team · <span className="text-zinc-500 dark:text-zinc-400 font-normal">{team.name}</span>
          </h2>

          {/* Invite code */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">Invite code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 font-mono text-xl font-bold tracking-[0.3em] text-center text-brand-700 dark:text-brand-400 select-all">
                {team.invite_code}
              </div>
              <button onClick={copyInviteCode} className="btn-secondary shrink-0">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Share this code with teammates to let them join your workspace.</p>
          </div>

          {/* Members */}
          <div>
            <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wide">Members ({members.length})</h3>
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <Avatar name={m.profiles?.name} src={m.profiles?.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{m.profiles?.name}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{m.user_id === profile?.id ? 'You' : 'Teammate'}</p>
                  </div>
                  {isAdmin && m.user_id !== profile?.id && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
