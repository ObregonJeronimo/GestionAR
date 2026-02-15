// backend/src/server.js
// API Express - Conecta GestionAR (React) con ARCA Web Services
// Ahora lee configuracion desde Firebase

import express from 'express';
import cors from 'cors';
import staticConfig from './config.js';
import { getConfig } from './config.js';
import { obtenerTicketAcceso, invalidarTicket } from './wsaa.js';
import { invalidarConfigCache } from './firebaseConfig.js';
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
      callback(null, true);
    }
  },
}));
app.use(express.json());

// -- Health --

app.get('/api/health', async (req, res) => {
  try {
    const config = await getConfig();
    res.json({ status: 'ok', env: config.env, cuit: config.cuit, source: config.source });
  } catch (err) {
    res.json({ status: 'ok', env: 'unknown', source: 'none', error: err.message });
  }
});

// -- Estado ARCA --

app.get('/api/arca/status', async (req, res) => {
  try {
    const status = await wsfev1.dummy();
    res.json({ ok: true, data: status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// -- Autenticacion --

app.post('/api/arca/auth', async (req, res) => {
  try {
    await obtenerTicketAcceso();
    res.json({ ok: true, authenticated: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// -- Refrescar config (cuando el cliente guarda nueva config en Firebase) --

app.post('/api/arca/refresh-config', (req, res) => {
  invalidarConfigCache();
  invalidarTicket();
  console.log('[Config] Cache de configuracion y ticket invalidados');
  res.json({ ok: true, message: 'Configuracion refrescada' });
});

// -- Emitir Factura --

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
      condicionIVAReceptor: data.condicionIVAReceptor,
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

// -- Consultar ultimo comprobante --

app.get('/api/facturas/ultimo/:ptoVta/:cbteTipo', async (req, res) => {
  try {
    const numero = await wsfev1.ultimoComprobante(Number(req.params.ptoVta), Number(req.params.cbteTipo));
    res.json({ ok: true, data: { ultimoNumero: numero } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// -- Consultar comprobante emitido --

app.get('/api/facturas/consultar/:cbteTipo/:ptoVta/:cbteNro', async (req, res) => {
  try {
    const { cbteTipo, ptoVta, cbteNro } = req.params;
    const data = await wsfev1.consultarComprobante(Number(cbteTipo), Number(ptoVta), Number(cbteNro));
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// -- Parametros --

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

// -- Iniciar servidor --

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\nAPI ARCA | Puerto: ${PORT}`);
  try {
    const config = await getConfig();
    console.log(`Entorno: ${config.env} | CUIT: ${config.cuit} | Source: ${config.source}\n`);
  } catch (err) {
    console.log(`Config: pendiente (${err.message})\n`);
  }
});
