import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Receipt, Home,
  PiggyBank, Lightbulb, Settings, Wallet,
} from 'lucide-react'

const navItems = [
  { to: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolio',   icon: TrendingUp },
  { to: '/spese',     label: 'Spese',       icon: Receipt },
  { to: '/asset',     label: 'Asset',       icon: Home },
  { to: '/pensione',  label: 'Pensione',    icon: PiggyBank },
  { to: '/consigli',  label: 'Consigli AI', icon: Lightbulb },
]

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ElementType; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        `group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-accent/15 text-accent-light'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]'
        }`
      }
    >
      <Icon size={18} />
      <span className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium bg-surface-800 border border-white/[0.08] text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150 shadow-xl">
        {label}
      </span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="w-14 h-screen glass !rounded-none border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-white/[0.06]">
        <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.4)]">
          <Wallet size={15} className="text-white" />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
        {navItems.map(({ to, label, icon }) => (
          <NavItem key={to} to={to} label={label} icon={icon} end={to === '/'} />
        ))}
      </nav>

      {/* Settings pinned bottom */}
      <div className="flex items-center justify-center py-3 border-t border-white/[0.06]">
        <NavItem to="/impostazioni" label="Impostazioni" icon={Settings} />
      </div>
    </aside>
  )
}
