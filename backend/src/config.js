// backend/src/config.js
// Configuracion ARCA - Ahora lee de Firebase, con fallback a env vars

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getArcaConfig } from './firebaseConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Config estatica (URLs, puerto, etc)
const staticConfig = {
  serviceName: 'wsfe',
  port: process.env.PORT || 3001,
};

/**
 * Obtiene la config completa de ARCA.
 * Primero intenta Firebase, si falla usa env vars como fallback.
 */
export async function getConfig() {
  try {
    const fbConfig = await getArcaConfig();
    const isProduction = fbConfig.entorno === 'produccion';

    return {
      ...staticConfig,
      env: isProduction ? 'produccion' : 'homologacion',
      cuit: fbConfig.cuit,
      certContent: fbConfig.certificado,
      keyContent: fbConfig.clavePrivada,
      razonSocial: fbConfig.razonSocial || '',
      domicilio: fbConfig.domicilio || '',
      condicionIva: fbConfig.condicionIva || '',
      ptoVtaDefault: fbConfig.ptoVtaDefault || 1,
      source: 'firebase',
      wsaa: {
        wsdl: isProduction
          ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL'
          : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
      },
      wsfev1: {
        url: isProduction
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
        wsdl: isProduction
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
      },
    };
  } catch (err) {
    console.log('[Config] Firebase no disponible, usando env vars:', err.message);

    // Fallback a variables de entorno (Railway)
    const isProduction = process.env.ARCA_ENV === 'production';
    return {
      ...staticConfig,
      env: isProduction ? 'produccion' : 'homologacion',
      cuit: process.env.ARCA_CUIT || '20XXXXXXXXX',
      certContent: process.env.ARCA_CERT || null,
      keyContent: process.env.ARCA_KEY || null,
      certPath: path.join(__dirname, '..', 'certs', 'MiCertificado.pem'),
      keyPath: path.join(__dirname, '..', 'certs', 'MiClavePrivada.key'),
      source: 'env',
      wsaa: {
        wsdl: isProduction
          ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL'
          : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
      },
      wsfev1: {
        url: isProduction
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
        wsdl: isProduction
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
      },
    };
  }
}

// Export default para compatibilidad (se usa en server.js para el puerto)
export default staticConfig;
