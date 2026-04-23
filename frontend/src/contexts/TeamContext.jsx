import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const TeamContext = createContext(null)

export function TeamProvider({ children }) {
  const { user } = useAuth()
  const [team, setTeam] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setTeam(null); setMembers([]); setLoading(false); return }
    loadTeam()
  }, [user])

  useEffect(() => {
    if (!team) return
    loadMembers()

    const channel = supabase
      .channel(`team-presence:${team.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setMembers((prev) =>
          prev.map((m) => ({
            ...m,
            online: Object.values(state).some((presences) =>
              presences.some((p) => p.user_id === m.user_id)
            ),
          }))
        )
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id })
        }
      })

    return () => supabase.removeChannel(channel)
  }, [team?.id])

  async function loadTeam() {
    setLoading(true)
    const { data } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single()

    setTeam(data?.teams ?? null)
    setLoading(false)
  }

  async function loadMembers(teamId) {
    const id = teamId ?? team?.id
    if (!id) return
    const { members: data } = await api.getTeamMembers(id)
    setMembers(data || [])
  }

  async function createTeam(name) {
    const { team: newTeam } = await api.createTeam(name)
    setTeam(newTeam)
    await loadMembers(newTeam.id)
    return newTeam
  }

  async function joinTeam(invite_code) {
    const { team: joinedTeam } = await api.joinTeam(invite_code)
    setTeam(joinedTeam)
    await loadMembers(joinedTeam.id)
    return joinedTeam
  }

  const currentMember = members.find((m) => m.user_id === user?.id)
  const isAdmin = Boolean(currentMember)

  return (
    <TeamContext.Provider value={{ team, members, loading, isAdmin, currentMember, createTeam, joinTeam, reloadMembers: () => loadMembers() }}>
      {children}
    </TeamContext.Provider>
  )
}

export const useTeam = () => {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeam must be inside TeamProvider')
  return ctx
}
