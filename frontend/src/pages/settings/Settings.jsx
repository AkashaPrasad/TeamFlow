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
      const { url } = await uploadToCloudinary(file, 'teampost/avatars')
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
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Profile */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Your Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Clickable avatar for photo upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0"
              title="Change profile photo"
            >
              <Avatar name={profile?.name} src={profile?.avatar_url} size="xl" />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingPhoto
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />
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
              <p className="text-sm font-medium text-gray-900 dark:text-white">{profile?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Click the avatar to change your photo</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Team */}
      {team && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Team: {team.name}</h2>

          {/* Invite code */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Invite code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 font-mono text-lg font-bold tracking-widest text-center text-brand-700 dark:text-brand-400">
                {team.invite_code}
              </div>
              <button onClick={copyInviteCode} className="btn-secondary flex items-center gap-1.5">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Share this code with teammates to let them join your workspace.</p>
          </div>

          {/* Members list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Members ({members.length})</h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Avatar name={m.profiles?.name} src={m.profiles?.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{m.profiles?.name}</p>
                    <p className="text-xs text-gray-400">{m.user_id === profile?.id ? 'You' : 'Teammate'}</p>
                  </div>
                  {isAdmin && m.user_id !== profile?.id && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
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
