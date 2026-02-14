# Guía: Facturación Electrónica ARCA en GestionAR

## Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  GestionAR       │────▶│  Backend Node.js  │────▶│  ARCA (ex AFIP)   │
│  React + Vite   │     │  Express (3001)   │     │  SOAP Web Services│
└─────────────────┘     └──────────────────┘     └───────────────────┘
        ↕                       ↕
     Firebase              Certificado X.509
     (Firestore)           + Clave Privada
```

## Paso 1: Generar clave privada y CSR

En tu terminal:

```bash
# Generar clave privada
openssl genrsa -out backend/certs/MiClavePrivada.key 2048

# Generar CSR (reemplazar CUIT con el tuyo)
openssl req -new -key backend/certs/MiClavePrivada.key \
  -subj "/C=AR/O=TuEmpresa/CN=TuNombre/serialNumber=CUIT 20XXXXXXXXX" \
  -out MiCertificado.csr
```

## Paso 2: Obtener certificado en ARCA (Homologación)

1. Ir a https://auth.afip.gob.ar/contribuyente_/login.xhtml
2. Ingresar con CUIT + clave fiscal
3. Buscar servicio **"WSASS - Autogestión Certificados Homologación"**
   - Si no aparece: ir a "Administrador de Relaciones de Clave Fiscal" → agregar WSASS
4. En WSASS:
   - Click "Crear nuevo certificado"
   - Pegar el contenido del archivo `MiCertificado.csr`
   - Descargar el certificado `.pem`
5. En WSASS: **asociar el certificado al servicio "wsfe"**
6. Copiar el `.pem` descargado a `backend/certs/MiCertificado.pem`

## Paso 3: Configurar el backend

```bash
cd backend
cp .env.example .env
# Editar .env con tu CUIT
npm install
```

Editar `backend/.env`:
```
ARCA_CUIT=20XXXXXXXXX
ARCA_ENV=homologacion
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Paso 4: Levantar todo

Terminal 1 (backend):
```bash
cd backend
npm run dev
```

Terminal 2 (frontend):
```bash
npm run dev
```

Ir a http://localhost:5173/facturacion

## Paso 5: Probar

1. Click en "Estado ARCA" → debe mostrar "Conectado"
2. Registrar una venta en la sección Ventas
3. Ir a Facturación → "Nueva Factura"
4. Seleccionar la venta, tipo de factura, y emitir

## Para producción

1. Generar certificado de producción desde "Administrador de Certificados Digitales" en ARCA
2. Asociarlo a "wsfe" en "Administrador de Relaciones de Clave Fiscal"
3. Cambiar `ARCA_ENV=production` en `.env`
4. Dar de alta un punto de venta electrónico en ARCA

## URLs de referencia

| Servicio | Homologación | Producción |
|----------|-------------|------------|
| WSAA | wsaahomo.afip.gov.ar/ws/services/LoginCms | wsaa.afip.gov.ar/ws/services/LoginCms |
| WSFEv1 | wswhomo.afip.gov.ar/wsfev1/service.asmx | servicios1.afip.gov.ar/wsfev1/service.asmx |

## Tipos de Comprobante

| Código | Tipo | IVA |
|--------|------|-----|
| 1 | Factura A | Sí, desglosado |
| 6 | Factura B | Sí, desglosado |
| 11 | Factura C | No (monotributo) |

## Contacto ARCA

- Homologación: webservices-desa@arca.gob.ar
- Producción: sri@arca.gob.ar
- Normativa: facturaelectronica@arca.gob.ar
