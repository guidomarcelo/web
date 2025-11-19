// Gestor de Firebase para sincronización en la nube
class FirebaseManager {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.usuarioActual = null;
    }

    // Establecer usuario actual
    setUsuario(usuarioKey) {
        this.usuarioActual = usuarioKey;
    }

    // ========== GESTIÓN DE INMUEBLES ==========

    // Cargar todos los inmuebles del usuario desde Firestore
    async cargarInmuebles() {
        if (!this.usuarioActual) {
            console.warn('No hay usuario actual, usando localStorage como fallback');
            return this.cargarInmueblesLocal();
        }

        try {
            const inmueblesRef = this.db.collection('usuarios')
                .doc(this.usuarioActual)
                .collection('inmuebles');
            
            const snapshot = await inmueblesRef.get();
            const inmuebles = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                inmuebles.push({
                    id: doc.id,
                    ...data
                });
            });
            
            console.log('Inmuebles cargados desde Firebase:', inmuebles.length);
            return inmuebles;
        } catch (error) {
            console.error('Error al cargar inmuebles desde Firebase:', error);
            // Fallback a localStorage
            return this.cargarInmueblesLocal();
        }
    }

    // Guardar inmueble en Firestore
    async guardarInmueble(inmueble) {
        if (!this.usuarioActual) {
            console.warn('No hay usuario actual, guardando en localStorage');
            return this.guardarInmuebleLocal(inmueble);
        }

        try {
            const inmueblesRef = this.db.collection('usuarios')
                .doc(this.usuarioActual)
                .collection('inmuebles');
            
            if (inmueble.id) {
                // Actualizar inmueble existente
                await inmueblesRef.doc(inmueble.id).set(inmueble, { merge: true });
                console.log('Inmueble actualizado en Firebase:', inmueble.id);
            } else {
                // Crear nuevo inmueble
                const docRef = await inmueblesRef.add(inmueble);
                inmueble.id = docRef.id;
                console.log('Inmueble creado en Firebase:', docRef.id);
            }
            
            return inmueble;
        } catch (error) {
            console.error('Error al guardar inmueble en Firebase:', error);
            // Fallback a localStorage
            return this.guardarInmuebleLocal(inmueble);
        }
    }

    // Eliminar inmueble de Firestore
    async eliminarInmueble(inmuebleId) {
        if (!this.usuarioActual) {
            return this.eliminarInmuebleLocal(inmuebleId);
        }

        try {
            // Eliminar inmueble
            await this.db.collection('usuarios')
                .doc(this.usuarioActual)
                .collection('inmuebles')
                .doc(inmuebleId)
                .delete();
            
            // Eliminar todos los archivos asociados a los documentos del inmueble
            // Primero necesitamos obtener los documentos
            const inmuebleRef = this.db.collection('usuarios')
                .doc(this.usuarioActual)
                .collection('inmuebles')
                .doc(inmuebleId);
            
            // Nota: Los documentos se eliminan automáticamente con el inmueble
            // pero los archivos en Storage deben eliminarse manualmente
            console.log('Inmueble eliminado de Firebase:', inmuebleId);
            return true;
        } catch (error) {
            console.error('Error al eliminar inmueble de Firebase:', error);
            return this.eliminarInmuebleLocal(inmuebleId);
        }
    }

    // Guardar todos los inmuebles (para sincronización)
    async guardarTodosInmuebles(inmuebles) {
        if (!this.usuarioActual) {
            return this.guardarTodosInmueblesLocal(inmuebles);
        }

        try {
            const batch = this.db.batch();
            const inmueblesRef = this.db.collection('usuarios')
                .doc(this.usuarioActual)
                .collection('inmuebles');
            
            inmuebles.forEach(inmueble => {
                const docRef = inmueblesRef.doc(inmueble.id || this.db.collection('temp').doc().id);
                batch.set(docRef, inmueble);
            });
            
            await batch.commit();
            console.log('Todos los inmuebles guardados en Firebase');
            return true;
        } catch (error) {
            console.error('Error al guardar todos los inmuebles:', error);
            return false;
        }
    }

    // ========== GESTIÓN DE ARCHIVOS ==========

    // Guardar archivo en Firebase Storage
    async guardarArchivo(documentoId, archivo, inmuebleId) {
        if (!this.usuarioActual) {
            console.warn('No hay usuario actual, guardando en IndexedDB');
            // Fallback a IndexedDB
            if (window.dbManager) {
                return await window.dbManager.guardarArchivo(documentoId, archivo);
            }
            return null;
        }

        try {
            const rutaArchivo = `usuarios/${this.usuarioActual}/inmuebles/${inmuebleId}/documentos/${documentoId}/${archivo.name}`;
            const storageRef = this.storage.ref(rutaArchivo);
            
            // Subir archivo
            const snapshot = await storageRef.put(archivo);
            
            // Obtener URL de descarga
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log('Archivo guardado en Firebase Storage:', rutaArchivo);
            
            return {
                id: documentoId,
                nombre: archivo.name,
                tipo: archivo.type,
                tamaño: archivo.size,
                url: downloadURL,
                ruta: rutaArchivo,
                fechaSubida: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error al guardar archivo en Firebase Storage:', error);
            // Fallback a IndexedDB
            if (window.dbManager) {
                return await window.dbManager.guardarArchivo(documentoId, archivo);
            }
            return null;
        }
    }

    // Obtener archivo de Firebase Storage
    async obtenerArchivo(documentoId, url) {
        if (!url) {
            // Fallback a IndexedDB si no hay URL
            if (window.dbManager) {
                return await window.dbManager.obtenerArchivo(documentoId);
            }
            return null;
        }

        try {
            // Descargar archivo desde la URL
            const response = await fetch(url);
            const blob = await response.blob();
            
            return {
                datos: await blob.arrayBuffer(),
                tipo: blob.type,
                nombre: url.split('/').pop()
            };
        } catch (error) {
            console.error('Error al obtener archivo de Firebase Storage:', error);
            // Fallback a IndexedDB
            if (window.dbManager) {
                return await window.dbManager.obtenerArchivo(documentoId);
            }
            return null;
        }
    }

    // Eliminar archivo de Firebase Storage
    async eliminarArchivo(rutaArchivo) {
        if (!rutaArchivo || !this.usuarioActual) {
            return false;
        }

        try {
            const storageRef = this.storage.ref(rutaArchivo);
            await storageRef.delete();
            console.log('Archivo eliminado de Firebase Storage:', rutaArchivo);
            return true;
        } catch (error) {
            console.error('Error al eliminar archivo de Firebase Storage:', error);
            return false;
        }
    }

    // Descargar archivo
    async descargarArchivo(documentoId, nombreArchivo, url) {
        if (!url) {
            // Fallback a IndexedDB
            if (window.dbManager) {
                return await window.dbManager.descargarArchivo(documentoId, nombreArchivo);
            }
            return false;
        }

        try {
            const archivoData = await this.obtenerArchivo(documentoId, url);
            if (archivoData) {
                const blob = new Blob([archivoData.datos], { type: archivoData.tipo });
                const urlBlob = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = urlBlob;
                link.download = nombreArchivo;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(urlBlob);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            return false;
        }
    }

    // Abrir archivo
    async abrirArchivo(documentoId, url) {
        if (!url) {
            // Fallback a IndexedDB
            if (window.dbManager) {
                return await window.dbManager.abrirArchivo(documentoId);
            }
            return false;
        }

        try {
            // Abrir en nueva pestaña
            window.open(url, '_blank');
            return true;
        } catch (error) {
            console.error('Error al abrir archivo:', error);
            return false;
        }
    }

    // ========== MÉTODOS DE FALLBACK (localStorage/IndexedDB) ==========

    cargarInmueblesLocal() {
        const datos = localStorage.getItem('inmuebles');
        return datos ? JSON.parse(datos) : [];
    }

    guardarInmuebleLocal(inmueble) {
        const inmuebles = this.cargarInmueblesLocal();
        const index = inmuebles.findIndex(i => i.id === inmueble.id);
        
        if (index !== -1) {
            inmuebles[index] = inmueble;
        } else {
            inmuebles.push(inmueble);
        }
        
        localStorage.setItem('inmuebles', JSON.stringify(inmuebles));
        return inmueble;
    }

    eliminarInmuebleLocal(inmuebleId) {
        const inmuebles = this.cargarInmueblesLocal();
        const filtrados = inmuebles.filter(i => i.id !== inmuebleId);
        localStorage.setItem('inmuebles', JSON.stringify(filtrados));
        return true;
    }

    guardarTodosInmueblesLocal(inmuebles) {
        localStorage.setItem('inmuebles', JSON.stringify(inmuebles));
        return true;
    }

    // ========== SINCRONIZACIÓN ==========

    // Sincronizar datos locales con Firebase
    async sincronizar() {
        if (!this.usuarioActual) {
            console.log('No hay usuario, no se puede sincronizar');
            return;
        }

        try {
            // Cargar desde Firebase
            const inmueblesFirebase = await this.cargarInmuebles();
            
            // Cargar desde localStorage
            const inmueblesLocal = this.cargarInmueblesLocal();
            
            // Si hay datos en Firebase, usarlos (tienen prioridad)
            if (inmueblesFirebase.length > 0) {
                // Guardar en localStorage como backup
                localStorage.setItem('inmuebles', JSON.stringify(inmueblesFirebase));
                return inmueblesFirebase;
            } else if (inmueblesLocal.length > 0) {
                // Si no hay en Firebase pero sí en local, subir a Firebase
                await this.guardarTodosInmuebles(inmueblesLocal);
                return inmueblesLocal;
            }
            
            return [];
        } catch (error) {
            console.error('Error en sincronización:', error);
            return this.cargarInmueblesLocal();
        }
    }
}

