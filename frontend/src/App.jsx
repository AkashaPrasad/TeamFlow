import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TeamProvider, useTeam } from './contexts/TeamContext'
import { Layout } from './components/layout/Layout'
import Login from './pages/auth/Login'
import TeamSetup from './pages/team/TeamSetup'
import Posts from './pages/posts/Posts'
import Work from './pages/work/Work'
import Projects from './pages/projects/Projects'
import ProjectDetail from './pages/projects/ProjectDetail'
import Settings from './pages/settings/Settings'
import InfoPage from './pages/info/InfoPage'

function ProtectedRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { team, loading: teamLoading } = useTeam()

  if (authLoading || teamLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!team) return <Navigate to="/team-setup" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/posts" element={<Posts />} />
        <Route path="/work" element={<Work />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/posts" replace />} />
      </Routes>
    </Layout>
  )
}

function PublicRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/posts" replace />
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <Routes>
            <Route path="/login" element={<><PublicRoutes /><Login /></>} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/team-setup" element={<TeamSetup />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
