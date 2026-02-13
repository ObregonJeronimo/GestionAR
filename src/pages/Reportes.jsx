import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { DollarSign, TrendingUp, ShoppingCart, Loader2 } from 'lucide-react'
import { getVentas } from '../utils/storage'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function Reportes() {
  const [ventas, setVentas] = useState([])
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setVentas(await getVentas())
      setLoading(false)
    }
    load()
  }, [])

  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v => {
      const fecha = new Date(v.fecha)
      if (fechaDesde && fecha < new Date(fechaDesde)) return false
      if (fechaHasta && fecha > new Date(fechaHasta + 'T23:59:59')) return false
      return true
    })
  }, [ventas, fechaDesde, fechaHasta])

  const ingresosTotales = ventasFiltradas.reduce((sum, v) => sum + v.total, 0)
  const ticketPromedio = ventasFiltradas.length > 0 ? ingresosTotales / ventasFiltradas.length : 0

  const ventasPorMes = useMemo(() => {
    const mapa = {}
    ventasFiltradas.forEach(v => {
      const fecha = new Date(v.fecha)
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      if (!mapa[key]) mapa[key] = { mes: MESES[fecha.getMonth()], ventas: 0, ingresos: 0 }
      mapa[key].ventas += 1
      mapa[key].ingresos += v.total
    })
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b)).map(([, val]) => val)
  }, [ventasFiltradas])

  const productosMasVendidos = useMemo(() => {
    const mapa = {}
    ventasFiltradas.forEach(v => {
      v.items.forEach(item => {
        if (!mapa[item.nombre]) mapa[item.nombre] = { name: item.nombre, value: 0 }
        mapa[item.nombre].value += item.cantidad
      })
    })
    return Object.values(mapa).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [ventasFiltradas])

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Filtrar por fecha:</span>
        <div className="flex items-center gap-2">
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          <span className="text-gray-400">a</span>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <button onClick={() => { setFechaDesde(''); setFechaHasta('') }} className="text-sm text-amber-600 hover:text-amber-700 font-medium">Limpiar filtros</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg"><DollarSign size={24} className="text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Ingresos Totales</p>
            <p className="text-2xl font-bold text-gray-800">${ingresosTotales.toLocaleString('es-AR')}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg"><ShoppingCart size={24} className="text-blue-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Ventas</p>
            <p className="text-2xl font-bold text-gray-800">{ventasFiltradas.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg"><TrendingUp size={24} className="text-purple-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Ticket Promedio</p>
            <p className="text-2xl font-bold text-gray-800">${ticketPromedio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Ingresos por Mes</h3>
          {ventasPorMes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No hay datos para mostrar</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ventasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-AR')}`, 'Ingresos']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="ingresos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Productos Más Vendidos</h3>
          {productosMasVendidos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No hay datos para mostrar</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={productosMasVendidos} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {productosMasVendidos.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {ventasPorMes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-gray-800">Resumen Mensual</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Mes</th>
                  <th className="text-center px-4 py-3 font-medium">Cantidad de Ventas</th>
                  <th className="text-right px-4 py-3 font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ventasPorMes.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{m.mes}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{m.ventas}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">${m.ingresos.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
