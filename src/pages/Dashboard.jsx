import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle, Loader2 } from 'lucide-react'
import { getProductos, getVentas, getClientes } from '../utils/storage'

export default function Dashboard() {
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [p, v, c] = await Promise.all([getProductos(), getVentas(), getClientes()])
      setProductos(p)
      setVentas(v)
      setClientes(c)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    )
  }

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(hoy.getDate() - hoy.getDay())

  const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy.toDateString())
  const ventasMes = ventas.filter(v => new Date(v.fecha) >= inicioMes)
  const ventasSemana = ventas.filter(v => new Date(v.fecha) >= inicioSemana)

  const ingresosMes = ventasMes.reduce((sum, v) => sum + v.total, 0)
  const ingresosHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0)
  const ingresosSemana = ventasSemana.reduce((sum, v) => sum + v.total, 0)

  const stockBajo = productos.filter(p => p.cantidad <= 5)
  const ultimasVentas = [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5)

  const cards = [
    { label: 'Productos', value: productos.length, icon: Package, color: 'bg-blue-500', click: () => navigate('/inventario') },
    { label: 'Clientes', value: clientes.length, icon: Users, color: 'bg-green-500', click: () => navigate('/clientes') },
    { label: 'Ventas del Mes', value: ventasMes.length, icon: ShoppingCart, color: 'bg-purple-500', click: () => navigate('/ventas') },
    { label: 'Ingresos del Mes', value: `$${ingresosMes.toLocaleString('es-AR')}`, icon: DollarSign, color: 'bg-amber-500', click: () => navigate('/reportes') },
  ]

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            onClick={card.click}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Ingresos Hoy', value: ingresosHoy },
          { label: 'Ingresos Semana', value: ingresosSemana },
          { label: 'Ingresos Mes', value: ingresosMes },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              ${item.value.toLocaleString('es-AR')}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock bajo */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b">
            <AlertTriangle size={20} className="text-red-500" />
            <h3 className="font-semibold text-gray-800">Productos con Stock Bajo</h3>
            <span className="ml-auto bg-red-100 text-red-600 text-xs font-medium px-2 py-1 rounded-full">
              {stockBajo.length}
            </span>
          </div>
          <div className="p-4">
            {stockBajo.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Todos los productos tienen stock suficiente</p>
            ) : (
              <div className="space-y-2">
                {stockBajo.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{p.nombre}</p>
                      <p className="text-xs text-gray-500">{p.marca} - {p.tipo}</p>
                    </div>
                    <span className="text-sm font-bold text-red-600">{p.cantidad} uds</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ultimas ventas */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex items-center gap-2 p-4 border-b">
            <ShoppingCart size={20} className="text-purple-500" />
            <h3 className="font-semibold text-gray-800">Últimas Ventas</h3>
          </div>
          <div className="p-4">
            {ultimasVentas.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No hay ventas registradas</p>
            ) : (
              <div className="space-y-2">
                {ultimasVentas.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{v.clienteNombre || 'Cliente general'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(v.fecha).toLocaleDateString('es-AR')} - {v.items.length} producto(s)
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600">${v.total.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
