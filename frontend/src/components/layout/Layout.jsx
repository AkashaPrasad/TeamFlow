import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const TITLES = {
  '/posts': 'Posts',
  '/work': 'Work',
  '/projects': 'Projects',
  '/info': 'Info',
  '/chat': 'Chat',
  '/settings': 'Settings',
}

export function Layout({ children }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] || 'TeamFlow'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-zinc-100 dark:bg-[#09090b]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main
          className={`flex-1 min-h-0 bg-zinc-50 dark:bg-[#09090b] ${
            pathname === '/chat' ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
