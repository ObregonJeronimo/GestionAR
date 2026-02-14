// backend/src/wsfev1.js
// WSFEv1 - Web Service de Facturación Electrónica V1

import soap from 'soap';
import config from './config.js';
import { obtenerTicketAcceso } from './wsaa.js';

let soapClient = null;

async function getClient() {
  if (!soapClient) {
    soapClient = await soap.createClientAsync(config.wsfev1.wsdl, {
      disableCache: true,
    });
    soapClient.setEndpoint(config.wsfev1.url);

    // Dump all field names in FECAEDetRequest from WSDL
    try {
      var desc = soapClient.describe();
      var methods = desc.ServiceSoap || desc.ServiceSoap12 || Object.values(desc)[0];
      var feCAESolicitar = methods.FECAESolicitar || methods.ServiceSoap && methods.ServiceSoap.FECAESolicitar;
      console.log('[WSFEv1] describe() keys:', JSON.stringify(Object.keys(desc)));
      // Try to find FECAEDetRequest fields
      var descStr = JSON.stringify(desc);
      // Search for any field containing "ondicion" or "CanMis"
      var matches = descStr.match(/"[^"]*[Oo]ndicion[^"]*"/g);
      console.log('[WSFEv1] Fields matching ondicion:', JSON.stringify(matches));
      var matches2 = descStr.match(/"[^"]*CanMis[^"]*"/g);
      console.log('[WSFEv1] Fields matching CanMis:', JSON.stringify(matches2));
      // Also search for "Receptor"
      var matches3 = descStr.match(/"[^"]*[Rr]eceptor[^"]*"/g);
      console.log('[WSFEv1] Fields matching Receptor:', JSON.stringify(matches3));
    } catch(e) {
      console.log('[WSFEv1] Error inspecting WSDL:', e.message);
    }
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
    CanMisMonExt: 'N',
    CondicionIvaReceptorId: condIVA,
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

  // Interceptar para verificar el XML final
  const originalHttpRequest = client.httpClient.request;
  let intercepted = false;

  client.httpClient.request = function(rurl, data, callback, exheaders, exoptions) {
    if (!intercepted && data && data.includes('FECAEDetRequest')) {
      intercepted = true;
      // Si CondicionIvaReceptorId no esta, inyectar despues de CanMisMonExt o DocNro
      if (!data.includes('CondicionIvaReceptorId')) {
        var condTag = '<CondicionIvaReceptorId>' + condIVA + '</CondicionIvaReceptorId>';
        if (data.includes('</CanMisMonExt>')) {
          data = data.replace('</CanMisMonExt>', '</CanMisMonExt>' + condTag);
        } else {
          data = data.replace('</DocNro>', '</DocNro>' + condTag);
        }
        console.log('[WSFEv1] Inyectado manualmente despues de CanMisMonExt/DocNro');
      } else {
        console.log('[WSFEv1] CondicionIvaReceptorId ya presente en XML');
      }
      // Log XML detalle
      var start = data.indexOf('<FECAEDetRequest>');
      var end = data.indexOf('</FECAEDetRequest>') + 18;
      if (start !== -1 && end > start) {
        console.log('[WSFEv1] FINAL XML:', data.substring(start, end));
      }
    }
    return originalHttpRequest.call(this, rurl, data, callback, exheaders, exoptions);
  };

  try {
    const [result] = await client.FECAESolicitarAsync(request);
    client.httpClient.request = originalHttpRequest;

    const res = result.FECAESolicitarResult;

    if (res.Errors) {
      const errores = [].concat(res.Errors.Err || []);
      throw new Error(errores.map(e => '[' + e.Code + '] ' + e.Msg).join('; '));
    }

    const det = res.FeDetResp.FECAEDetResponse[0] || res.FeDetResp.FECAEDetResponse;

    if (det.Resultado === 'R') {
      const obs = [].concat(det.Observaciones?.Obs || []);
      throw new Error('Rechazado: ' + obs.map(o => '[' + o.Code + '] ' + o.Msg).join('; '));
    }

    return {
      CAE: det.CAE,
      CAEFchVto: det.CAEFchVto,
      CbteDesde: det.CbteDesde,
      CbteHasta: det.CbteHasta,
      Resultado: det.Resultado,
    };
  } catch (error) {
    client.httpClient.request = originalHttpRequest;
    throw error;
  }
}

// ── Consultar comprobante ─────────────────────────

export async function consultarComprobante(cbteTipo, ptoVta, cbteNro) {
  const client = await getClient();
  const Auth = await getAuth();
  const [result] = await client.FECompConsultarAsync({
    Auth,
    FeCompConsReq: { CbteTipo: cbteTipo, CbteNro: cbteNro, PtoVta: ptoVta },
  });
  const res = result.FECompConsultarResult;
  if (res.Errors) throw new Error(JSON.stringify(res.Errors));
  return res.ResultGet;
}

// ── Parámetros ────────────────────────────────────

export async function getTiposCbte() {
  const client = await getClient();
  const Auth = await getAuth();
  const [r] = await client.FEParamGetTiposCbteAsync({ Auth });
  return r.FEParamGetTiposCbteResult.ResultGet.CbteTipo;
}

export async function getTiposIva() {
  const client = await getClient();
  const Auth = await getAuth();
  const [r] = await client.FEParamGetTiposIvaAsync({ Auth });
  return r.FEParamGetTiposIvaResult.ResultGet.IvaTipo;
}

export async function getPuntosVenta() {
  const client = await getClient();
  const Auth = await getAuth();
  const [r] = await client.FEParamGetPtosVentaAsync({ Auth });
  return r.FEParamGetPtosVentaResult?.ResultGet?.PtoVenta || [];
}
