import { useLocation } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const titles = {
  '/': 'Dashboard',
  '/inventario': 'Inventario de Productos',
  '/ventas': 'Ventas',
  '/facturacion': 'Facturaci\u00f3n',
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/reportes': 'Reportes',
}

export default function Header() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const title = titles[location.pathname] || 'Dashboard'

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <User size={16} className="text-gray-400" />
            <span>{user?.displayName || user?.email}</span>
          </div>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar sesi\u00f3n">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
