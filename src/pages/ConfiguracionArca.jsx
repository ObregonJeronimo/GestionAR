import { useState, useEffect } from 'react'
import { Settings, Upload, CheckCircle, AlertCircle, Loader2, Shield, Trash2, Eye, EyeOff } from 'lucide-react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { useAuth } from '../hooks/useAuth'
import { verificarEstadoArca } from '../services/arcaApi'

const ENTORNOS = [
  { id: 'homologacion', label: 'Homologacion (pruebas)', desc: 'Para desarrollo y testing' },
  { id: 'produccion', label: 'Produccion', desc: 'Facturacion real con ARCA' },
]

export default function ConfiguracionArca() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [testResult, setTestResult] = useState(null)

  const [cuit, setCuit] = useState('')
  const [entorno, setEntorno] = useState('homologacion')
  const [certificado, setCertificado] = useState('')
  const [clavePrivada, setClavePrivada] = useState('')
  const [certFileName, setCertFileName] = useState('')
  const [keyFileName, setKeyFileName] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [condicionIva, setCondicionIva] = useState('IVA Responsable Inscripto')
  const [ptoVtaDefault, setPtoVtaDefault] = useState(1)
  const [showCert, setShowCert] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [configured, setConfigured] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const ref = doc(db, 'configuracion', 'arca')
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setCuit(data.cuit || '')
        setEntorno(data.entorno || 'homologacion')
        setCertificado(data.certificado || '')
        setClavePrivada(data.clavePrivada || '')
        setCertFileName(data.certFileName || '')
        setKeyFileName(data.keyFileName || '')
        setRazonSocial(data.razonSocial || '')
        setDomicilio(data.domicilio || '')
        setCondicionIva(data.condicionIva || 'IVA Responsable Inscripto')
        setPtoVtaDefault(data.ptoVtaDefault || 1)
        setConfigured(!!data.certificado && !!data.clavePrivada && !!data.cuit)
      }
    } catch (err) {
      console.error('Error cargando config:', err)
    }
    setLoading(false)
  }

  const handleFileRead = (file, setter, nameSetter) => {
    const reader = new FileReader()
    reader.onload = (e) => { setter(e.target.result); nameSetter(file.name) }
    reader.readAsText(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    if (!cuit || !certificado || !clavePrivada) {
      setError('CUIT, certificado y clave privada son obligatorios.')
      setSaving(false)
      return
    }
    if (!/^\d{11}$/.test(cuit)) {
      setError('El CUIT debe tener exactamente 11 digitos, sin guiones.')
      setSaving(false)
      return
    }
    try {
      const ref = doc(db, 'configuracion', 'arca')
      await setDoc(ref, {
        cuit, entorno, certificado, clavePrivada, certFileName, keyFileName,
        razonSocial, domicilio, condicionIva, ptoVtaDefault,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'unknown',
      })
      setSaved(true)
      setConfigured(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setError('Error guardando configuracion: ' + err.message)
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const status = await verificarEstadoArca()
      if (status.AppServer === 'OK') {
        setTestResult({ ok: true, msg: 'Conexion exitosa con ARCA. Todos los servicios funcionando.' })
      } else {
        setTestResult({ ok: false, msg: 'ARCA responde pero algunos servicios tienen problemas.' })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: 'No se pudo conectar: ' + err.message })
    }
    setTesting(false)
  }

  const handleClear = async () => {
    if (!window.confirm('Esto eliminara toda la configuracion de ARCA. Continuar?')) return
    try {
      const ref = doc(db, 'configuracion', 'arca')
      await setDoc(ref, {})
      setCuit(''); setEntorno('homologacion'); setCertificado(''); setClavePrivada('')
      setCertFileName(''); setKeyFileName(''); setRazonSocial(''); setDomicilio('')
      setCondicionIva('IVA Responsable Inscripto'); setPtoVtaDefault(1); setConfigured(false)
    } catch (err) {
      setError('Error limpiando configuracion: ' + err.message)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Estado actual */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${configured ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <Shield size={24} className={configured ? 'text-green-500' : 'text-amber-500'} />
        <div className="flex-1">
          <p className={`font-medium ${configured ? 'text-green-700' : 'text-amber-700'}`}>
            {configured ? 'ARCA configurado' : 'ARCA no configurado'}
          </p>
          <p className={`text-sm ${configured ? 'text-green-600' : 'text-amber-600'}`}>
            {configured ? `CUIT: ${cuit} | Entorno: ${entorno}` : 'Subi tu certificado y clave privada para empezar a facturar.'}
          </p>
        </div>
        {configured && (
          <button onClick={handleTest} disabled={testing} className="flex items-center gap-1.5 text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg transition-colors">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Probar conexion
          </button>
        )}
      </div>

      {testResult && (
        <div className={`rounded-lg p-3 flex items-center gap-2 ${testResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {testResult.ok ? <CheckCircle size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-red-500" />}
          <p className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>{testResult.msg}</p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Datos de ARCA/AFIP</h3>
          <p className="text-sm text-gray-500">Estos datos se guardan de forma segura y solo se usan para emitir facturas.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CUIT (sin guiones)</label>
            <input type="text" value={cuit} onChange={e => setCuit(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="20123456789" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none font-mono" />
            {cuit && cuit.length === 11 && (
              <p className="text-xs text-gray-400 mt-1">{cuit.slice(0,2)}-{cuit.slice(2,10)}-{cuit.slice(10)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entorno</label>
            <select value={entorno} onChange={e => setEntorno(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
              {ENTORNOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{ENTORNOS.find(e => e.id === entorno)?.desc}</p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Datos de la empresa (para facturas impresas)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razon Social</label>
              <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="APELLIDO NOMBRE o EMPRESA SRL" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domicilio Comercial</label>
              <input type="text" value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="Calle 123, Ciudad, Provincia" className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condicion frente al IVA</label>
              <select value={condicionIva} onChange={e => setCondicionIva(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none">
                <option>IVA Responsable Inscripto</option>
                <option>Monotributista</option>
                <option>IVA Sujeto Exento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Punto de venta por defecto</label>
              <input type="number" min="1" max="99999" value={ptoVtaDefault} onChange={e => setPtoVtaDefault(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Certificado digital y clave privada</h4>
          <p className="text-xs text-gray-500 mb-3">Estos archivos los obtenes desde ARCA/AFIP al generar tu certificado para factura electronica.</p>
          <div className="space-y-3">
            <div className="border-2 border-dashed rounded-lg p-4 hover:border-amber-400 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload size={20} className={certificado ? 'text-green-500' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Certificado (.pem / .crt)</p>
                    {certFileName ? <p className="text-xs text-green-600">{certFileName} - Cargado</p> : <p className="text-xs text-gray-400">Selecciona tu archivo de certificado</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {certificado && <button type="button" onClick={() => setShowCert(!showCert)} className="text-xs text-gray-500 hover:text-gray-700">{showCert ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg transition-colors">
                    Seleccionar
                    <input type="file" accept=".pem,.crt,.cer" onChange={e => e.target.files[0] && handleFileRead(e.target.files[0], setCertificado, setCertFileName)} className="hidden" />
                  </label>
                </div>
              </div>
              {showCert && certificado && <pre className="mt-3 bg-gray-50 rounded p-2 text-xs text-gray-600 overflow-x-auto max-h-32 overflow-y-auto">{certificado.substring(0, 500)}...</pre>}
            </div>
            <div className="border-2 border-dashed rounded-lg p-4 hover:border-amber-400 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload size={20} className={clavePrivada ? 'text-green-500' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Clave Privada (.key / .pem)</p>
                    {keyFileName ? <p className="text-xs text-green-600">{keyFileName} - Cargado</p> : <p className="text-xs text-gray-400">Selecciona tu archivo de clave privada</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {clavePrivada && <button type="button" onClick={() => setShowKey(!showKey)} className="text-xs text-gray-500 hover:text-gray-700">{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg transition-colors">
                    Seleccionar
                    <input type="file" accept=".key,.pem" onChange={e => e.target.files[0] && handleFileRead(e.target.files[0], setClavePrivada, setKeyFileName)} className="hidden" />
                  </label>
                </div>
              </div>
              {showKey && clavePrivada && <pre className="mt-3 bg-gray-50 rounded p-2 text-xs text-gray-600 overflow-x-auto max-h-32 overflow-y-auto">{clavePrivada.substring(0, 500)}...</pre>}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500 shrink-0" />
            <p className="text-sm text-green-700">Configuracion guardada correctamente.</p>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Settings size={18} />}
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
          {configured && (
            <button type="button" onClick={handleClear} className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 text-sm">
              <Trash2 size={16} /> Limpiar
            </button>
          )}
        </div>
      </form>

      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700 mb-1">Sobre la seguridad de tus datos</p>
        <p>Tu certificado y clave privada se guardan en Firebase y se utilizan unicamente para autenticarse con ARCA al momento de emitir facturas. Nunca se comparten con terceros.</p>
      </div>
    </div>
  )
}
