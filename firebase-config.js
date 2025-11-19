// Configuración de Firebase
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Firebase
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Ve a Configuración del proyecto > Tus apps > Web
// 4. Copia los valores de configuración aquí

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const db = firebase.firestore();
const storage = firebase.storage();

