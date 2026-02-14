// backend/src/server.js
// API Express - Conecta GestionAR (React) con ARCA Web Services

import express from 'express';
import cors from 'cors';
import config from './config.js';
import { obtenerTicketAcceso } from './wsaa.js';
import * as wsfev1 from './wsfev1.js';

const app = express();

// CORS: aceptar frontend de Vercel y localhost
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // permisivo en desarrollo
    }
  },
}));
app.use(express.json());

// ── Health ────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.env, cuit: config.cuit });
});

// ── Estado ARCA ───────────────────────────────────

app.get('/api/arca/status', async (req, res) => {
  try {
    const status = await wsfev1.dummy();
    res.json({ ok: true, data: status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Autenticación ─────────────────────────────────

app.post('/api/arca/auth', async (req, res) => {
  try {
    await obtenerTicketAcceso();
    res.json({ ok: true, authenticated: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Emitir Factura ────────────────────────────────

app.post('/api/facturas/emitir', async (req, res) => {
  try {
    const data = req.body;

    if (!data.ptoVta || !data.cbteTipo || !data.concepto) {
      return res.status(400).json({ ok: false, error: 'Faltan campos: ptoVta, cbteTipo, concepto' });
    }

    const ultimoNro = await wsfev1.ultimoComprobante(data.ptoVta, data.cbteTipo);
    const siguiente = ultimoNro + 1;
    const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const resultado = await wsfev1.solicitarCAE({
      ptoVta: data.ptoVta,
      cbteTipo: data.cbteTipo,
      concepto: data.concepto,
      docTipo: data.docTipo || 99,
      docNro: data.docNro || 0,
      cbteDesde: siguiente,
      cbteHasta: siguiente,
      cbteFch: data.cbteFch || hoy,
      impTotal: data.impTotal,
      impTotConc: data.impTotConc || 0,
      impNeto: data.impNeto || 0,
      impOpEx: data.impOpEx || 0,
      impIVA: data.impIVA || 0,
      impTrib: data.impTrib || 0,
      iva: data.iva || [],
      monId: data.monId || 'PES',
      monCotiz: data.monCotiz || 1,
      fchServDesde: data.fchServDesde,
      fchServHasta: data.fchServHasta,
      fchVtoPago: data.fchVtoPago,
      tributos: data.tributos,
      cbtesAsoc: data.cbtesAsoc,
    });

    res.json({
      ok: true,
      data: {
        numero: siguiente,
        cae: resultado.CAE,
        caeFechaVto: resultado.CAEFchVto,
        resultado: resultado.Resultado,
        ptoVta: data.ptoVta,
        cbteTipo: data.cbteTipo,
      },
    });
  } catch (error) {
    console.error('[Factura] Error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Consultar último comprobante ──────────────────

app.get('/api/facturas/ultimo/:ptoVta/:cbteTipo', async (req, res) => {
  try {
    const numero = await wsfev1.ultimoComprobante(Number(req.params.ptoVta), Number(req.params.cbteTipo));
    res.json({ ok: true, data: { ultimoNumero: numero } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Consultar comprobante emitido ─────────────────

app.get('/api/facturas/consultar/:cbteTipo/:ptoVta/:cbteNro', async (req, res) => {
  try {
    const { cbteTipo, ptoVta, cbteNro } = req.params;
    const data = await wsfev1.consultarComprobante(Number(cbteTipo), Number(ptoVta), Number(cbteNro));
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Parámetros ────────────────────────────────────

app.get('/api/parametros/tipos-comprobante', async (req, res) => {
  try { res.json({ ok: true, data: await wsfev1.getTiposCbte() }); }
  catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.get('/api/parametros/tipos-iva', async (req, res) => {
  try { res.json({ ok: true, data: await wsfev1.getTiposIva() }); }
  catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

app.get('/api/parametros/puntos-venta', async (req, res) => {
  try { res.json({ ok: true, data: await wsfev1.getPuntosVenta() }); }
  catch (error) { res.status(500).json({ ok: false, error: error.message }); }
});

// ── Iniciar servidor ──────────────────────────────

app.listen(config.port, () => {
  console.log(`\n🏛️  API ARCA | Entorno: ${config.env} | Puerto: ${config.port} | CUIT: ${config.cuit}\n`);
});
