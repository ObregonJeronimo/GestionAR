import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

// ============================================================
// Colecciones en Firestore
// ============================================================
const COLLECTIONS = {
  PRODUCTOS: 'productos',
  VENTAS: 'ventas',
  CLIENTES: 'clientes',
  PROVEEDORES: 'proveedores',
  FACTURAS: 'facturas',
}

// ============================================================
// Helpers genéricos
// ============================================================
async function getAll(colName, ordenarPor) {
  try {
    const ref = collection(db, colName)
    const q = ordenarPor ? query(ref, orderBy(ordenarPor)) : ref
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error(`Error al obtener ${colName}:`, error)
    return []
  }
}

async function addItem(colName, data) {
  const { id, ...rest } = data
  const docRef = await addDoc(collection(db, colName), rest)
  return { id: docRef.id, ...rest }
}

async function updateItem(colName, id, data) {
  const { id: _id, ...rest } = data
  const ref = doc(db, colName, id)
  await updateDoc(ref, rest)
  return { id, ...rest }
}

async function removeItem(colName, id) {
  await deleteDoc(doc(db, colName, id))
}

// ============================================================
// Productos
// ============================================================
export async function getProductos() {
  return getAll(COLLECTIONS.PRODUCTOS, 'nombre')
}

export async function saveProducto(producto) {
  if (producto.id) {
    return updateItem(COLLECTIONS.PRODUCTOS, producto.id, producto)
  }
  return addItem(COLLECTIONS.PRODUCTOS, producto)
}

export async function deleteProducto(id) {
  return removeItem(COLLECTIONS.PRODUCTOS, id)
}

// ============================================================
// Ventas
// ============================================================
export async function getVentas() {
  return getAll(COLLECTIONS.VENTAS)
}

export async function saveVenta(venta) {
  venta.fecha = new Date().toISOString()
  const saved = await addItem(COLLECTIONS.VENTAS, venta)
  const batch = writeBatch(db)
  for (const item of venta.items) {
    const prodRef = doc(db, COLLECTIONS.PRODUCTOS, item.productoId)
    const prodSnap = await getDoc(prodRef)
    if (prodSnap.exists()) {
      const current = prodSnap.data().cantidad || 0
      batch.update(prodRef, { cantidad: Math.max(0, current - item.cantidad) })
    }
  }
  await batch.commit()
  return saved
}

export async function deleteVenta(id) {
  return removeItem(COLLECTIONS.VENTAS, id)
}

// ============================================================
// Clientes
// ============================================================
export async function getClientes() {
  return getAll(COLLECTIONS.CLIENTES, 'nombre')
}

export async function saveCliente(cliente) {
  if (cliente.id) {
    return updateItem(COLLECTIONS.CLIENTES, cliente.id, cliente)
  }
  return addItem(COLLECTIONS.CLIENTES, cliente)
}

export async function deleteCliente(id) {
  return removeItem(COLLECTIONS.CLIENTES, id)
}

// ============================================================
// Proveedores
// ============================================================
export async function getProveedores() {
  return getAll(COLLECTIONS.PROVEEDORES, 'nombre')
}

export async function saveProveedor(proveedor) {
  if (proveedor.id) {
    return updateItem(COLLECTIONS.PROVEEDORES, proveedor.id, proveedor)
  }
  return addItem(COLLECTIONS.PROVEEDORES, proveedor)
}

export async function deleteProveedor(id) {
  return removeItem(COLLECTIONS.PROVEEDORES, id)
}

// ============================================================
// Facturas
// ============================================================
export async function getFacturas() {
  return getAll(COLLECTIONS.FACTURAS)
}

export async function saveFactura(factura) {
  return addItem(COLLECTIONS.FACTURAS, factura)
}

export async function deleteFactura(id) {
  return removeItem(COLLECTIONS.FACTURAS, id)
}
