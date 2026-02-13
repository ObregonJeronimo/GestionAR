import { useState, useEffect } from 'react'
import { Plus, Trash2, ShoppingCart, X, Loader2 } from 'lucide-react'
import Modal from '../components/Modal'
import { getProductos, getVentas, getClientes, saveVenta, deleteVenta } from '../utils/storage'

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [items, setItems] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [prodSeleccionado, setProdSeleccionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [v, p, c] = await Promise.all([getVentas(), getProductos(), getClientes()])
    setVentas(v); setProductos(p); setClientes(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const agregarItem = () => {
    if (!prodSeleccionado) return
    const prod = productos.find(p => p.id === prodSeleccionado)
    if (!prod) return
    const existing = items.find(i => i.productoId === prod.id)
    if (existing) {
      setItems(items.map(i => i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
    } else {
      setItems([...items, { productoId: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: 1, maxStock: prod.cantidad }])
    }
    setProdSeleccionado('')
  }

  const updateItemCantidad = (productoId, cantidad) => {
    setItems(items.map(i => i.productoId === productoId ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.maxStock)) } : i))
  }

  const removeItem = (productoId) => { setItems(items.filter(i => i.productoId !== productoId)) }

  const total = items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)

  const handleVenta = async (e) => {
    e.preventDefault()
    if (items.length === 0) return alert('Agrega al menos un producto')
    setSaving(true)
    const cliente = clientes.find(c => c.id === clienteId)
    await saveVenta({
      clienteId: clienteId || null,
      clienteNombre: cliente?.nombre || 'Cliente general',
      items: items.map(i => ({ productoId: i.productoId, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
      total,
    })
    await load()
    setModalOpen(false); setItems([]); setClienteId('')
    setSaving(false)
  }

  const handleDeleteVenta = async (id) => {
    if (confirm('Eliminar esta venta? (no se restaurará el stock)')) {
      await deleteVenta(id); await load()
    }
  }

  const sortedVentas = [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{ventas.length} ventas registradas</p>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
          <Plus size={18} /> Nueva Venta
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Productos</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedVentas.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">No hay ventas registradas</td></tr>
              ) : (
                sortedVentas.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(v.fecha).toLocaleDateString('es-AR')}{' '}
                      <span className="text-gray-400 text-xs">{new Date(v.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{v.clienteNombre}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {v.items.map((item, idx) => (<span key={idx} className="bg-gray-100 text-xs px-2 py-0.5 rounded">{item.nombre} x{item.cantidad}</span>))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">${v.total.toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeleteVenta(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setItems([]); setClienteId('') }} title="Nueva Venta">
        <form onSubmit={handleVenta} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
              <option value="">Cliente general</option>
              {clientes.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agregar Producto</label>
            <div className="flex gap-2">
              <select value={prodSeleccionado} onChange={e => setProdSeleccionado(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                <option value="">Seleccionar producto...</option>
                {productos.filter(p => p.cantidad > 0).map(p => (<option key={p.id} value={p.id}>{p.nombre} - ${p.precio} (Stock: {p.cantidad})</option>))}
              </select>
              <button type="button" onClick={agregarItem} className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors"><Plus size={18} /></button>
            </div>
          </div>
          {items.length > 0 && (
            <div className="border rounded-lg divide-y">
              {items.map(item => (
                <div key={item.productoId} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.nombre}</p>
                    <p className="text-xs text-gray-500">${item.precio} c/u</p>
                  </div>
                  <input type="number" min="1" max={item.maxStock} value={item.cantidad} onChange={e => updateItemCantidad(item.productoId, parseInt(e.target.value) || 1)} className="w-16 border rounded px-2 py-1 text-sm text-center focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                  <span className="text-sm font-medium w-20 text-right">${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                  <button type="button" onClick={() => removeItem(item.productoId)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between py-3 border-t">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-green-600">${total.toLocaleString('es-AR')}</span>
          </div>
          <button type="submit" disabled={items.length === 0 || saving} className="w-full bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
            {saving ? 'Registrando...' : 'Registrar Venta'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
