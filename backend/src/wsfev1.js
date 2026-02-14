// backend/src/wsfev1.js
// WSFEv1 - Web Service de Facturación Electrónica V1

import soap from 'soap';
import config from './config.js';
import { obtenerTicketAcceso } from './wsaa.js';

let soapClient = null;

async function getClient() {
  if (!soapClient) {
    soapClient = await soap.createClientAsync(config.wsfev1.wsdl);
    soapClient.setEndpoint(config.wsfev1.url);
  }
  return soapClient;
}

async function getAuth() {
  const { token, sign } = await obtenerTicketAcceso();
  return { Token: token, Sign: sign, Cuit: config.cuit };
}

// ── Verificación ──────────────────────────────────

export async function dummy() {
  const client = await getClient();
  const [result] = await client.FEDummyAsync({});
  return result.FEDummyResult;
}

// ── Consultas ─────────────────────────────────────

export async function ultimoComprobante(ptoVta, cbteTipo) {
  const client = await getClient();
  const Auth = await getAuth();
  const [result] = await client.FECompUltimoAutorizadoAsync({ Auth, PtoVta: ptoVta, CbteTipo: cbteTipo });
  const res = result.FECompUltimoAutorizadoResult;
  if (res.Errors) throw new Error(JSON.stringify(res.Errors));
  return res.CbteNro;
}

// ── Solicitar CAE (emitir factura) ────────────────

export async function solicitarCAE(factura) {
  const client = await getClient();
  const Auth = await getAuth();

  // Determinar condición IVA del receptor
  let condIVA = factura.condicionIVAReceptor;
  if (condIVA === undefined || condIVA === null) {
    if (factura.cbteTipo === 1) condIVA = 1;
    else if (factura.cbteTipo === 6) condIVA = 5;
    else if (factura.cbteTipo === 11) condIVA = 5;
    else condIVA = 5;
  }

  const detalle = {
    Concepto: factura.concepto,
    DocTipo: factura.docTipo,
    DocNro: factura.docNro,
    CbteDesde: factura.cbteDesde,
    CbteHasta: factura.cbteHasta,
    CbteFch: factura.cbteFch,
    ImpTotal: factura.impTotal,
    ImpTotConc: factura.impTotConc,
    ImpNeto: factura.impNeto,
    ImpOpEx: factura.impOpEx,
    ImpIVA: factura.impIVA,
    ImpTrib: factura.impTrib,
    MonId: factura.monId || 'PES',
    MonCotiz: factura.monCotiz || 1,
  };

  if (factura.iva && factura.iva.length > 0) {
    detalle.Iva = { AlicIva: factura.iva.map(i => ({ Id: i.Id, BaseImp: i.BaseImp, Importe: i.Importe })) };
  }

  if (factura.concepto === 2 || factura.concepto === 3) {
    detalle.FchServDesde = factura.fchServDesde;
    detalle.FchServHasta = factura.fchServHasta;
    detalle.FchVtoPago = factura.fchVtoPago;
  }

  if (factura.tributos && factura.tributos.length > 0) {
    detalle.Tributos = { Tributo: factura.tributos };
  }

  if (factura.cbtesAsoc && factura.cbtesAsoc.length > 0) {
    detalle.CbtesAsoc = { CbteAsoc: factura.cbtesAsoc };
  }

  const request = {
    Auth,
    FeCAEReq: {
      FeCabReq: { CantReg: 1, PtoVta: factura.ptoVta, CbteTipo: factura.cbteTipo },
      FeDetReq: { FECAEDetRequest: detalle },
    },
  };

  // Interceptar XML para inyectar CondicionIVAReceptor
  // (la librería soap puede ignorar campos no definidos en el WSDL)
  const condIVATag = `<CondicionIVAReceptor>${condIVA}</CondicionIVAReceptor>`;\n\n  function injectCondicionIVA(xml) {\n    // Insertar antes del cierre de </FECAEDetRequest>\n    return xml.replace('</FECAEDetRequest>', `${condIVATag}</FECAEDetRequest>`);\n  }\n\n  // Registrar interceptor una sola vez\n  const originalHttpRequest = client.httpClient.request;\n  let intercepted = false;\n  client.httpClient.request = function(rurl, data, callback, exheaders, exoptions) {\n    if (!intercepted && data && data.includes('FECAEDetRequest')) {\n      intercepted = true;\n      // Verificar si CondicionIVAReceptor ya está en el XML\n      if (!data.includes('CondicionIVAReceptor')) {\n        data = injectCondicionIVA(data);\n        console.log('[WSFEv1] Inyectado CondicionIVAReceptor:', condIVA);\n      }\n    }\n    return originalHttpRequest.call(this, rurl, data, callback, exheaders, exoptions);\n  };\n\n  try {\n    const [result] = await client.FECAESolicitarAsync(request);\n\n    // Restaurar httpClient original\n    client.httpClient.request = originalHttpRequest;\n\n    const res = result.FECAESolicitarResult;\n\n    if (res.Errors) {\n      const errores = [].concat(res.Errors.Err || []);\n      throw new Error(errores.map(e => `[${e.Code}] ${e.Msg}`).join('; '));\n    }\n\n    const det = res.FeDetResp.FECAEDetResponse[0] || res.FeDetResp.FECAEDetResponse;\n\n    if (det.Resultado === 'R') {\n      const obs = [].concat(det.Observaciones?.Obs || []);\n      throw new Error(`Rechazado: ${obs.map(o => `[${o.Code}] ${o.Msg}`).join('; ')}`);\n    }\n\n    return {\n      CAE: det.CAE,\n      CAEFchVto: det.CAEFchVto,\n      CbteDesde: det.CbteDesde,\n      CbteHasta: det.CbteHasta,\n      Resultado: det.Resultado,\n    };\n  } catch (error) {\n    // Restaurar httpClient en caso de error\n    client.httpClient.request = originalHttpRequest;\n    throw error;\n  }\n}\n\n// ── Consultar comprobante ─────────────────────────\n\nexport async function consultarComprobante(cbteTipo, ptoVta, cbteNro) {\n  const client = await getClient();\n  const Auth = await getAuth();\n  const [result] = await client.FECompConsultarAsync({\n    Auth,\n    FeCompConsReq: { CbteTipo: cbteTipo, CbteNro: cbteNro, PtoVta: ptoVta },\n  });\n  const res = result.FECompConsultarResult;\n  if (res.Errors) throw new Error(JSON.stringify(res.Errors));\n  return res.ResultGet;\n}\n\n// ── Parámetros ────────────────────────────────────\n\nexport async function getTiposCbte() {\n  const client = await getClient();\n  const Auth = await getAuth();\n  const [r] = await client.FEParamGetTiposCbteAsync({ Auth });\n  return r.FEParamGetTiposCbteResult.ResultGet.CbteTipo;\n}\n\nexport async function getTiposIva() {\n  const client = await getClient();\n  const Auth = await getAuth();\n  const [r] = await client.FEParamGetTiposIvaAsync({ Auth });\n  return r.FEParamGetTiposIvaResult.ResultGet.IvaTipo;\n}\n\nexport async function getPuntosVenta() {\n  const client = await getClient();\n  const Auth = await getAuth();\n  const [r] = await client.FEParamGetPtosVentaAsync({ Auth });\n  return r.FEParamGetPtosVentaResult?.ResultGet?.PtoVenta || [];\n}\n