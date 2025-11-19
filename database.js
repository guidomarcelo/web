// Gestor de Base de Datos IndexedDB para Archivos
class DatabaseManager {
    constructor() {
        this.dbName = 'GestorInmueblesDB';
        this.dbVersion = 1;
        this.storeName = 'archivos';
        this.db = null;
    }

    // Inicializar la base de datos
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error al abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB inicializada correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear object store si no existe
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    objectStore.createIndex('documentoId', 'documentoId', { unique: false });
                    console.log('Object store creado');
                }
            };
        });
    }

    // Guardar archivo en IndexedDB
    async guardarArchivo(documentoId, archivo) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                const archivoData = {
                    id: documentoId,
                    documentoId: documentoId,
                    nombre: archivo.name,
                    tipo: archivo.type,
                    tamaño: archivo.size,
                    datos: event.target.result,
                    fechaSubida: new Date().toISOString()
                };

                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(archivoData);

                request.onsuccess = () => {
                    console.log('Archivo guardado en IndexedDB:', archivo.name);
                    resolve(archivoData);
                };

                request.onerror = () => {
                    console.error('Error al guardar archivo:', request.error);
                    reject(request.error);
                };
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            reader.readAsArrayBuffer(archivo);
        });
    }

    // Obtener archivo de IndexedDB
    async obtenerArchivo(documentoId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(documentoId);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('Error al obtener archivo:', request.error);
                reject(request.error);
            };
        });
    }

    // Eliminar archivo de IndexedDB
    async eliminarArchivo(documentoId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(documentoId);

            request.onsuccess = () => {
                console.log('Archivo eliminado de IndexedDB:', documentoId);
                resolve();
            };

            request.onerror = () => {
                console.error('Error al eliminar archivo:', request.error);
                reject(request.error);
            };
        });
    }

    // Descargar archivo
    async descargarArchivo(documentoId, nombreArchivo) {
        try {
            const archivoData = await this.obtenerArchivo(documentoId);
            
            if (!archivoData) {
                throw new Error('Archivo no encontrado');
            }

            // Convertir ArrayBuffer a Blob
            const blob = new Blob([archivoData.datos], { type: archivoData.tipo });
            
            // Crear URL del blob
            const url = URL.createObjectURL(blob);
            
            // Crear elemento <a> para descargar
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo || archivoData.nombre;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Liberar URL después de un tiempo
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            return true;
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            throw error;
        }
    }

    // Abrir archivo en nueva pestaña
    async abrirArchivo(documentoId) {
        try {
            const archivoData = await this.obtenerArchivo(documentoId);
            
            if (!archivoData) {
                throw new Error('Archivo no encontrado');
            }

            // Convertir ArrayBuffer a Blob
            const blob = new Blob([archivoData.datos], { type: archivoData.tipo });
            
            // Crear URL del blob
            const url = URL.createObjectURL(blob);
            
            // Abrir en nueva ventana
            const nuevaVentana = window.open(url, '_blank');
            
            // Liberar URL después de un tiempo
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return true;
        } catch (error) {
            console.error('Error al abrir archivo:', error);
            throw error;
        }
    }

    // Obtener información de la base de datos
    async obtenerInfoDB() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve({
                    nombre: this.dbName,
                    version: this.dbVersion,
                    cantidadArchivos: request.result
                });
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Limpiar todos los archivos (útil para mantenimiento)
    async limpiarTodosLosArchivos() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('Todos los archivos eliminados de IndexedDB');
                resolve();
            };

            request.onerror = () => {
                console.error('Error al limpiar archivos:', request.error);
                reject(request.error);
            };
        });
    }
}

