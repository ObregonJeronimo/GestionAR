// backend/src/wsaa.js
// WSAA - Web Service de Autenticación y Autorización de ARCA
// Genera TRA, firma CMS con certificado X.509, obtiene Token+Sign

import fs from 'fs';
import forge from 'node-forge';
import soap from 'soap';
import { parseStringPromise } from 'xml2js';
import config from './config.js';

let ticketAcceso = null;
let ticketExpiration = null;

/**
 * Obtiene el contenido del certificado (desde env o archivo)
 */
function getCert() {
  if (config.certContent) return config.certContent.replace(/\\n/g, '\n');
  return fs.readFileSync(config.certPath, 'utf8');
}

/**
 * Obtiene el contenido de la clave privada (desde env o archivo)
 */
function getKey() {
  if (config.keyContent) return config.keyContent.replace(/\\n/g, '\n');
  return fs.readFileSync(config.keyPath, 'utf8');
}

/**
 * Genera el TRA (Ticket de Requerimiento de Acceso) en XML
 */
function generarTRA() {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 5 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const fmt = (d) => d.toISOString().replace(/\.\d{3}Z$/, '-03:00');

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${fmt(generationTime)}</generationTime>
    <expirationTime>${fmt(expirationTime)}</expirationTime>
  </header>
  <service>${config.serviceName}</service>
</loginTicketRequest>`;
}

/**
 * Firma el TRA con certificado y clave privada usando PKCS#7/CMS
 */
function firmarTRA(traXml) {
  const certPem = getCert();
  const keyPem = getKey();

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
 * Obtiene un Ticket de Acceso del WSAA (con cache de 12hs)
 * @returns {{ token: string, sign: string }}
 */
export async function obtenerTicketAcceso() {
  if (ticketAcceso && ticketExpiration && new Date() < ticketExpiration) {
    console.log('[WSAA] Reutilizando Ticket de Acceso en cache');
    return ticketAcceso;
  }

  console.log('[WSAA] Solicitando nuevo Ticket de Acceso...');

  const tra = generarTRA();
  const cms = firmarTRA(tra);

  const client = await soap.createClientAsync(config.wsaa.wsdl);
  const [result] = await client.loginCmsAsync({ in0: cms });

  const parsed = await parseStringPromise(result.loginCmsReturn);
  const token = parsed.loginTicketResponse.credentials[0].token[0];
  const sign = parsed.loginTicketResponse.credentials[0].sign[0];
  const expTime = parsed.loginTicketResponse.header[0].expirationTime[0];

  ticketAcceso = { token, sign };
  ticketExpiration = new Date(expTime);

  console.log(`[WSAA] ✅ Ticket obtenido. Expira: ${ticketExpiration.toLocaleString()}`);
  return ticketAcceso;
}

export function invalidarTicket() {
  ticketAcceso = null;
  ticketExpiration = null;
}
