// backend/src/wsaa.js
// WSAA - Web Service de Autenticacion y Autorizacion de ARCA
// Genera TRA, firma CMS con certificado X.509, obtiene Token+Sign
// Ahora lee certificados desde Firebase via getConfig()

import fs from 'fs';
import forge from 'node-forge';
import soap from 'soap';
import { parseStringPromise } from 'xml2js';
import { getConfig } from './config.js';

let ticketAcceso = null;
let ticketExpiration = null;

/**
 * Obtiene el contenido del certificado
 */
function getCert(config) {
  if (config.certContent) return config.certContent.replace(/\\n/g, '\n');
  if (config.certPath) return fs.readFileSync(config.certPath, 'utf8');
  throw new Error('No hay certificado configurado');
}

/**
 * Obtiene el contenido de la clave privada
 */
function getKey(config) {
  if (config.keyContent) return config.keyContent.replace(/\\n/g, '\n');
  if (config.keyPath) return fs.readFileSync(config.keyPath, 'utf8');
  throw new Error('No hay clave privada configurada');
}

/**
 * Formatea fecha en formato ISO 8601 UTC para ARCA
 */
function formatDateForArca(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00:00`;
}

/**
 * Genera el TRA (Ticket de Requerimiento de Acceso) en XML
 */
function generarTRA(serviceName) {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${formatDateForArca(generationTime)}</generationTime>
    <expirationTime>${formatDateForArca(expirationTime)}</expirationTime>
  </header>
  <service>${serviceName}</service>
</loginTicketRequest>`;
}

/**
 * Firma el TRA con certificado y clave privada usando PKCS#7/CMS
 */
function firmarTRA(traXml, config) {
  const certPem = getCert(config);
  const keyPem = getKey(config);

  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

/**
 * Obtiene un Ticket de Acceso del WSAA (con cache y manejo de alreadyAuthenticated)
 */
export async function obtenerTicketAcceso() {
  if (ticketAcceso && ticketExpiration && new Date() < ticketExpiration) {
    console.log('[WSAA] Reutilizando Ticket de Acceso en cache');
    return ticketAcceso;
  }

  // Leer config fresca desde Firebase
  const config = await getConfig();
  console.log(`[WSAA] Solicitando nuevo Ticket de Acceso... (source: ${config.source})`);

  const tra = generarTRA(config.serviceName);
  const cms = firmarTRA(tra, config);

  try {
    const client = await soap.createClientAsync(config.wsaa.wsdl);
    const [result] = await client.loginCmsAsync({ in0: cms });

    const parsed = await parseStringPromise(result.loginCmsReturn);
    const token = parsed.loginTicketResponse.credentials[0].token[0];
    const sign = parsed.loginTicketResponse.credentials[0].sign[0];
    const expTime = parsed.loginTicketResponse.header[0].expirationTime[0];

    ticketAcceso = { token, sign };
    ticketExpiration = new Date(expTime);

    console.log(`[WSAA] Ticket obtenido. Expira: ${ticketExpiration.toISOString()}`);
    return ticketAcceso;
  } catch (error) {
    const errorMsg = error.message || '';

    if (errorMsg.includes('alreadyAuthenticated')) {
      console.log('[WSAA] Ya autenticado, esperando 30 segundos para reintentar...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      const client = await soap.createClientAsync(config.wsaa.wsdl);
      const newTra = generarTRA(config.serviceName);
      const newCms = firmarTRA(newTra, config);
      const [result] = await client.loginCmsAsync({ in0: newCms });

      const parsed = await parseStringPromise(result.loginCmsReturn);
      const token = parsed.loginTicketResponse.credentials[0].token[0];
      const sign = parsed.loginTicketResponse.credentials[0].sign[0];
      const expTime = parsed.loginTicketResponse.header[0].expirationTime[0];

      ticketAcceso = { token, sign };
      ticketExpiration = new Date(expTime);

      console.log(`[WSAA] Ticket obtenido (reintento). Expira: ${ticketExpiration.toISOString()}`);
      return ticketAcceso;
    }

    throw error;
  }
}

export function invalidarTicket() {
  ticketAcceso = null;
  ticketExpiration = null;
}
