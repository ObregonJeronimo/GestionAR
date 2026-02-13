// src/hooks/useFacturacion.js
import { useState, useCallback } from 'react';
import * as arcaApi from '../services/arcaApi';

export function useFacturacion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaFactura, setUltimaFactura] = useState(null);

  const emitirFactura = useCallback(async (datos) => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await arcaApi.emitirFactura(datos);
      setUltimaFactura(resultado);
      return resultado;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verificarEstado = useCallback(async () => {
    setLoading(true);
    try {
      const estado = await arcaApi.verificarEstadoArca();
      setError(null);
      return estado;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, ultimaFactura, emitirFactura, verificarEstado };
}
