// firebase.js
// Inicialización y gestión de Firebase (Auth, Firestore, Functions)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

// Importa referencias del DOM (definidas en dom.js)
import {
  userMenuButton,
  userMenuDropdown,
  logoutButton,
  userDisplayName,
  userEmail,
  userAvatar
} from './dom.js';

// Configuración de Firebase (cópiala de tu proyecto)
const firebaseConfig = {
  apiKey: "AIzaSyAKnJXo7QLcU7jxkhar_-WeLJNHtxXG9Bk",
  authDomain: "kluppy-duelos.firebaseapp.com",
  projectId: "kluppy-duelos",
  storageBucket: "kluppy-duelos.firebasestorage.app",
  messagingSenderId: "221783859909",
  appId: "1:221783859909:web:504d021f4e50a11c8486ac",
  measurementId: "G-0839SL8VP6"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

// Lógica del menú de usuario
userMenuButton.addEventListener('click', () => userMenuDropdown.classList.toggle('hidden'));
document.addEventListener('click', (e) => {
  if (!userMenuButton.contains(e.target) && !userMenuDropdown.contains(e.target)) {
    userMenuDropdown.classList.add('hidden');
  }
});
logoutButton.addEventListener('click', () => signOut(auth));

// Observador de estado de autenticación
onAuthStateChanged(auth, (user) => {
  if (user) {
    userDisplayName.textContent = user.displayName || 'Usuario';
    userEmail.textContent = user.email;
    if (user.photoURL) userAvatar.src = user.photoURL;
  } else {
    // Redirige al login si falla autenticación
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    window.location.href = `${basePath}index.html`;
  }
});
