import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const TITLES = {
  '/posts': 'Posts',
  '/work': 'Work',
  '/projects': 'Projects',
  '/info': 'Info',
  '/settings': 'Settings',
}

export function Layout({ children }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || Object.entries(TITLES).find(([k]) => pathname.startsWith(k))?.[1] || 'TeamPost'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
