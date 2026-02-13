import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, ShoppingCart, Loader2 } from 'lucide-react'
import Modal from '../components/Modal'
import { getClientes, saveCliente, deleteCliente, getVentas } from '../utils/storage'

const emptyCliente = { nombre: '', telefono: '', email: '', direccion: '' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [clienteHistorial, setClienteHistorial] = useState(null)
  const [form, setForm] = useState(emptyCliente)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [c, v] = await Promise.all([getClientes(), getVentas()])
    setClientes(c); setVentas(v)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    await saveCliente({ ...form }); await load()
    setModalOpen(false); setForm(emptyCliente); setSaving(false)
  }

  const handleEdit = (c) => { setForm({ ...c }); setModalOpen(true) }

  const handleDelete = async (id) => {
    if (confirm('Eliminar este cliente?')) { await deleteCliente(id); await load() }
  }

  const verHistorial = (cliente) => { setClienteHistorial(cliente); setHistorialOpen(true) }

  const ventasCliente = clienteHistorial
    ? ventas.filter(v => v.clienteId === clienteHistorial.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    : []

  const totalGastado = ventasCliente.reduce((sum, v) => sum + v.total, 0)

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.telefono || '').includes(search)
  )

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <button onClick={() => { setForm(emptyCliente); setModalOpen(true) }} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Dirección</th>
                <th className="text-center px-4 py-3 font-medium">Compras</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">No se encontraron clientes</td></tr>
              ) : (
                filtered.map(c => {
                  const compras = ventas.filter(v => v.clienteId === c.id).length
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{c.telefono || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.direccion || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => verHistorial(c)} className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-medium">
                          <ShoppingCart size={14} /> {compras}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyCliente) }} title={form.id ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-amber-500 text-white py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-amber-300 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {form.id ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={historialOpen} onClose={() => setHistorialOpen(false)} title={`Historial de ${clienteHistorial?.nombre || ''}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
            <span className="text-sm text-gray-600">Total gastado:</span>
            <span className="text-lg font-bold text-green-600">${totalGastado.toLocaleString('es-AR')}</span>
          </div>
          {ventasCliente.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">Sin compras registradas</p>
          ) : (
            ventasCliente.map(v => (
              <div key={v.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{new Date(v.fecha).toLocaleDateString('es-AR')}</span>
                  <span className="font-medium text-green-600">${v.total.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.items.map((item, idx) => (<span key={idx} className="bg-gray-100 text-xs px-2 py-0.5 rounded">{item.nombre} x{item.cantidad}</span>))}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
