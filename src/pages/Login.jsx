import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paintbrush, Mail, Lock, User, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login, register, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // login | register | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetSent, setResetSent] = useState(false)

  const errorMessages = {
    'auth/invalid-credential': 'Email o contrase\u00f1a incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/wrong-password': 'Contrase\u00f1a incorrecta.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/weak-password': 'La contrase\u00f1a debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El email ingresado no es v\u00e1lido.',
    'auth/too-many-requests': 'Demasiados intentos. Intent\u00e1 de nuevo m\u00e1s tarde.',
  }

  const getError = (code) => errorMessages[code] || 'Ocurri\u00f3 un error. Intent\u00e1 de nuevo.'

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(getError(err.code))
    }
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(email, password, nombre)
      navigate('/')
    } catch (err) {
      setError(getError(err.code))
    }
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (err) {
      setError(getError(err.code))
    }
    setLoading(false)
  }

  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setResetSent(false)
  }

  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <Paintbrush size={36} className="text-amber-400" />
            <span className="text-3xl font-bold text-white">GestionAR</span>
          </div>
          <p className="text-slate-400 text-sm">Sistema de gesti\u00f3n integral</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* LOGIN */}
          {mode === 'login' && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Iniciar Sesi\u00f3n</h2>
              <p className="text-sm text-gray-500 mb-6">Ingres\u00e1 tus credenciales para acceder</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrase\u00f1a</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" className="w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
              <div className="mt-4 flex justify-between text-sm">
                <button onClick={() => switchMode('reset')} className="text-amber-600 hover:text-amber-700 font-medium">\u00bfOlvidaste tu contrase\u00f1a?</button>
                <button onClick={() => switchMode('register')} className="text-slate-600 hover:text-slate-800 font-medium">Crear cuenta</button>
              </div>
            </>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <>
              <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={16} /> Volver</button>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Crear Cuenta</h2>
              <p className="text-sm text-gray-500 mb-6">Complet\u00e1 los datos para registrarte</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Tu nombre" className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contrase\u00f1a</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="M\u00ednimo 6 caracteres" className="w-full border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </form>
            </>
          )}

          {/* RESET PASSWORD */}
          {mode === 'reset' && (
            <>
              <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"><ArrowLeft size={16} /> Volver</button>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Recuperar Contrase\u00f1a</h2>
              <p className="text-sm text-gray-500 mb-6">Te enviaremos un email para restablecer tu contrase\u00f1a</p>
              {resetSent ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 font-medium">\u2709\ufe0f Email enviado</p>
                  <p className="text-sm text-green-600 mt-1">Revis\u00e1 tu bandeja de entrada en <strong>{email}</strong></p>
                  <button onClick={() => switchMode('login')} className="mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium">Volver al login</button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com" className="w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {loading ? 'Enviando...' : 'Enviar Email de Recuperaci\u00f3n'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">GestionAR v1.0 &mdash; Valkyrium Solutions</p>
      </div>
    </div>
  )
}
