import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Paintbrush,
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventario', icon: Package, label: 'Inventario' },
  { to: '/ventas', icon: ShoppingCart, label: 'Ventas' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-800 min-h-screen flex flex-col fixed left-0 top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <Paintbrush size={28} className="text-amber-400" />
        <span className="text-xl font-bold text-white">GestionAR</span>
      </div>
      <nav className="flex-1 py-4">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-amber-400 border-r-4 border-amber-400'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`
            }
          >
            <link.icon size={20} />
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-slate-700 text-slate-400 text-xs">
        GestionAR v1.0
      </div>
    </aside>
  )
}
