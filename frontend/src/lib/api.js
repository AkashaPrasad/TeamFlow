import { supabase } from './supabase'

const TASK_SELECT = `
  *,
  profiles!assignee_id(id, name, avatar_url),
  creator:profiles!created_by(id, name, avatar_url),
  projects(id, name),
  task_comments(*, profiles(*)),
  task_assignees(*, assignee:profiles!user_id(id, name, avatar_url))
`

const MESSAGE_SELECT = `
  *,
  sender:profiles!sender_id(id, name, avatar_url)
`

function randomInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

async function fetchTaskById(taskId) {
  const { data: task, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .single()
  if (error) throw new Error(error.message)
  return task
}

function sortTasksByOrder(tasks) {
  return [...(tasks || [])].sort((left, right) => {
    const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return new Date(right.created_at) - new Date(left.created_at)
  })
}

export const api = {
  // ── Teams ──────────────────────────────────────────────────────
  createTeam: async (name) => {
    const userId = await currentUserId()
    const invite_code = randomInviteCode()
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name, invite_code, created_by: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId, role: 'admin' })
    if (memberError) throw new Error(memberError.message)
    return { team }
  },

  joinTeam: async (invite_code) => {
    const userId = await currentUserId()
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', invite_code)
      .single()
    if (teamError || !team) throw new Error('Invalid invite code')
    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId, role: 'admin' })
    if (error) throw new Error(error.code === '23505' ? 'You are already a member of this team' : error.message)
    return { team }
  },

  getTeamMembers: async (teamId) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })
    if (error) throw new Error(error.message)
    return { members: data }
  },

  updateMemberRole: async (teamId, userId, role) => {
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return {}
  },

  removeMember: async (teamId, userId) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Posts ──────────────────────────────────────────────────────
  getPosts: async (teamId, params = {}) => {
    let query = supabase
      .from('posts')
      .select('*, profiles(*), post_images(*), post_reactions(*), comments(*, profiles(*))')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (params.platform) query = query.contains('platforms', [params.platform])
    if (params.status) query = query.eq('status', params.status)
    if (params.author_id) query = query.eq('author_id', params.author_id)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { posts: data }
  },

  createPost: async (teamId, data) => {
    const userId = await currentUserId()
    const { image_urls = [], ...postData } = data
    const { data: post, error } = await supabase
      .from('posts')
      .insert({ ...postData, team_id: teamId, author_id: userId })
      .select('*, profiles(*)')
      .single()
    if (error) throw new Error(error.message)
    if (image_urls.length > 0) {
      await supabase
        .from('post_images')
        .insert(image_urls.map((url) => ({ post_id: post.id, url })))
    }
    return { post }
  },

  updatePost: async (teamId, postId, data) => {
    const { data: post, error } = await supabase
      .from('posts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .select('*, profiles(*), post_images(*), post_reactions(*), comments(*, profiles(*))')
      .single()
    if (error) throw new Error(error.message)
    return { post }
  },

  deletePost: async (teamId, postId) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) throw new Error(error.message)
    return {}
  },

  reactToPost: async (postId, type) => {
    const userId = await currentUserId()
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle()
    if (existing) {
      await supabase.from('post_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, type })
    }
    return {}
  },

  addComment: async (postId, content) => {
    const userId = await currentUserId()
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: userId, content })
      .select('*, profiles(*)')
      .single()
    if (error) throw new Error(error.message)
    return { comment }
  },

  // ── Tasks ──────────────────────────────────────────────────────
  getTasks: async (teamId, params = {}) => {
    const userId = await currentUserId()
    let query = supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    // Filter modes
    if (params.mode === 'my_tasks') {
      // Also include multi-assigned tasks where user is in task_assignees
      const { data: assigneeRows } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', userId)
      const multiTaskIds = assigneeRows?.map((r) => r.task_id) || []
      if (multiTaskIds.length > 0) {
        query = query.or(`assignee_id.eq.${userId},id.in.(${multiTaskIds.join(',')})`)
      } else {
        query = query.eq('assignee_id', userId)
      }
    } else if (params.mode === 'i_assigned') {
      query = query.eq('created_by', userId)
    }

    if (params.assignee_id) query = query.eq('assignee_id', params.assignee_id)
    if (params.priority) query = query.eq('priority', params.priority)
    if (params.status) query = query.eq('status', params.status)
    if (params.project_id) query = query.eq('project_id', params.project_id)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return { tasks: sortTasksByOrder(data) }
  },

  createTask: async (teamId, data) => {
    const { data: createdTask, error: createError } = await supabase.rpc('create_task', {
      p_team_id: teamId,
      p_title: data.title,
      p_description: data.description ?? null,
      p_assignee_id: data.assignee_id ?? null,
      p_priority: data.priority ?? 'medium',
      p_status: data.status ?? 'todo',
      p_visibility: data.visibility ?? 'team',
      p_due_date: data.due_date ?? null,
      p_project_id: data.project_id ?? null,
    })
    if (createError) throw new Error(createError.message)

    const task = await fetchTaskById(createdTask.id)
    return { task }
  },

  updateTask: async (teamId, taskId, data) => {
    const { error } = await supabase
      .from('tasks')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', taskId)
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  deleteTask: async (teamId, taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) throw new Error(error.message)
    return {}
  },

  setTaskAssignees: async (taskId, userIds) => {
    const { error } = await supabase.rpc('set_task_assignees', {
      p_task_id: taskId,
      p_user_ids: userIds,
    })
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  updateAssigneeStatus: async (taskId, userId, status) => {
    const { error } = await supabase.rpc('update_task_assignee_status', {
      p_task_id: taskId,
      p_user_id: userId,
      p_status: status,
    })
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { task }
  },

  reorderTasks: async (teamId, projectId, orderedIds) => {
    const { error } = await supabase.rpc('reorder_tasks', {
      p_team_id: teamId,
      p_project_id: projectId ?? null,
      p_task_ids: orderedIds,
    })
    if (error) throw new Error(error.message)
    return {}
  },

  addTaskComment: async (taskId, content) => {
    const { data: comment, error } = await supabase.rpc('create_task_comment', {
      p_task_id: taskId,
      p_content: content,
    })
    if (error) throw new Error(error.message)
    const task = await fetchTaskById(taskId)
    return { comment, task }
  },

  // ── Projects ───────────────────────────────────────────────────
  getProjects: async (teamId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_members(*, profiles(*)), tasks(id, status)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const projects = (data || []).map((p) => {
      const task_count = p.tasks?.length ?? 0
      const completed_task_count = p.tasks?.filter((t) => t.status === 'done').length ?? 0
      const progress = task_count ? Math.round((completed_task_count / task_count) * 100) : 0
      return { ...p, task_count, completed_task_count, progress }
    })
    return { projects }
  },

  getProject: async (teamId, projectId) => {
    const { data, error } = await supabase
      .from('projects')
      .select(`*, project_members(*, profiles(*)), tasks(${TASK_SELECT})`)
      .eq('id', projectId)
      .eq('team_id', teamId)
      .single()
    if (error) throw new Error(error.message)
    return { project: { ...data, tasks: sortTasksByOrder(data.tasks) } }
  },

  createProject: async (teamId, data) => {
    const { member_ids = [], ...projectData } = data
    const { data: createdProject, error: createError } = await supabase.rpc('create_project', {
      p_team_id: teamId,
      p_name: projectData.name,
      p_description: projectData.description ?? null,
      p_goals: projectData.goals ?? [],
      p_start_date: projectData.start_date ?? null,
      p_end_date: projectData.end_date ?? null,
      p_platforms: projectData.platforms ?? [],
      p_status: projectData.status ?? 'planning',
      p_visibility: projectData.visibility ?? 'team',
      p_notes: projectData.notes ?? null,
      p_member_ids: member_ids,
    })
    if (createError) throw new Error(createError.message)

    const { data: project, error } = await supabase
      .from('projects')
      .select('*, project_members(*, profiles(*))')
      .eq('id', createdProject.id)
      .single()
    if (error) throw new Error(error.message)
    return { project }
  },

  updateProject: async (teamId, projectId, data) => {
    const { member_ids, ...projectData } = data
    const { data: updatedProject, error: updateError } = await supabase.rpc('update_project', {
      p_project_id: projectId,
      p_team_id: teamId,
      p_name: projectData.name ?? null,
      p_description: projectData.description ?? null,
      p_goals: projectData.goals,
      p_start_date: projectData.start_date ?? null,
      p_end_date: projectData.end_date ?? null,
      p_platforms: projectData.platforms,
      p_status: projectData.status ?? null,
      p_visibility: projectData.visibility ?? null,
      p_notes: projectData.notes ?? null,
      p_member_ids: member_ids ?? null,
    })
    if (updateError) throw new Error(updateError.message)

    const { data: project, error } = await supabase
      .from('projects')
      .select('*, project_members(*, profiles(*))')
      .eq('id', updatedProject.id)
      .single()
    if (error) throw new Error(error.message)
    return { project }
  },

  deleteProject: async (teamId, projectId) => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Info Items ─────────────────────────────────────────────────
  getInfoItems: async (teamId) => {
    const { data, error } = await supabase
      .from('info_items')
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .eq('team_id', teamId)
      .order('pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return { items: data }
  },

  createInfoItem: async (teamId, data) => {
    const userId = await currentUserId()
    const { data: item, error } = await supabase
      .from('info_items')
      .insert({ ...data, team_id: teamId, created_by: userId })
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .single()
    if (error) throw new Error(error.message)
    return { item }
  },

  updateInfoItem: async (itemId, data) => {
    const { data: item, error } = await supabase
      .from('info_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .single()
    if (error) throw new Error(error.message)
    return { item }
  },

  deleteInfoItem: async (itemId) => {
    const { error } = await supabase.from('info_items').delete().eq('id', itemId)
    if (error) throw new Error(error.message)
    return {}
  },

  pinInfoItem: async (itemId, pinned) => {
    const { data: item, error } = await supabase
      .from('info_items')
      .update({ pinned, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*, creator:profiles!created_by(id, name, avatar_url), tasks(id, title)')
      .single()
    if (error) throw new Error(error.message)
    return { item }
  },

  reorderInfoItems: async (orderedIds) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('info_items').update({ sort_order: index }).eq('id', id)
    )
    await Promise.all(updates)
    return {}
  },

  // ── Team Messages ──────────────────────────────────────────────
  getTeamMessages: async (teamId, limit = 60) => {
    const { data, error } = await supabase
      .from('team_messages')
      .select(MESSAGE_SELECT)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return { messages: (data || []).reverse() }
  },

  sendTeamMessage: async (teamId, content, attachment = null) => {
    const userId = await currentUserId()
    const { data: message, error } = await supabase
      .from('team_messages')
      .insert({ team_id: teamId, sender_id: userId, content, attachment })
      .select(MESSAGE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { message }
  },

  deleteTeamMessage: async (messageId) => {
    const { error } = await supabase.from('team_messages').delete().eq('id', messageId)
    if (error) throw new Error(error.message)
    return {}
  },

  // ── Direct Messages ────────────────────────────────────────────
  getDMs: async (teamId, otherUserId, limit = 60) => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('direct_messages')
      .select(MESSAGE_SELECT)
      .eq('team_id', teamId)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return { messages: (data || []).reverse() }
  },

  sendDM: async (teamId, receiverId, content, attachment = null) => {
    const userId = await currentUserId()
    const { data: message, error } = await supabase
      .from('direct_messages')
      .insert({ team_id: teamId, sender_id: userId, receiver_id: receiverId, content, attachment })
      .select(MESSAGE_SELECT)
      .single()
    if (error) throw new Error(error.message)
    return { message }
  },

  deleteDM: async (messageId) => {
    const { error } = await supabase.from('direct_messages').delete().eq('id', messageId)
    if (error) throw new Error(error.message)
    return {}
  },

  markDMsRead: async (teamId, otherUserId) => {
    const userId = await currentUserId()
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('team_id', teamId)
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('read', false)
    return {}
  },

  getDMUnreadCounts: async (teamId) => {
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('team_id', teamId)
      .eq('receiver_id', userId)
      .eq('read', false)
    if (error) throw new Error(error.message)
    const counts = {}
    for (const row of data || []) {
      counts[row.sender_id] = (counts[row.sender_id] || 0) + 1
    }
    return { counts }
  },

  // ── Notifications ──────────────────────────────────────────────
  getNotifications: async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return { notifications: data }
  },

  markAllRead: async () => {
    const userId = await currentUserId()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    return {}
  },

  markRead: async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    return {}
  },
}
