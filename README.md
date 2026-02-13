# GestionAR

Sistema de gestión para pinturería. Inventario, ventas, clientes, proveedores y reportes.

## Stack

- React 18 + Vite
- Tailwind CSS
- Firebase Firestore (base de datos)
- Recharts (gráficos)
- Lucide React (iconos)

## Setup

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear archivo `.env` basado en `.env.example` con tus credenciales de Firebase
4. Iniciar dev server:
   ```bash
   npm run dev
   ```

## Firebase

### Configuración

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Activar **Firestore Database** en modo producción
3. Ir a Project Settings > General > Your apps > Agregar app web
4. Copiar las credenciales al `.env`

### Reglas de Firestore

Copiar estas reglas en Firebase Console > Firestore Database > Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /productos/{docId} {
      allow read, write: if true;
    }
    match /ventas/{docId} {
      allow read, write: if true;
    }
    match /clientes/{docId} {
      allow read, write: if true;
    }
    match /proveedores/{docId} {
      allow read, write: if true;
    }
  }
}
```

> **Nota:** Estas reglas permiten acceso público. Cuando agregues autenticación, cambialas a `allow read, write: if request.auth != null;`

## Deploy en Vercel

1. Conectar el repositorio de GitHub en [Vercel](https://vercel.com)
2. En Settings > Environment Variables agregar:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Framework Preset: **Vite**
4. Deploy automático con cada push a `main`
