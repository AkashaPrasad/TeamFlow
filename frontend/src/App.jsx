import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TeamProvider, useTeam } from './contexts/TeamContext'
import { Layout } from './components/layout/Layout'

const Login = lazy(() => import('./pages/auth/Login'))
const TeamSetup = lazy(() => import('./pages/team/TeamSetup'))
const Posts = lazy(() => import('./pages/posts/Posts'))
const Work = lazy(() => import('./pages/work/Work'))
const Projects = lazy(() => import('./pages/projects/Projects'))
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'))
const Settings = lazy(() => import('./pages/settings/Settings'))
const InfoPage = lazy(() => import('./pages/info/InfoPage'))
const Chat = lazy(() => import('./pages/chat/Chat'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/posts" element={<Posts />} />
          <Route path="/work" element={<Work />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/posts" replace />} />
        </Routes>
      </Suspense>
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
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/login" element={<><PublicRoutes /><Login /></>} />
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/team-setup" element={<TeamSetup />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </Suspense>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
