import { useState, useEffect, useRef } from 'react'
import { FileText, Send, CheckCircle, AlertCircle, Loader2, RefreshCw, X, Eye, Printer } from 'lucide-react'
import Modal from '../components/Modal'
import { getClientes, getVentas, getFacturas, saveFactura } from '../utils/storage'
import { emitirFactura, verificarEstadoArca } from '../services/arcaApi'

const TIPOS_CBTE = [
  { id: 1, label: 'Factura A', desc: 'Responsable Inscripto → Resp. Inscripto' },
  { id: 6, label: 'Factura B', desc: 'Responsable Inscripto → Consumidor Final' },
  { id: 11, label: 'Factura C', desc: 'Monotributista → Cualquiera' },
]

const TIPOS_CONCEPTO = [
  { id: 1, label: 'Productos' },
  { id: 2, label: 'Servicios' },
  { id: 3, label: 'Productos y Servicios' },
]

const CONDICIONES_IVA = [
  { id: 1, label: 'IVA Responsable Inscripto' },
  { id: 4, label: 'IVA Sujeto Exento' },
  { id: 5, label: 'Consumidor Final' },
  { id: 6, label: 'Responsable Monotributo' },
  { id: 8, label: 'Proveedor del Exterior' },
  { id: 9, label: 'Cliente del Exterior' },
  { id: 10, label: 'IVA Liberado - Ley Nº 19.640' },
  { id: 13, label: 'Monotributista Social' },
  { id: 15, label: 'IVA No Alcanzado' },
]

export default function Facturacion() {
  const [estadoArca, setEstadoArca] = useState(null)
  const [checking, setChecking] = useState(false)
  const [ventas, setVentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [detalleModal, setDetalleModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emitting, setEmitting] = useState(false)
  const [facturas, setFacturas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const printRef = useRef(null)

  // Form state
  const [ventaId, setVentaId] = useState('')
  const [cbteTipo, setCbteTipo] = useState(6)
  const [concepto, setConcepto] = useState(1)
  const [docTipo, setDocTipo] = useState(99)
  const [docNro, setDocNro] = useState('')
  const [ptoVta, setPtoVta] = useState(1)
  const [condicionIVA, setCondicionIVA] = useState(5)
  const [fchServDesde, setFchServDesde] = useState('')
  const [fchServHasta, setFchServHasta] = useState('')
  const [fchVtoPago, setFchVtoPago] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [v, c, f] = await Promise.all([getVentas(), getClientes(), getFacturas()])
      setVentas(v)
      setClientes(c)
      // Ordenar facturas por fecha desc
      setFacturas(f.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)))
      setLoading(false)
    }
    load()
  }, [])

  const handleCheckArca = async () => {
    setChecking(true)
    setError(null)
    try {
      const status = await verificarEstadoArca()
      setEstadoArca(status)
    } catch (err) {
      setError(`No se pudo conectar con ARCA: ${err.message}`)
      setEstadoArca(null)
    }
    setChecking(false)
  }

  const ventaSeleccionada = ventas.find(v => v.id === ventaId)

  const calcularImportes = () => {
    if (!ventaSeleccionada) return { impTotal: 0, impNeto: 0, impIVA: 0 }
    const total = ventaSeleccionada.total
    if (cbteTipo === 11) return { impTotal: total, impNeto: total, impIVA: 0, iva: [] }
    const neto = Math.round((total / 1.21) * 100) / 100
    const iva = Math.round((total - neto) * 100) / 100
    return {
      impTotal: total,
      impNeto: neto,
      impIVA: iva,
      iva: [{ Id: 5, BaseImp: neto, Importe: iva }],
    }
  }

  const handleEmitir = async (e) => {
    e.preventDefault()
    if (!ventaSeleccionada) return
    setEmitting(true)
    setError(null)
    setResultado(null)

    const importes = calcularImportes()
    const payload = {
      ptoVta,
      cbteTipo,
      concepto,
      docTipo,
      docNro: docTipo === 99 ? 0 : Number(docNro),
      condicionIVAReceptor: condicionIVA,
      impTotal: importes.impTotal,
      impNeto: importes.impNeto,
      impIVA: importes.impIVA,
      impTotConc: 0,
      impOpEx: 0,
      impTrib: 0,
      iva: importes.iva || [],
    }

    if (concepto === 2 || concepto === 3) {
      payload.fchServDesde = fchServDesde.replace(/-/g, '')
      payload.fchServHasta = fchServHasta.replace(/-/g, '')
      payload.fchVtoPago = fchVtoPago.replace(/-/g, '')
    }

    try {
      const res = await emitirFactura(payload)
      setResultado(res)

      // Guardar factura en Firebase
      const facturaData = {
        ...res,
        cbteTipo,
        ptoVta,
        concepto,
        docTipo,
        docNro: payload.docNro,
        condicionIVA,
        ventaId,
        clienteNombre: ventaSeleccionada.clienteNombre,
        items: ventaSeleccionada.items,
        impTotal: importes.impTotal,
        impNeto: importes.impNeto,
        impIVA: importes.impIVA,
        fecha: new Date().toISOString(),
      }
      const saved = await saveFactura(facturaData)
      setFacturas(prev => [saved, ...prev])
      setModalOpen(false)
      resetForm()
    } catch (err) {
      setError(err.message)
    }
    setEmitting(false)
  }

  const resetForm = () => {
    setVentaId('')
    setCbteTipo(6)
    setConcepto(1)
    setDocTipo(99)
    setDocNro('')
    setCondicionIVA(5)
    setFchServDesde('')
    setFchServHasta('')
    setFchVtoPago('')
  }

  const handleCbteTipoChange = (tipo) => {
    setCbteTipo(tipo)
    if (tipo === 1) {
      setDocTipo(80)
      setCondicionIVA(1)
    } else if (tipo === 6) {
      setDocTipo(99)
      setDocNro('')
      setCondicionIVA(5)
    } else if (tipo === 11) {
      setDocTipo(99)
      setDocNro('')
      setCondicionIVA(5)
    }
  }

  const tipoLabel = (tipo) => TIPOS_CBTE.find(t => t.id === tipo)?.label || tipo
  const condIVALabel = (id) => CONDICIONES_IVA.find(c => c.id === id)?.label || id
  const conceptoLabel = (id) => TIPOS_CONCEPTO.find(t => t.id === id)?.label || id

  const handlePrint = (factura) => {
    const w = window.open('', '_blank', 'width=800,height=600')
    const tipoFact = tipoLabel(factura.cbteTipo)
    const letra = tipoFact?.split(' ')[1] || ''
    const numero = String(factura.ptoVta).padStart(4, '0') + '-' + String(factura.numero).padStart(8, '0')
    const fechaEmision = new Date(factura.fecha).toLocaleDateString('es-AR')
    const condIVAReceptor = condIVALabel(factura.condicionIVA)

    w.document.write(`<!DOCTYPE html><html><head><title>Factura ${numero}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; font-size: 13px; }
      .factura { max-width: 800px; margin: 0 auto; border: 2px solid #333; }
      .header { display: flex; border-bottom: 2px solid #333; }
      .header-left, .header-right { flex: 1; padding: 15px; }
      .header-center { width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 2px solid #333; border-right: 2px solid #333; padding: 10px; }
      .letra { font-size: 36px; font-weight: bold; }
      .letra-cod { font-size: 9px; color: #666; }
      .empresa { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
      .info-row { display: flex; justify-content: space-between; padding: 4px 15px; }
      .info-section { border-bottom: 1px solid #ccc; padding: 10px 15px; }
      .items-table { width: 100%; border-collapse: collapse; }
      .items-table th { background: #f5f5f5; text-align: left; padding: 8px; border-bottom: 2px solid #333; font-size: 12px; }
      .items-table td { padding: 8px; border-bottom: 1px solid #eee; }
      .totales { padding: 15px; text-align: right; border-top: 2px solid #333; }
      .totales .total-line { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 4px; }
      .total-final { font-size: 18px; font-weight: bold; margin-top: 8px; }
      .cae-section { border-top: 1px solid #ccc; padding: 12px 15px; display: flex; justify-content: space-between; font-size: 12px; }
      .no-print { margin: 20px auto; max-width: 800px; text-align: center; }
      .no-print button { padding: 10px 30px; background: #f59e0b; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
      .no-print button:hover { background: #d97706; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <div class="no-print"><button onclick="window.print()">🖨️ Imprimir Factura</button></div>
    <div class="factura">
      <div class="header">
        <div class="header-left">
          <div class="empresa">VALKYRIUM SOLUTIONS</div>
          <div>Razón Social: OBREGON JERONIMO</div>
          <div>Domicilio Comercial: Córdoba, Argentina</div>
          <div>Condición frente al IVA: IVA Responsable Inscripto</div>
        </div>
        <div class="header-center">
          <div class="letra">${letra}</div>
          <div class="letra-cod">Cód. ${String(factura.cbteTipo).padStart(2, '0')}</div>
        </div>
        <div class="header-right" style="text-align:right">
          <div style="font-size:16px;font-weight:bold">${tipoFact}</div>
          <div style="font-size:16px;font-weight:bold">Nro: ${numero}</div>
          <div>Fecha de Emisión: ${fechaEmision}</div>
          <div>CUIT: 20-44740418-5</div>
          <div>Punto de Venta: ${String(factura.ptoVta).padStart(4, '0')}</div>
        </div>
      </div>
      <div class="info-section">
        <div class="info-row"><span><strong>Cliente:</strong> ${factura.clienteNombre}</span><span><strong>Condición IVA:</strong> ${condIVAReceptor}</span></div>
        <div class="info-row"><span><strong>Tipo Doc:</strong> ${factura.docTipo === 80 ? 'CUIT' : factura.docTipo === 99 ? 'Consumidor Final' : factura.docTipo === 96 ? 'DNI' : factura.docTipo}</span><span><strong>Nro Doc:</strong> ${factura.docNro || '0'}</span></div>
      </div>
      <table class="items-table">
        <thead><tr><th>Descripción</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Precio Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>
          ${(factura.items || []).map(item => `<tr><td>${item.nombre}</td><td style="text-align:right">${item.cantidad}</td><td style="text-align:right">$${Number(item.precio).toLocaleString('es-AR')}</td><td style="text-align:right">$${(item.precio * item.cantidad).toLocaleString('es-AR')}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="totales">
        <div class="total-line"><span>Neto Gravado:</span><span>$${Number(factura.impNeto || 0).toLocaleString('es-AR')}</span></div>
        <div class="total-line"><span>IVA 21%:</span><span>$${Number(factura.impIVA || 0).toLocaleString('es-AR')}</span></div>
        <div class="total-final">TOTAL: $${Number(factura.impTotal || 0).toLocaleString('es-AR')}</div>
      </div>
      <div class="cae-section">
        <div><strong>CAE:</strong> ${factura.cae}</div>
        <div><strong>Vto CAE:</strong> ${factura.caeFechaVto}</div>
      </div>
    </div></body></html>`)
    w.document.close()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{facturas.length} facturas emitidas</p>
          <button onClick={handleCheckArca} disabled={checking} className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Estado ARCA
          </button>
          {estadoArca && (
            <span className={`text-xs px-2 py-1 rounded-full ${estadoArca.AppServer === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {estadoArca.AppServer === 'OK' ? '● Conectado' : '● Error'}
            </span>
          )}
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
          <FileText size={18} /> Nueva Factura
        </button>
      </div>

      {/* Alertas */}
      {error && !modalOpen && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X size={16} className="text-red-400" /></button>
        </div>
      )}

      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700">Factura emitida correctamente</p>
            <p className="text-xs text-green-600">CAE: {resultado.cae} | Vto: {resultado.caeFechaVto} | Nro: {resultado.numero}</p>
          </div>
          <button onClick={() => setResultado(null)}><X size={16} className="text-green-400" /></button>
        </div>
      )}

      {/* Tabla de facturas */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Número</th>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">CAE</th>
                <th className="text-left px-4 py-3 font-medium">Vto CAE</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {facturas.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-400">No hay facturas emitidas. Registrá una venta primero y luego emití la factura.</td></tr>
              ) : (
                facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{new Date(f.fecha).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">{tipoLabel(f.cbteTipo)}</span></td>
                    <td className="px-4 py-3 font-mono text-gray-800">{String(f.ptoVta).padStart(4, '0')}-{String(f.numero).padStart(8, '0')}</td>
                    <td className="px-4 py-3 text-gray-800">{f.clienteNombre}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">${Number(f.impTotal).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.cae}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{f.caeFechaVto}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetalleModal(f)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handlePrint(f)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Imprimir">
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle Factura */}
      <Modal isOpen={!!detalleModal} onClose={() => setDetalleModal(null)} title="Detalle de Factura">
        {detalleModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Tipo</p>
                <p className="font-medium">{tipoLabel(detalleModal.cbteTipo)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Número</p>
                <p className="font-mono font-medium">{String(detalleModal.ptoVta).padStart(4, '0')}-{String(detalleModal.numero).padStart(8, '0')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Fecha</p>
                <p className="font-medium">{new Date(detalleModal.fecha).toLocaleDateString('es-AR')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Concepto</p>
                <p className="font-medium">{conceptoLabel(detalleModal.concepto)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Cliente</p>
                <p className="font-medium">{detalleModal.clienteNombre}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Cond. IVA Receptor</p>
                <p className="font-medium">{condIVALabel(detalleModal.condicionIVA)}</p>
              </div>
            </div>

            {/* Items */}
            {detalleModal.items && detalleModal.items.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Detalle de productos</p>
                {detalleModal.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                    <span className="text-gray-700">{item.nombre} x{item.cantidad}</span>
                    <span className="font-medium">${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Importes */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1"><span className="text-amber-700">Neto Gravado</span><span className="font-mono">${Number(detalleModal.impNeto || 0).toLocaleString('es-AR')}</span></div>
              <div className="flex justify-between mb-1"><span className="text-amber-700">IVA 21%</span><span className="font-mono">${Number(detalleModal.impIVA || 0).toLocaleString('es-AR')}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-amber-300 pt-2 mt-2"><span className="text-amber-800">Total</span><span className="text-green-600">${Number(detalleModal.impTotal || 0).toLocaleString('es-AR')}</span></div>
            </div>

            {/* CAE */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1"><span className="text-green-700">CAE</span><span className="font-mono font-medium">{detalleModal.cae}</span></div>
              <div className="flex justify-between"><span className="text-green-700">Vencimiento CAE</span><span className="font-mono">{detalleModal.caeFechaVto}</span></div>
            </div>

            {/* Botón imprimir */}
            <button onClick={() => handlePrint(detalleModal)} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
              <Printer size={18} /> Imprimir Factura
            </button>
          </div>
        )}
      </Modal>

      {/* Modal Nueva Factura */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); setError(null) }} title="Emitir Factura Electrónica">
        <form onSubmit={handleEmitir} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venta a facturar</label>
            <select value={ventaId} onChange={e => setVentaId(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
              <option value="">Seleccionar venta...</option>
              {[...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(v => (
                <option key={v.id} value={v.id}>
                  {new Date(v.fecha).toLocaleDateString('es-AR')} - {v.clienteNombre} - ${v.total.toLocaleString('es-AR')}
                </option>
              ))}
            </select>
          </div>

          {ventaSeleccionada && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-700">Detalle de la venta</p>
              <div className="mt-1 space-y-0.5">
                {ventaSeleccionada.items.map((item, i) => (
                  <p key={i} className="text-gray-600">{item.nombre} x{item.cantidad} = ${(item.precio * item.cantidad).toLocaleString('es-AR')}</p>
                ))}
                <p className="font-bold text-gray-800 pt-1 border-t mt-1">Total: ${ventaSeleccionada.total.toLocaleString('es-AR')}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de factura</label>
              <select value={cbteTipo} onChange={e => handleCbteTipoChange(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                {TIPOS_CBTE.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-0.5">{TIPOS_CBTE.find(t => t.id === cbteTipo)?.desc}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
              <select value={concepto} onChange={e => setConcepto(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                {TIPOS_CONCEPTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punto de venta</label>
              <input type="number" min="1" value={ptoVta} onChange={e => setPtoVta(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición IVA receptor</label>
              <select value={condicionIVA} onChange={e => setCondicionIVA(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                {CONDICIONES_IVA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo documento</label>
              <select value={docTipo} onChange={e => setDocTipo(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                <option value={99}>Consumidor Final</option>
                <option value={80}>CUIT</option>
                <option value={86}>CUIL</option>
                <option value={96}>DNI</option>
              </select>
            </div>
            {docTipo !== 99 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nro documento</label>
                <input type="text" value={docNro} onChange={e => setDocNro(e.target.value)} placeholder="20XXXXXXXXX" required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            )}
          </div>

          {(concepto === 2 || concepto === 3) && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servicio desde</label>
                <input type="date" value={fchServDesde} onChange={e => setFchServDesde(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servicio hasta</label>
                <input type="date" value={fchServHasta} onChange={e => setFchServHasta(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vto pago</label>
                <input type="date" value={fchVtoPago} onChange={e => setFchVtoPago(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
              </div>
            </div>
          )}

          {ventaSeleccionada && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Resumen de importes</p>
              {(() => {
                const imp = calcularImportes()
                return (
                  <div className="text-sm text-amber-700 space-y-0.5">
                    <p>Neto gravado: <span className="font-mono">${imp.impNeto.toLocaleString('es-AR')}</span></p>
                    <p>IVA 21%: <span className="font-mono">${imp.impIVA.toLocaleString('es-AR')}</span>{cbteTipo === 11 && ' (no aplica en Factura C)'}</p>
                    <p className="font-bold">Total: <span className="font-mono">${imp.impTotal.toLocaleString('es-AR')}</span></p>
                  </div>
                )
              })()}
            </div>
          )}

          {error && modalOpen && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle size={14} className="inline mr-1" />{error}
            </div>
          )}

          <button type="submit" disabled={!ventaSeleccionada || emitting} className="w-full bg-green-500 text-white py-2.5 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {emitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {emitting ? 'Emitiendo factura...' : 'Emitir Factura Electrónica'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
