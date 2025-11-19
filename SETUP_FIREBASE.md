# Configuración de Firebase para Sincronización

Este proyecto ahora soporta sincronización en la nube usando Firebase. Sigue estos pasos para configurarlo:

## Paso 1: Crear un Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto" o selecciona un proyecto existente
3. Sigue los pasos para crear el proyecto

## Paso 2: Habilitar Firestore Database

1. En el panel de Firebase, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Iniciar en modo de prueba" (puedes cambiar las reglas después)
4. Elige una ubicación para tu base de datos (elige la más cercana a tus usuarios)

## Paso 3: Habilitar Firebase Storage

1. En el panel de Firebase, ve a "Storage"
2. Haz clic en "Empezar"
3. Acepta las reglas de seguridad por defecto (puedes cambiarlas después)

## Paso 4: Obtener las Credenciales

1. En el panel de Firebase, ve a "Configuración del proyecto" (ícono de engranaje)
2. Desplázate hacia abajo hasta "Tus apps"
3. Haz clic en el ícono de web (`</>`)
4. Registra tu app con un nombre (ej: "Gestor de Inmuebles")
5. Copia la configuración que aparece

## Paso 5: Configurar el Proyecto

1. Abre el archivo `firebase-config.js`
2. Reemplaza los valores con los de tu proyecto Firebase:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

## Paso 6: Configurar Reglas de Seguridad

### Reglas de Firestore

Ve a Firestore Database > Reglas y usa estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso solo a usuarios autenticados a sus propios datos
    match /usuarios/{userId}/inmuebles/{inmuebleId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /documentos/{documentoId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

**Nota:** Como estamos usando autenticación personalizada (localStorage), necesitas cambiar las reglas para permitir acceso basado en el userId del documento:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso basado en el userId en la ruta
    match /usuarios/{userId}/inmuebles/{inmuebleId} {
      allow read, write: if true; // Temporalmente permitir todo (cambiar en producción)
      
      match /documentos/{documentoId} {
        allow read, write: if true; // Temporalmente permitir todo
      }
    }
  }
}
```

**⚠️ IMPORTANTE:** Las reglas anteriores permiten acceso público. Para producción, deberías implementar autenticación de Firebase o un sistema de validación más seguro.

### Reglas de Storage

Ve a Storage > Reglas y usa estas reglas:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /usuarios/{userId}/{allPaths=**} {
      allow read, write: if true; // Temporalmente permitir todo
    }
  }
}
```

**⚠️ IMPORTANTE:** Igual que con Firestore, estas reglas son temporales. Para producción, implementa autenticación adecuada.

## Paso 7: Probar la Sincronización

1. Abre la aplicación en tu navegador
2. Inicia sesión con tu cuenta
3. Crea un inmueble o sube un documento
4. Abre la aplicación en otro dispositivo o navegador
5. Inicia sesión con la misma cuenta
6. Deberías ver los datos sincronizados

## Funcionalidades

- ✅ **Sincronización automática**: Los datos se sincronizan automáticamente cuando inicias sesión
- ✅ **Almacenamiento en la nube**: Los inmuebles y documentos se guardan en Firebase
- ✅ **Archivos en Storage**: Los archivos adjuntos se guardan en Firebase Storage
- ✅ **Fallback local**: Si Firebase no está disponible, usa localStorage/IndexedDB
- ✅ **Multi-dispositivo**: Accede a tus datos desde cualquier dispositivo

## Solución de Problemas

### Los datos no se sincronizan

1. Verifica que `firebase-config.js` tenga las credenciales correctas
2. Revisa la consola del navegador para errores
3. Verifica que las reglas de Firestore y Storage permitan acceso

### Error al subir archivos

1. Verifica que Firebase Storage esté habilitado
2. Revisa las reglas de Storage
3. Verifica el tamaño del archivo (Firebase Storage tiene límites)

### La aplicación no carga

1. Verifica que los scripts de Firebase estén cargando correctamente
2. Revisa la consola del navegador
3. Asegúrate de que `firebase-config.js` esté antes de `firebase-manager.js`

## Notas Importantes

- Los datos se sincronizan por usuario (cada usuario ve solo sus propios datos)
- Los datos locales se mantienen como backup
- Si Firebase no está configurado, la app funciona normalmente con almacenamiento local
- Para producción, implementa autenticación de Firebase para mayor seguridad

