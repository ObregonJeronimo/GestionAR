import { useLocation } from 'react-router-dom'

const titles = {
  '/': 'Dashboard',
  '/inventario': 'Inventario de Productos',
  '/ventas': 'Ventas',
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/reportes': 'Reportes',
}

export default function Header() {
  const location = useLocation()
  const title = titles[location.pathname] || 'Dashboard'

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <div className="text-sm text-gray-500">
        {new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
    </header>
  )
}
