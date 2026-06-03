import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex relative">
      {/* Radial glow orbs — decorative, fixed behind all content */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-0"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)' }}
      />
      <div
        className="fixed bottom-0 left-14 w-[400px] h-[400px] rounded-full pointer-events-none -z-0"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)' }}
      />

      <Sidebar />
      <div className="flex-1 ml-14 flex flex-col min-h-screen relative z-10">
        <Header />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
