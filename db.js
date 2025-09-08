import { createEmpresa } from './models.js';

const DB_NAME = 'AsistenteContableDB';
const DB_VERSION = 1;
let db;

const STORES = {
    empresas: 'empresas',
    desembolsos: 'desembolsos',
    rendiciones: 'rendiciones'
};

export function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Error al abrir IndexedDB:", event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            
            if (!dbInstance.objectStoreNames.contains(STORES.empresas)) {
                dbInstance.createObjectStore(STORES.empresas, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(STORES.desembolsos)) {
                const desembolsosStore = dbInstance.createObjectStore(STORES.desembolsos, { keyPath: 'id' });
                desembolsosStore.createIndex('empresaId', 'empresaId', { unique: false });
                desembolsosStore.createIndex('fecha', 'fecha', { unique: false });
            }
            if (!dbInstance.objectStoreNames.contains(STORES.rendiciones)) {
                const rendicionesStore = dbInstance.createObjectStore(STORES.rendiciones, { keyPath: 'id' });
                rendicionesStore.createIndex('empresaId', 'empresaId', { unique: false });
            }

            // Precargar datos iniciales si es la primera vez
            const transaction = event.target.transaction;
            const empresaStore = transaction.objectStore(STORES.empresas);
            empresaStore.count().onsuccess = (e) => {
                if (e.target.result === 0) {
                    const empresasIniciales = [
                        createEmpresa('Empresa A'),
                        createEmpresa('Empresa B'),
                        createEmpresa('Empresa C'),
                    ];
                    empresasIniciales.forEach(empresa => empresaStore.add(empresa));
                }
            };
        };
    });
}

function getStore(storeName, mode = 'readonly') {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

// --- Operaciones CRUD Genéricas ---
export function getAll(storeName) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export function getById(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export function add(storeName, item) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, 'readwrite');
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export function put(storeName, item) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, 'readwrite');
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export function remove(storeName, id) {
    return new Promise((resolve, reject) => {
        const store = getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

// --- Importación y Exportación ---
export async function exportData() {
    const data = {};
    for (const storeName of Object.values(STORES)) {
        data[storeName] = await getAll(storeName);
    }
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `asistente-contable-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const tx = db.transaction(Object.values(STORES), 'readwrite');
                
                // Limpiar y luego agregar
                for (const storeName of Object.values(STORES)) {
                    const store = tx.objectStore(storeName);
                    store.clear();
                    if (data[storeName]) {
                        data[storeName].forEach(item => store.add(item));
                    }
                }

                tx.oncomplete = () => resolve();
                tx.onerror = (e) => reject(e.target.error);

            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}