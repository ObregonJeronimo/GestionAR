// backend/src/config.js
// Configuración ARCA (ex AFIP) Web Services

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.ARCA_ENV === 'production';

export default {
  env: isProduction ? 'production' : 'homologacion',
  cuit: process.env.ARCA_CUIT || '20XXXXXXXXX',

  // Certificados
  certPath: path.join(__dirname, '..', 'certs', 'MiCertificado.pem'),
  keyPath:  path.join(__dirname, '..', 'certs', 'MiClavePrivada.key'),

  // URLs WSAA (Autenticación)
  wsaa: {
    url: isProduction
      ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
      : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsdl: isProduction
      ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL'
      : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
  },

  // URLs WSFEv1 (Facturación Electrónica)
  wsfev1: {
    url: isProduction
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
    wsdl: isProduction
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },

  serviceName: 'wsfe',
  port: process.env.PORT || 3001,
};
