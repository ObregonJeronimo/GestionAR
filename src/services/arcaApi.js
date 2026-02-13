// src/services/arcaApi.js
// Cliente para conectar el frontend React con el backend ARCA

const API_BASE = import.meta.env.VITE_ARCA_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error desconocido');
  return data.data;
}

// ── Estado ────────────────────────────────────────
export const verificarEstadoArca = () => request('/api/arca/status');
export const autenticarArca = () => request('/api/arca/auth', { method: 'POST' });

// ── Facturación ───────────────────────────────────
export const emitirFactura = (datos) =>
  request('/api/facturas/emitir', { method: 'POST', body: JSON.stringify(datos) });

export const ultimoComprobante = (ptoVta, cbteTipo) =>
  request(`/api/facturas/ultimo/${ptoVta}/${cbteTipo}`);

export const consultarComprobante = (cbteTipo, ptoVta, cbteNro) =>
  request(`/api/facturas/consultar/${cbteTipo}/${ptoVta}/${cbteNro}`);

// ── Parámetros ────────────────────────────────────
export const getTiposComprobante = () => request('/api/parametros/tipos-comprobante');
export const getTiposIva = () => request('/api/parametros/tipos-iva');
export const getPuntosVenta = () => request('/api/parametros/puntos-venta');
