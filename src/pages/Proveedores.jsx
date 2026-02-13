import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import Modal from '../components/Modal'
import { getProveedores, saveProveedor, deleteProveedor } from '../utils/storage'

const emptyProveedor = { nombre: '', contacto: '', telefono: '', email: '', productos: '' }

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyProveedor)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setProveedores(await getProveedores())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    await saveProveedor({ ...form }); await load()
    setModalOpen(false); setForm(emptyProveedor); setSaving(false)
  }

  const handleEdit = (p) => { setForm({ ...p }); setModalOpen(true) }

  const handleDelete = async (id) => {
    if (confirm('Eliminar este proveedor?')) { await deleteProveedor(id); await load() }
  }

  const filtered = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.contacto || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.productos || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, contacto o productos..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <button onClick={() => { setForm(emptyProveedor); setModalOpen(true) }} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Contacto</th>
                <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Productos que suministra</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">No se encontraron proveedores</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{p.contacto || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.telefono || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{p.productos || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyProveedor) }} title={form.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Empresa</label>
            <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label>
              <input type="text" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Productos que suministra</label>
            <textarea value={form.productos} onChange={e => setForm({ ...form, productos: e.target.value })} rows={3} placeholder="Ej: Latex interior, Esmalte sintético, Barniz..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full bg-amber-500 text-white py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-amber-300 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {form.id ? 'Guardar Cambios' : 'Crear Proveedor'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
