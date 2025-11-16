// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyDjK1vczHIs-jUA_aV_26jOBIcG5auOt-s",
  authDomain: "labwebav-websocketchat-61e1d.firebaseapp.com",
  projectId: "labwebav-websocketchat-61e1d",
  storageBucket: "labwebav-websocketchat-61e1d.firebasestorage.app",
  messagingSenderId: "591366542920",
  appId: "1:591366542920:web:341e61952ca1ca20006a7d"
};
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const auth = firebase.auth();
const db = firebase.firestore();

console.log('✅ Firebase inicializado correctamente');