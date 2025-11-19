// Gestor de Inmuebles - Aplicación Principal

class GestorInmuebles {
    constructor() {
        this.usuarioActual = null;
        this.inmuebles = [];
        this.inmuebleActual = null;
        this.dbManager = new DatabaseManager();
        this.firebaseManager = null;
        this.usandoFirebase = false;
        // Lista de todos los tipos de documentos requeridos
        this.tiposDocumentos = [
            'informes',
            'oficios-recibidos',
            'oficios-expedidos',
            'actas',
            'notas-de-servicio',
            'documentacion-de-respaldo',
            'testimonio',
            'ubicacion',
            'folio-real',
            'catastro',
            'impuestos',
            'planos',
            'coordenadas',
            'contratos',
            'convenios',
            'procesos',
            'servicios',
            'formulario-de-asignacion',
            'fotograma'
        ];
        this.init();
    }

    async init() {
        // Verificar si hay sesión activa
        this.verificarSesion();
        
        // Inicializar Firebase si está disponible
        try {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                this.firebaseManager = new FirebaseManager();
                this.usandoFirebase = true;
                console.log('Firebase inicializado correctamente');
                
                if (this.usuarioActual) {
                    this.firebaseManager.setUsuario(this.usuarioActual);
                    // Sincronizar datos
                    this.inmuebles = await this.firebaseManager.sincronizar();
                }
            } else {
                console.log('Firebase no configurado, usando almacenamiento local');
                this.inmuebles = this.cargarInmuebles();
            }
        } catch (error) {
            console.error('Error al inicializar Firebase:', error);
            console.log('Usando almacenamiento local como fallback');
            this.inmuebles = this.cargarInmuebles();
        }
        
        // Inicializar IndexedDB (siempre como fallback)
        try {
            await this.dbManager.init();
        } catch (error) {
            console.error('Error al inicializar IndexedDB:', error);
        }
        
        this.setupEventListeners();
        
        // Solo mostrar inmuebles si hay sesión activa
        if (this.usuarioActual) {
            this.mostrarInmuebles();
        }
    }

    // Verificar sesión activa
    verificarSesion() {
        const sesion = localStorage.getItem('sesionActiva');
        const usuario = localStorage.getItem('usuarioActual');
        
        if (sesion === 'true' && usuario) {
            this.usuarioActual = usuario;
            this.mostrarAplicacion();
        } else {
            this.mostrarLogin();
        }
    }

    // Mostrar pantalla de login
    mostrarLogin() {
        document.getElementById('loginContainer').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        this.mostrarVistaLogin();
    }

    // Mostrar vista de login
    mostrarVistaLogin() {
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('registerView').classList.add('hidden');
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').classList.add('hidden');
    }

    // Mostrar vista de registro
    mostrarRegistro() {
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('registerView').classList.remove('hidden');
        document.getElementById('registerForm').reset();
        document.getElementById('registerError').classList.add('hidden');
        document.getElementById('registerSuccess').classList.add('hidden');
    }

    // Mostrar aplicación principal
    async mostrarAplicacion() {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        
        // Configurar Firebase Manager con el usuario actual
        if (this.firebaseManager) {
            this.firebaseManager.setUsuario(this.usuarioActual);
            // Sincronizar datos al iniciar sesión
            try {
                this.inmuebles = await this.firebaseManager.sincronizar();
                this.mostrarInmuebles();
            } catch (error) {
                console.error('Error al sincronizar:', error);
                this.inmuebles = this.cargarInmuebles();
            }
        }
        
        // Obtener información del usuario para mostrar
        const usuarios = this.inicializarUsuarios();
        const usuario = usuarios[this.usuarioActual];
        const nombreMostrar = usuario?.email || this.usuarioActual;
        const syncIcon = this.usandoFirebase ? '<i class="fas fa-cloud" title="Sincronizado en la nube"></i>' : '<i class="fas fa-hdd" title="Almacenamiento local"></i>';
        document.getElementById('userInfo').innerHTML = `${syncIcon} <i class="fas fa-user"></i> ${nombreMostrar}`;
    }

    // Inicializar usuarios (crear usuario por defecto si no existe)
    inicializarUsuarios() {
        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '{}');
        
        // Crear usuario admin por defecto si no existe
        if (!usuarios['admin']) {
            usuarios['admin'] = {
                email: 'admin@admin.com',
                carnet: '00000000',
                password: 'admin', // En producción, esto debería estar hasheado
                palabraClave: 'admin', // En producción, esto debería estar hasheado
                creado: new Date().toISOString()
            };
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        }
        
        return usuarios;
    }

    // Validar credenciales (por email o carnet)
    validarCredenciales(identificador, password) {
        const usuarios = this.inicializarUsuarios();
        
        // Buscar usuario por email o carnet
        let usuarioEncontrado = null;
        let usuarioKey = null;
        
        for (const [key, usuario] of Object.entries(usuarios)) {
            if (usuario.email === identificador || usuario.carnet === identificador) {
                usuarioEncontrado = usuario;
                usuarioKey = key;
                break;
            }
        }
        
        // También verificar si es el usuario admin por nombre
        if (!usuarioEncontrado && identificador === 'admin') {
            usuarioEncontrado = usuarios['admin'];
            usuarioKey = 'admin';
        }
        
        if (usuarioEncontrado && usuarioEncontrado.password === password) {
            return { valido: true, usuarioKey: usuarioKey, usuario: usuarioEncontrado };
        }
        
        if (!usuarioEncontrado) {
            return { valido: false, error: 'Usuario o contraseña incorrectos' };
        }
        
        return { valido: false, error: 'Contraseña incorrecta' };
    }

    // Iniciar sesión
    iniciarSesion(identificador, password, recordar) {
        const validacion = this.validarCredenciales(identificador, password);
        
        if (validacion.valido) {
            this.usuarioActual = validacion.usuarioKey;
            localStorage.setItem('sesionActiva', 'true');
            localStorage.setItem('usuarioActual', validacion.usuarioKey);
            
            if (recordar) {
                localStorage.setItem('recordarSesion', 'true');
            } else {
                localStorage.removeItem('recordarSesion');
            }
            
            this.mostrarAplicacion();
            return { exito: true };
        }
        return { exito: false, error: validacion.error || 'Error al iniciar sesión' };
    }

    // Registrar nuevo usuario
    registrarUsuario(email, carnet, password, palabraClave) {
        const usuarios = this.inicializarUsuarios();
        
        // Validar que el email no exista
        for (const usuario of Object.values(usuarios)) {
            if (usuario.email && usuario.email.toLowerCase() === email.toLowerCase()) {
                return { exito: false, error: 'Este correo electrónico ya está registrado' };
            }
        }
        
        // Validar que el carnet no exista
        for (const usuario of Object.values(usuarios)) {
            if (usuario.carnet === carnet) {
                return { exito: false, error: 'Este número de carnet ya está registrado' };
            }
        }
        
        // Crear nuevo usuario
        const nuevoUsuario = {
            email: email.toLowerCase(),
            carnet: carnet,
            password: password, // En producción, esto debería estar hasheado
            palabraClave: palabraClave, // En producción, esto debería estar hasheado
            creado: new Date().toISOString()
        };
        
        // Usar email como clave (sin @ y puntos)
        const usuarioKey = email.toLowerCase().replace(/[@.]/g, '_');
        usuarios[usuarioKey] = nuevoUsuario;
        
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        
        return { exito: true, usuarioKey: usuarioKey };
    }

    // Cerrar sesión
    cerrarSesion() {
        this.usuarioActual = null;
        localStorage.removeItem('sesionActiva');
        localStorage.removeItem('usuarioActual');
        this.mostrarLogin();
        // Limpiar formulario de login
        document.getElementById('loginForm').reset();
    }

    // Cargar inmuebles desde localStorage (fallback)
    cargarInmuebles() {
        const datos = localStorage.getItem('inmuebles');
        return datos ? JSON.parse(datos) : [];
    }

    // Guardar inmuebles (Firebase o localStorage)
    async guardarInmuebles() {
        if (this.firebaseManager && this.usuarioActual) {
            // Guardar en Firebase
            for (const inmueble of this.inmuebles) {
                await this.firebaseManager.guardarInmueble(inmueble);
            }
        }
        // También guardar en localStorage como backup
        localStorage.setItem('inmuebles', JSON.stringify(this.inmuebles));
    }

    // Configurar event listeners
    setupEventListeners() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => this.procesarLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.procesarRegistro(e));
        document.getElementById('linkRegistro').addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarRegistro();
        });
        document.getElementById('linkLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarVistaLogin();
        });
        document.getElementById('btnCerrarSesion').addEventListener('click', () => this.cerrarSesion());
        
        // Botones principales
        document.getElementById('btnNuevoInmueble').addEventListener('click', () => {
            if (this.usuarioActual) this.mostrarFormulario();
        });
        document.getElementById('btnCancelar').addEventListener('click', () => this.mostrarLista());
        document.getElementById('btnVolver').addEventListener('click', () => this.mostrarLista());
        
        // Formulario de inmueble
        document.getElementById('inmuebleForm').addEventListener('submit', (e) => this.guardarInmueble(e));
        
        // Botones de detalle
        document.getElementById('btnEditar').addEventListener('click', () => this.editarInmueble());
        document.getElementById('btnEliminar').addEventListener('click', () => this.eliminarInmueble());
        
        // Búsqueda
        document.getElementById('searchInput').addEventListener('input', (e) => this.buscarInmuebles(e.target.value));
        
        // Modal de documentos
        document.getElementById('btnCerrarModal').addEventListener('click', () => this.cerrarModal());
        document.getElementById('btnCancelarDocumento').addEventListener('click', () => this.cerrarModal());
        document.getElementById('documentForm').addEventListener('submit', (e) => this.guardarDocumento(e));
        
        // Modal de lista de documentos
        document.getElementById('btnCerrarListaModal').addEventListener('click', () => this.cerrarModalLista());
        
        // Cerrar modales al hacer clic fuera
        document.getElementById('documentModal').addEventListener('click', (e) => {
            if (e.target.id === 'documentModal') {
                this.cerrarModal();
            }
        });
        
        document.getElementById('listaDocumentosModal').addEventListener('click', (e) => {
            if (e.target.id === 'listaDocumentosModal') {
                this.cerrarModalLista();
            }
        });
    }

    // Procesar login
    procesarLogin(e) {
        e.preventDefault();
        
        const identificador = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('password').value;
        const recordar = document.getElementById('rememberMe').checked;
        const errorDiv = document.getElementById('loginError');
        
        // Limpiar error anterior
        errorDiv.classList.add('hidden');
        
        if (!identificador || !password) {
            errorDiv.textContent = 'Por favor, completa todos los campos';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        const resultado = this.iniciarSesion(identificador, password, recordar);
        
        if (resultado.exito) {
            // Login exitoso
            errorDiv.classList.add('hidden');
        } else {
            // Error en login
            errorDiv.textContent = resultado.error || 'Correo/carnet o contraseña incorrectos';
            errorDiv.classList.remove('hidden');
            document.getElementById('password').value = '';
        }
    }

    // Procesar registro
    procesarRegistro(e) {
        e.preventDefault();
        
        const email = document.getElementById('regEmail').value.trim();
        const carnet = document.getElementById('regCarnet').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;
        const palabraClave = document.getElementById('regPalabraClave').value.trim();
        const errorDiv = document.getElementById('registerError');
        const successDiv = document.getElementById('registerSuccess');
        
        // Limpiar mensajes anteriores
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
        
        // Validaciones
        if (!email || !carnet || !password || !passwordConfirm || !palabraClave) {
            errorDiv.textContent = 'Por favor, completa todos los campos';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorDiv.textContent = 'Por favor, ingresa un correo electrónico válido';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Validar carnet (solo números)
        if (!/^\d+$/.test(carnet)) {
            errorDiv.textContent = 'El número de carnet debe contener solo números';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Validar longitud de contraseña
        if (password.length < 6) {
            errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Validar que las contraseñas coincidan
        if (password !== passwordConfirm) {
            errorDiv.textContent = 'Las contraseñas no coinciden';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Validar palabra clave
        if (palabraClave.length < 3) {
            errorDiv.textContent = 'La palabra clave debe tener al menos 3 caracteres';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Registrar usuario
        const resultado = this.registrarUsuario(email, carnet, password, palabraClave);
        
        if (resultado.exito) {
            // Registro exitoso
            successDiv.textContent = '¡Cuenta creada exitosamente! Redirigiendo al login...';
            successDiv.classList.remove('hidden');
            
            // Limpiar formulario
            document.getElementById('registerForm').reset();
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                this.mostrarVistaLogin();
                document.getElementById('loginEmail').value = email;
            }, 2000);
        } else {
            // Error en el registro
            errorDiv.textContent = resultado.error || 'Error al crear la cuenta. Por favor, intenta nuevamente.';
            errorDiv.classList.remove('hidden');
        }
    }

    // Mostrar lista de inmuebles
    mostrarLista() {
        document.getElementById('inmueblesSection').classList.remove('hidden');
        document.getElementById('formSection').classList.add('hidden');
        document.getElementById('detailSection').classList.add('hidden');
        this.inmuebleActual = null;
        this.mostrarInmuebles();
    }

    // Mostrar formulario
    mostrarFormulario(inmueble = null) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        document.getElementById('inmueblesSection').classList.add('hidden');
        document.getElementById('formSection').classList.remove('hidden');
        document.getElementById('detailSection').classList.add('hidden');

        const form = document.getElementById('inmuebleForm');
        const formTitle = document.getElementById('formTitle');

        if (inmueble) {
            formTitle.textContent = 'Editar Inmueble';
            document.getElementById('inmuebleId').value = inmueble.id;
            document.getElementById('direccion').value = inmueble.direccion;
            document.getElementById('tipo').value = inmueble.tipo;
            document.getElementById('precio').value = inmueble.precio || '';
            document.getElementById('metros').value = inmueble.metros || '';
            document.getElementById('habitaciones').value = inmueble.habitaciones || '';
            document.getElementById('descripcion').value = inmueble.descripcion || '';
        } else {
            formTitle.textContent = 'Nuevo Inmueble';
            form.reset();
            document.getElementById('inmuebleId').value = '';
        }
    }

    // Mostrar detalle de inmueble
    mostrarDetalle(inmueble) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        document.getElementById('inmueblesSection').classList.add('hidden');
        document.getElementById('formSection').classList.add('hidden');
        document.getElementById('detailSection').classList.remove('hidden');

        this.inmuebleActual = inmueble;

        document.getElementById('detailDireccion').textContent = inmueble.direccion;
        document.getElementById('detailTipo').textContent = this.formatearTipo(inmueble.tipo);
        document.getElementById('detailPrecio').textContent = inmueble.precio 
            ? `${inmueble.precio.toLocaleString('es-ES')} €/mes` 
            : 'No especificado';
        document.getElementById('detailMetros').textContent = inmueble.metros 
            ? `${inmueble.metros} m²` 
            : 'No especificado';
        document.getElementById('detailHabitaciones').textContent = inmueble.habitaciones 
            ? `${inmueble.habitaciones} habitaciones` 
            : 'No especificado';
        document.getElementById('detailDescripcion').textContent = inmueble.descripcion || 'Sin descripción';

        this.mostrarDocumentos();
    }

    // Guardar inmueble
    async guardarInmueble(e) {
        e.preventDefault();
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }

        const formData = new FormData(e.target);
        const id = document.getElementById('inmuebleId').value;
        const inmueble = {
            id: id || Date.now().toString(),
            direccion: document.getElementById('direccion').value,
            tipo: document.getElementById('tipo').value,
            precio: parseFloat(document.getElementById('precio').value) || null,
            metros: parseFloat(document.getElementById('metros').value) || null,
            habitaciones: parseInt(document.getElementById('habitaciones').value) || null,
            descripcion: document.getElementById('descripcion').value,
            documentos: id ? this.inmuebles.find(i => i.id === id)?.documentos || [] : []
        };

        if (id) {
            const index = this.inmuebles.findIndex(i => i.id === id);
            if (index !== -1) {
                this.inmuebles[index] = inmueble;
            }
        } else {
            this.inmuebles.push(inmueble);
        }

        await this.guardarInmuebles();
        this.mostrarLista();
    }

    // Editar inmueble
    editarInmueble() {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (this.inmuebleActual) {
            this.mostrarFormulario(this.inmuebleActual);
        }
    }

    // Eliminar inmueble
    eliminarInmueble() {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (!this.inmuebleActual) return;

        if (confirm('¿Estás seguro de que deseas eliminar este inmueble? Esta acción no se puede deshacer.')) {
            this.inmuebles = this.inmuebles.filter(i => i.id !== this.inmuebleActual.id);
            this.guardarInmuebles();
            this.mostrarLista();
        }
    }

    // Mostrar inmuebles en la grilla
    mostrarInmuebles(inmueblesFiltrados = null) {
        const grid = document.getElementById('inmueblesGrid');
        const emptyState = document.getElementById('emptyState');
        const inmuebles = inmueblesFiltrados || this.inmuebles;

        grid.innerHTML = '';

        if (inmuebles.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        inmuebles.forEach(inmueble => {
            const card = this.crearCardInmueble(inmueble);
            grid.appendChild(card);
        });
    }

    // Crear card de inmueble
    crearCardInmueble(inmueble) {
        const card = document.createElement('div');
        card.className = 'inmueble-card';
        card.addEventListener('click', () => this.mostrarDetalle(inmueble));

        const numDocumentos = inmueble.documentos ? inmueble.documentos.length : 0;

        card.innerHTML = `
            <div class="inmueble-card-header">
                <div>
                    <h3>${inmueble.direccion}</h3>
                    <span class="inmueble-card-type">${this.formatearTipo(inmueble.tipo)}</span>
                </div>
            </div>
            <div class="inmueble-card-info">
                <div>
                    <div class="info-label">Precio</div>
                    <div class="info-value">${inmueble.precio ? inmueble.precio.toLocaleString('es-ES') + ' €' : 'N/A'}</div>
                </div>
                <div>
                    <div class="info-label">Metros</div>
                    <div class="info-value">${inmueble.metros ? inmueble.metros + ' m²' : 'N/A'}</div>
                </div>
                <div>
                    <div class="info-label">Habitaciones</div>
                    <div class="info-value">${inmueble.habitaciones || 'N/A'}</div>
                </div>
                <div>
                    <div class="info-label">Documentos</div>
                    <div class="info-value"><i class="fas fa-folder"></i> ${numDocumentos}</div>
                </div>
            </div>
        `;

        return card;
    }

    // Formatear tipo de inmueble
    formatearTipo(tipo) {
        const tipos = {
            'casa': 'Casa',
            'apartamento': 'Apartamento',
            'local': 'Local Comercial',
            'oficina': 'Oficina',
            'terreno': 'Terreno',
            'otro': 'Otro'
        };
        return tipos[tipo] || tipo;
    }

    // Buscar inmuebles
    buscarInmuebles(termino) {
        if (!termino.trim()) {
            this.mostrarInmuebles();
            return;
        }

        const filtrados = this.inmuebles.filter(inmueble => {
            const busqueda = termino.toLowerCase();
            return inmueble.direccion.toLowerCase().includes(busqueda) ||
                   inmueble.tipo.toLowerCase().includes(busqueda) ||
                   (inmueble.descripcion && inmueble.descripcion.toLowerCase().includes(busqueda));
        });

        this.mostrarInmuebles(filtrados);
    }

    // Mostrar documentos
    mostrarDocumentos() {
        const lista = document.getElementById('documentsList');
        lista.innerHTML = '';

        if (!this.inmuebleActual) {
            return;
        }

        // Obtener documentos existentes agrupados por tipo
        const documentosPorTipo = {};
        if (this.inmuebleActual.documentos) {
            this.inmuebleActual.documentos.forEach((doc, index) => {
                if (!documentosPorTipo[doc.tipo]) {
                    documentosPorTipo[doc.tipo] = [];
                }
                documentosPorTipo[doc.tipo].push({ doc, index });
            });
        }

        // Mostrar todos los tipos de documentos requeridos
        this.tiposDocumentos.forEach(tipo => {
            const documentos = documentosPorTipo[tipo] || [];
            const item = this.crearItemDocumentoRequerido(tipo, documentos);
            lista.appendChild(item);
        });
    }

    // Crear item de documento requerido
    crearItemDocumentoRequerido(tipo, documentos) {
        const item = document.createElement('div');
        item.className = 'document-item-required';
        
        const tieneDocumentos = documentos.length > 0;
        const nombreTipo = this.formatearTipoDocumento(tipo);
        const cantidadDocumentos = documentos.length;
        
        if (tieneDocumentos) {
            item.classList.add('document-present');
            // Ordenar documentos por fecha (más reciente primero) para mostrar el último
            const documentosOrdenados = [...documentos].sort((a, b) => {
                const fechaA = a.doc.fecha ? new Date(a.doc.fecha).getTime() : 0;
                const fechaB = b.doc.fecha ? new Date(b.doc.fecha).getTime() : 0;
                return fechaB - fechaA;
            });
            const primerDoc = documentosOrdenados[0].doc;
            const fechaFormateada = primerDoc.fecha ? new Date(primerDoc.fecha).toLocaleDateString('es-ES') : 'Sin fecha';

            item.innerHTML = `
                <div class="document-status">
                    <i class="fas fa-check-circle status-icon status-present"></i>
                </div>
                <div class="document-info">
                    <div class="document-name">
                        <span class="document-type-badge">${nombreTipo}</span>
                        <span class="document-count">${cantidadDocumentos} ${cantidadDocumentos === 1 ? 'documento' : 'documentos'}</span>
                    </div>
                    <div class="document-meta">
                        <span><i class="fas fa-calendar"></i> Último: ${fechaFormateada}</span>
                        ${primerDoc.archivoNombre ? `<span><i class="fas fa-file"></i> Con archivos</span>` : ''}
                    </div>
                </div>
                <div class="document-actions">
                    <button class="btn btn-primary btn-sm" onclick="gestor.verDocumentosPorTipo('${tipo}')" title="Ver documentos">
                        <i class="fas fa-folder-open"></i> Ver (${cantidadDocumentos})
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="gestor.agregarDocumentoPorTipo('${tipo}')" title="Agregar">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            `;
        } else {
            item.classList.add('document-missing');
            item.innerHTML = `
                <div class="document-status">
                    <i class="fas fa-exclamation-circle status-icon status-missing"></i>
                </div>
                <div class="document-info">
                    <div class="document-name">
                        <span class="document-type-badge document-missing-badge">${nombreTipo}</span>
                        <span class="missing-label">Documento faltante</span>
                    </div>
                    <div class="document-meta">
                        <span class="missing-message">Este documento aún no ha sido agregado</span>
                    </div>
                </div>
                <div class="document-actions">
                    <button class="btn btn-primary btn-sm" onclick="gestor.agregarDocumentoPorTipo('${tipo}')" title="Agregar">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            `;
        }

        return item;
    }

    // Formatear tipo de documento
    formatearTipoDocumento(tipo) {
        const tipos = {
            'informes': 'Informes',
            'oficios-recibidos': 'Oficios recibidos',
            'oficios-expedidos': 'Oficios expedidos',
            'actas': 'Actas',
            'notas-de-servicio': 'Notas de servicio',
            'documentacion-de-respaldo': 'Documentación de respaldo',
            'testimonio': 'Testimonio',
            'ubicacion': 'Ubicación',
            'folio-real': 'Folio Real',
            'catastro': 'Catastro',
            'impuestos': 'Impuestos',
            'planos': 'Planos',
            'coordenadas': 'Coordenadas',
            'contratos': 'Contratos',
            'convenios': 'Convenios',
            'procesos': 'Procesos',
            'servicios': 'Servicios',
            'formulario-de-asignacion': 'Formulario de asignación',
            'fotograma': 'Fotograma'
        };
        return tipos[tipo] || tipo;
    }

    // Mostrar modal de documento
    mostrarModalDocumento(tipo, documento = null) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        const modal = document.getElementById('documentModal');
        const form = document.getElementById('documentForm');
        const modalTitle = document.getElementById('modalTitle');

        if (documento) {
            modalTitle.textContent = `Editar ${this.formatearTipoDocumento(tipo)}`;
            document.getElementById('documentId').value = documento.id || '';
            document.getElementById('documentTipo').value = tipo;
            document.getElementById('documentNombre').value = documento.nombre;
            document.getElementById('documentFecha').value = documento.fecha || '';
            document.getElementById('documentNotas').value = documento.notas || '';
        } else {
            modalTitle.textContent = `Agregar ${this.formatearTipoDocumento(tipo)}`;
            form.reset();
            document.getElementById('documentId').value = '';
            document.getElementById('documentTipo').value = tipo;
        }

        modal.classList.remove('hidden');
    }

    // Agregar documento por tipo
    agregarDocumentoPorTipo(tipo) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        this.mostrarModalDocumento(tipo);
    }

    // Ver documentos por tipo
    verDocumentosPorTipo(tipo) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (!this.inmuebleActual || !this.inmuebleActual.documentos) return;
        
        const documentos = this.inmuebleActual.documentos.filter(d => d.tipo === tipo);
        this.mostrarModalListaDocumentos(tipo, documentos);
    }

    // Mostrar modal con lista de documentos
    mostrarModalListaDocumentos(tipo, documentos) {
        const modal = document.getElementById('listaDocumentosModal');
        const modalTitle = document.getElementById('listaModalTitle');
        const listaContainer = document.getElementById('listaDocumentosContainer');
        
        const nombreTipo = this.formatearTipoDocumento(tipo);
        modalTitle.textContent = `${nombreTipo} (${documentos.length} ${documentos.length === 1 ? 'documento' : 'documentos'})`;
        
        listaContainer.innerHTML = '';
        
        if (documentos.length === 0) {
            listaContainer.innerHTML = '<p class="empty-message">No hay documentos de este tipo</p>';
        } else {
            // Ordenar documentos por fecha (más reciente primero)
            const documentosOrdenados = [...documentos].sort((a, b) => {
                const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
                const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
                return fechaB - fechaA;
            });
            
            documentosOrdenados.forEach((doc, index) => {
                const item = this.crearItemDocumentoLista(doc, tipo, index);
                listaContainer.appendChild(item);
            });
        }
        
        modal.classList.remove('hidden');
    }

    // Crear item de documento en la lista
    crearItemDocumentoLista(doc, tipo, index) {
        const item = document.createElement('div');
        item.className = 'document-list-item';
        
        const fechaFormateada = doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-ES') : 'Sin fecha';
        const tamañoFormateado = doc.archivoTamaño ? this.formatearTamaño(doc.archivoTamaño) : '';
        
        item.innerHTML = `
            <div class="document-list-info">
                <div class="document-list-name">
                    <strong>${doc.nombre}</strong>
                </div>
                <div class="document-list-meta">
                    <span><i class="fas fa-calendar"></i> ${fechaFormateada}</span>
                    ${doc.archivoNombre ? `<span><i class="fas fa-file"></i> ${doc.archivoNombre} ${tamañoFormateado ? `(${tamañoFormateado})` : ''}</span>` : '<span><i class="fas fa-file"></i> Sin archivo</span>'}
                    ${doc.notas ? `<span><i class="fas fa-sticky-note"></i> Con notas</span>` : ''}
                </div>
                ${doc.notas ? `<div class="document-list-notes"><i class="fas fa-comment"></i> ${doc.notas}</div>` : ''}
            </div>
            <div class="document-list-actions">
                ${doc.archivoNombre ? `
                    <button class="btn btn-primary btn-sm" onclick="gestor.abrirDocumento('${doc.id}')" title="Abrir archivo">
                        <i class="fas fa-external-link-alt"></i> Abrir
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="gestor.descargarDocumento('${doc.id}', '${doc.archivoNombre}')" title="Descargar archivo">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                ` : ''}
                <button class="btn-icon" onclick="gestor.editarDocumentoPorId('${doc.id}', '${tipo}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="gestor.eliminarDocumentoPorId('${doc.id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return item;
    }

    // Formatear tamaño de archivo
    formatearTamaño(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Descargar documento
    async descargarDocumento(id, nombreArchivo) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (!this.inmuebleActual || !this.inmuebleActual.documentos) return;
        
        const documento = this.inmuebleActual.documentos.find(d => d.id === id);
        if (documento && documento.archivoNombre) {
            try {
                // Intentar descargar desde Firebase Storage si hay URL
                if (documento.archivoUrl && this.firebaseManager) {
                    await this.firebaseManager.descargarArchivo(id, nombreArchivo, documento.archivoUrl);
                } else {
                    // Fallback a IndexedDB
                    await this.dbManager.descargarArchivo(id, nombreArchivo);
                }
            } catch (error) {
                console.error('Error al descargar archivo:', error);
                alert(`No se pudo descargar el archivo: ${nombreArchivo}\n\nEl archivo puede no estar disponible.`);
            }
        } else {
            alert('Este documento no tiene archivo adjunto.');
        }
    }

    // Editar documento por ID
    editarDocumentoPorId(id, tipo) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (!this.inmuebleActual || !this.inmuebleActual.documentos) return;
        
        const documento = this.inmuebleActual.documentos.find(d => d.id === id);
        if (documento) {
            this.cerrarModalLista();
            this.mostrarModalDocumento(tipo, documento);
        }
    }

    // Eliminar documento por ID
    async eliminarDocumentoPorId(id) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (!this.inmuebleActual || !this.inmuebleActual.documentos) return;

        if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
            const documento = this.inmuebleActual.documentos.find(d => d.id === id);
            if (documento) {
                // Eliminar archivo de Firebase Storage o IndexedDB
                if (documento.archivoNombre) {
                    try {
                        if (documento.archivoRuta && this.firebaseManager) {
                            // Eliminar de Firebase Storage
                            await this.firebaseManager.eliminarArchivo(documento.archivoRuta);
                        } else {
                            // Eliminar de IndexedDB
                            await this.dbManager.eliminarArchivo(id);
                        }
                    } catch (error) {
                        console.error('Error al eliminar archivo:', error);
                    }
                }

                this.inmuebleActual.documentos = this.inmuebleActual.documentos.filter(d => d.id !== id);
                
                const inmuebleIndex = this.inmuebles.findIndex(i => i.id === this.inmuebleActual.id);
                if (inmuebleIndex !== -1) {
                    this.inmuebles[inmuebleIndex] = this.inmuebleActual;
                }

                await this.guardarInmuebles();
                this.mostrarDocumentos();
                
                // Si el modal de lista está abierto, actualizarlo
                const modal = document.getElementById('listaDocumentosModal');
                if (!modal.classList.contains('hidden')) {
                    const tipo = documento.tipo;
                    const documentos = this.inmuebleActual.documentos.filter(d => d.tipo === tipo);
                    this.mostrarModalListaDocumentos(tipo, documentos);
                }
            }
        }
    }

    // Abrir documento
    async abrirDocumento(id) {
        if (!this.usuarioActual) {
            this.mostrarLogin();
            return;
        }
        if (!this.inmuebleActual || !this.inmuebleActual.documentos) return;
        
        const documento = this.inmuebleActual.documentos.find(d => d.id === id);
        if (documento && documento.archivoNombre) {
            try {
                // Intentar abrir desde Firebase Storage si hay URL
                if (documento.archivoUrl && this.firebaseManager) {
                    await this.firebaseManager.abrirArchivo(id, documento.archivoUrl);
                } else {
                    // Fallback a IndexedDB
                    await this.dbManager.abrirArchivo(id);
                }
            } catch (error) {
                console.error('Error al abrir archivo:', error);
                alert(`No se pudo abrir el archivo: ${documento.archivoNombre}\n\nEl archivo puede no estar disponible.`);
            }
        } else {
            alert('Este documento no tiene archivo adjunto.');
        }
    }

    // Cerrar modal de lista
    cerrarModalLista() {
        document.getElementById('listaDocumentosModal').classList.add('hidden');
    }

    // Cerrar modal
    cerrarModal() {
        document.getElementById('documentModal').classList.add('hidden');
        document.getElementById('documentForm').reset();
    }

    // Guardar documento
    async guardarDocumento(e) {
        e.preventDefault();

        if (!this.inmuebleActual) return;

        const id = document.getElementById('documentId').value;
        const fileInput = document.getElementById('documentArchivo');
        const archivo = fileInput.files[0];

        const tipo = document.getElementById('documentTipo').value;
        const documentoId = id || Date.now().toString();
        
        // Manejar archivos
        const docAnterior = id ? this.inmuebleActual.documentos?.find(d => d.id === id) : null;
        const archivoAnterior = docAnterior?.archivoNombre;
        
        if (archivo) {
            // Hay un archivo nuevo para guardar
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Guardando archivo...';
            
            try {
                // Si es edición y había un archivo anterior diferente, eliminarlo primero
                if (id && archivoAnterior && archivoAnterior !== archivo.name) {
                    try {
                        const docAnterior = this.inmuebleActual.documentos?.find(d => d.id === id);
                        if (docAnterior?.archivoRuta && this.firebaseManager) {
                            await this.firebaseManager.eliminarArchivo(docAnterior.archivoRuta);
                        } else {
                            await this.dbManager.eliminarArchivo(id);
                        }
                    } catch (error) {
                        console.error('Error al eliminar archivo anterior:', error);
                    }
                }
                
                // Guardar archivo en Firebase Storage o IndexedDB
                if (this.firebaseManager && this.usuarioActual) {
                    archivoData = await this.firebaseManager.guardarArchivo(documentoId, archivo, this.inmuebleActual.id);
                } else {
                    archivoData = await this.dbManager.guardarArchivo(documentoId, archivo);
                }
            } catch (error) {
                console.error('Error al guardar archivo:', error);
                alert('Error al guardar el archivo. El documento se guardará sin el archivo adjunto.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        } else if (id && archivoAnterior && !document.getElementById('documentArchivo').files[0]) {
            // Si se está editando y se eliminó el archivo (no hay archivo nuevo y había uno anterior)
            // Mantener el archivo anterior si no se sube uno nuevo
            const docAnterior = this.inmuebleActual.documentos?.find(d => d.id === id);
            if (docAnterior && docAnterior.archivoUrl) {
                archivoData = { url: docAnterior.archivoUrl, ruta: docAnterior.archivoRuta };
            }
        }

        const documento = {
            id: documentoId,
            tipo: tipo,
            nombre: document.getElementById('documentNombre').value,
            fecha: document.getElementById('documentFecha').value || null,
            notas: document.getElementById('documentNotas').value || null,
            archivoNombre: archivo ? archivo.name : (this.inmuebleActual.documentos?.find(d => d.id === id)?.archivoNombre || null),
            archivoTipo: archivo ? archivo.type : (this.inmuebleActual.documentos?.find(d => d.id === id)?.archivoTipo || null),
            archivoTamaño: archivo ? archivo.size : (this.inmuebleActual.documentos?.find(d => d.id === id)?.archivoTamaño || null),
            archivoUrl: archivoData?.url || (this.inmuebleActual.documentos?.find(d => d.id === id)?.archivoUrl || null),
            archivoRuta: archivoData?.ruta || (this.inmuebleActual.documentos?.find(d => d.id === id)?.archivoRuta || null)
        };

        if (!this.inmuebleActual.documentos) {
            this.inmuebleActual.documentos = [];
        }

        if (id) {
            // Editar documento existente
            const index = this.inmuebleActual.documentos.findIndex(d => d.id === id);
            if (index !== -1) {
                this.inmuebleActual.documentos[index] = documento;
            }
        } else {
            // Agregar nuevo documento (permitir múltiples del mismo tipo)
            this.inmuebleActual.documentos.push(documento);
        }

        // Actualizar inmueble en la lista
        const index = this.inmuebles.findIndex(i => i.id === this.inmuebleActual.id);
        if (index !== -1) {
            this.inmuebles[index] = this.inmuebleActual;
        }

        await this.guardarInmuebles();
        this.mostrarDocumentos();
        this.cerrarModal();
    }

}

// Inicializar aplicación
const gestor = new GestorInmuebles();
