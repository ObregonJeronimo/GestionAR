// backend/src/wsfev1.js
// WSFEv1 - Web Service de Facturacion Electronica V1
// Ahora lee config desde Firebase via getConfig()

import soap from 'soap';
import { getConfig } from './config.js';
import { obtenerTicketAcceso } from './wsaa.js';

let soapClient = null;
let clientWsdl = null;

async function getClient() {
  const config = await getConfig();
  // Recrear cliente si cambio el WSDL (ej: cambio de entorno)
  if (!soapClient || clientWsdl !== config.wsfev1.wsdl) {
    soapClient = await soap.createClientAsync(config.wsfev1.wsdl, {
      disableCache: true,
    });
    soapClient.setEndpoint(config.wsfev1.url);
    clientWsdl = config.wsfev1.wsdl;
  }
  return soapClient;
}

async function getAuth() {
  const config = await getConfig();
  const { token, sign } = await obtenerTicketAcceso();
  return { Token: token, Sign: sign, Cuit: config.cuit };
}

// -- Verificacion --

export async function dummy() {
  const client = await getClient();
  const [result] = await client.FEDummyAsync({});
  return result.FEDummyResult;
}

// -- Consultas --

export async function ultimoComprobante(ptoVta, cbteTipo) {
  const client = await getClient();
  const Auth = await getAuth();
  const [result] = await client.FECompUltimoAutorizadoAsync({ Auth, PtoVta: ptoVta, CbteTipo: cbteTipo });
  const res = result.FECompUltimoAutorizadoResult;
  if (res.Errors) throw new Error(JSON.stringify(res.Errors));
  return res.CbteNro;
}

// -- Solicitar CAE (emitir factura) --

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
    CondicionIVAReceptorId: condIVA,
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

  console.log('[WSFEv1] Emitiendo factura tipo', factura.cbteTipo, 'con CondicionIVAReceptorId:', condIVA);

  const [result] = await client.FECAESolicitarAsync(request);
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
}

// -- Consultar comprobante --

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

// -- Parametros --

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
