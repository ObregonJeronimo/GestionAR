// backend/src/firebaseConfig.js
// Conexion a Firebase desde el backend para leer configuracion ARCA

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let db = null;

function getDb() {
  if (!db) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

// Cache de configuracion (se refresca cada 5 minutos)
let cachedConfig = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Lee la configuracion ARCA desde Firestore
 * @returns {{ cuit, entorno, certificado, clavePrivada, razonSocial, domicilio, condicionIva, ptoVtaDefault }}
 */
export async function getArcaConfig() {
  // Retornar cache si es reciente
  if (cachedConfig && cacheTime && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedConfig;
  }

  console.log('[Firebase] Leyendo configuracion ARCA desde Firestore...');
  const database = getDb();
  const ref = doc(database, 'configuracion', 'arca');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('No hay configuracion ARCA en Firebase. Configurala desde la app.');
  }

  const data = snap.data();

  if (!data.certificado || !data.clavePrivada || !data.cuit) {
    throw new Error('Configuracion ARCA incompleta. Falta certificado, clave o CUIT.');
  }

  cachedConfig = data;
  cacheTime = Date.now();

  console.log(`[Firebase] Config ARCA cargada: CUIT=${data.cuit}, Entorno=${data.entorno}`);
  return data;
}

/**
 * Invalida el cache para forzar recarga
 */
export function invalidarConfigCache() {
  cachedConfig = null;
  cacheTime = null;
}
