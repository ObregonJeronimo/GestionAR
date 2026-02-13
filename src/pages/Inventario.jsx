import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '../components/Modal'
import { getProductos, saveProducto, deleteProducto, getProveedores } from '../utils/storage'

const TIPOS = ['Latex', 'Sintetico', 'Esmalte', 'Acrilico', 'Impermeabilizante', 'Barniz', 'Otro']
const COLORES_PRESET = [
  '#FFFFFF', '#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00',
  '#FF8C00', '#8B4513', '#808080', '#FFC0CB', '#800080', '#008080',
]

const emptyProduct = {
  nombre: '', marca: '', color: '#FFFFFF', tipo: 'Latex',
  cantidad: 0, precio: 0, proveedorId: '',
}

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyProduct)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroMarca, setFiltroMarca] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [p, prov] = await Promise.all([getProductos(), getProveedores()])
    setProductos(p)
    setProveedores(prov)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await saveProducto({ ...form, cantidad: Number(form.cantidad), precio: Number(form.precio) })
    await load()
    setModalOpen(false)
    setForm(emptyProduct)
    setSaving(false)
  }

  const handleEdit = (p) => {
    setForm({ ...p })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Eliminar este producto?')) {
      await deleteProducto(id)
      await load()
    }
  }

  const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))]

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.marca.toLowerCase().includes(search.toLowerCase())
    const matchTipo = !filtroTipo || p.tipo === filtroTipo
    const matchMarca = !filtroMarca || p.marca === filtroMarca
    return matchSearch && matchTipo && matchMarca
  })

  const getProveedorNombre = (id) => proveedores.find(p => p.id === id)?.nombre || '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre o marca..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
          <option value="">Todas las marcas</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => { setForm(emptyProduct); setModalOpen(true) }} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Producto</th>
                <th className="text-left px-4 py-3 font-medium">Marca</th>
                <th className="text-left px-4 py-3 font-medium">Color</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-center px-4 py-3 font-medium">Stock</th>
                <th className="text-right px-4 py-3 font-medium">Precio</th>
                <th className="text-left px-4 py-3 font-medium">Proveedor</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-400">No se encontraron productos</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{p.marca}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: p.color }} />
                        <span className="text-gray-500 text-xs">{p.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{p.tipo}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-medium ${p.cantidad <= 5 ? 'text-red-600' : 'text-gray-700'}`}>
                        {p.cantidad <= 5 && <AlertTriangle size={14} />}{p.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">${Number(p.precio).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-gray-600">{getProveedorNombre(p.proveedorId)}</td>
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setForm(emptyProduct) }} title={form.id ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input required type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input required type="text" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORES_PRESET.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-amber-500 scale-110' : 'border-gray-300'}`} style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input required type="number" min="0" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
              <input required type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select value={form.proveedorId} onChange={e => setForm({ ...form, proveedorId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
              <option value="">Sin proveedor</option>
              {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-amber-500 text-white py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-amber-300 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {form.id ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
