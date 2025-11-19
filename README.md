# Gestor de Inmuebles

Aplicación web moderna para gestionar inmuebles y sus documentos asociados.

## Características

- ✅ Gestión completa de inmuebles (crear, editar, eliminar)
- ✅ Sistema de documentos por inmueble
- ✅ Búsqueda de inmuebles
- ✅ Interfaz moderna y responsive
- ✅ Almacenamiento local (localStorage)
- ✅ Tipos de documentos predefinidos:
  - Informes
  - Oficios recibidos
  - Oficios expedidos
  - Actas
  - Notas de servicio
  - Documentación de respaldo
  - Testimonio
  - Ubicación
  - Folio Real
  - Catastro
  - Impuestos
  - Planos
  - Coordenadas
  - Contratos
  - Convenios
  - Procesos
  - Servicios
  - Formulario de asignación
  - Fotograma

## Uso

1. Abre el archivo `index.html` en tu navegador web
2. Haz clic en "Nuevo Inmueble" para agregar un inmueble
3. Completa el formulario con la información del inmueble
4. Para agregar documentos, abre el detalle del inmueble y haz clic en "Agregar Documento"
5. Usa la barra de búsqueda para encontrar inmuebles rápidamente

## Estructura de Archivos

```
gest/
├── index.html      # Estructura HTML principal
├── styles.css      # Estilos y diseño
├── database.js     # Gestión de base de datos IndexedDB
├── app.js          # Lógica de la aplicación
└── README.md       # Este archivo
```

## Tecnologías

- HTML5
- CSS3 (con variables CSS y Grid/Flexbox)
- JavaScript (ES6+)
- Font Awesome (iconos)
- LocalStorage (almacenamiento de datos de inmuebles)
- IndexedDB (almacenamiento de archivos adjuntos)

## Notas

- Los datos de inmuebles se guardan en el navegador usando localStorage
- Los archivos adjuntos se almacenan físicamente en IndexedDB
- La aplicación es completamente funcional sin necesidad de servidor
- Los archivos se almacenan localmente en el dispositivo del usuario
- Formatos de archivo soportados: PDF, DOC, DOCX, JPG, JPEG, PNG
