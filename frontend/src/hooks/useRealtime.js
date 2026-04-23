import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(table, filter, callback) {
  useEffect(() => {
    if (!filter) return

    const channel = supabase
      .channel(`realtime:${table}:${JSON.stringify(filter)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...filter },
        (payload) => callback(payload)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, JSON.stringify(filter)])
}
