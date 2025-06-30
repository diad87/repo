// =================================================================
// VERSIÓN FINAL Y COMPLETA - CORRIGE ERRORES DE RENDERIZADO Y TEMA
// =================================================================

// SECCIÓN 1: INICIALIZACIÓN DE FIREBASE Y LÓGICA DE USUARIO
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyAKnJXo7QLcU7jxkhar_-WeLJNHtxXG9Bk",
    authDomain: "kluppy-duelos.firebaseapp.com",
    projectId: "kluppy-duelos",
    storageBucket: "kluppy-duelos.appspot.com",
    messagingSenderId: "221783859909",
    appId: "1:221783859909:web:504d021f4e50a11c8486ac",
    measurementId: "G-0839SL8VP6"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Lógica del menú de usuario
const userMenuButton = document.getElementById('user-menu-button');
const userMenuDropdown = document.getElementById('user-menu-dropdown');
userMenuButton.addEventListener('click', () => userMenuDropdown.classList.toggle('hidden'));
document.addEventListener('click', (e) => {
    if (!userMenuButton.contains(e.target) && !userMenuDropdown.contains(e.target)) {
        userMenuDropdown.classList.add('hidden');
    }
});
document.getElementById('logout-button').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('user-display-name').textContent = user.displayName || 'Usuario';
        document.getElementById('user-email').textContent = user.email;
        if (user.photoURL) document.getElementById('user-avatar').src = user.photoURL;
    } else {
        const currentUrl = window.location.href;
        const newPath = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1) + 'index.html';
        window.location.href = newPath;
    }
});

// =================================================================
// SECCIÓN 2: REFERENCIAS AL DOM, ESTADO Y CONFIGURACIÓN
// =================================================================

// --- Referencias al DOM ---
const textoMuestraElement = document.getElementById('texto-muestra');
const sampleContainer = document.getElementById('sample-container');
const entradaUsuario = document.getElementById('entrada-usuario');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultsModal = document.getElementById('results-modal');
const closeModal = document.getElementById('close-modal');
const starRating = document.getElementById('star-rating');
const keyboardDiv = document.getElementById('keyboard');
const modalTiempo = document.getElementById('modal-tiempo');
const modalNetPPM = document.getElementById('modal-netPPM');
const modalPrecision = document.getElementById('modal-precision');
const modalErrors = document.getElementById('modal-errors');
const repeatButton = document.getElementById('repeat-button');
const liveStatsContainer = document.getElementById('live-stats-container');
const exerciseLengthElement = document.getElementById('exercise-length');
const livePpmElement = document.getElementById('live-ppm');
const liveAccuracyElement = document.getElementById('live-accuracy');
const liveCorrectionsElement = document.getElementById('live-corrections');
const liveTopErrorsElement = document.getElementById('live-top-errors');
const adaptiveInfoContainer = document.getElementById('adaptive-info');
const windowAccuracyElement = document.getElementById('window-accuracy');
const targetAccuracyElement = document.getElementById('target-accuracy');
const musicToggleButton = document.getElementById('music-toggle-button');
const themeToggle = document.getElementById('theme-toggle');
const interventionModal = document.getElementById('intervention-modal');
const gracefulExitModal = document.getElementById('graceful-exit-modal');
const exitContinueBtn = document.getElementById('exit-continue-btn');
const exitPostponeBtn = document.getElementById('exit-postpone-btn');
const loadingSpinner = document.getElementById('loading-spinner');



// --- Carga de Sonidos ---
const audioTecleo = new Audio('sounds/tecleo.mp3'); audioTecleo.volume = 0.5;
const audioError = new Audio('sounds/error.mp3'); audioError.volume = 0.4;
const audioBorrado = new Audio('sounds/borrado.mp3'); audioBorrado.volume = 0.3;
const audioEstrella = new Audio('sounds/estrella.mp3'); audioEstrella.volume = 0.6;
const backgroundMusic = new Audio('sounds/background-music.mp3'); backgroundMusic.loop = true; backgroundMusic.volume = 0.2;

// --- ESTADO CENTRALIZADO DE LA APLICACIÓN ---
let estadoModulo = {
    cursoId: null,
    moduloId: null,
    listaEjercicios: [],
    indiceEjercicioActual: 0,
};
let estadoEjercicio = {};
let liveStatsIntervalId = null;
let lastHandUsed = 'right';
let isWaitingForVowel = false;
let isMusicPlaying = false;

// --- Configuración del Teclado ---
const keyLayout = [
    [{key:"º",size:1,group:6,finger:"pinky-left"}, {key:"1",size:1,group:6,finger:"pinky-left"}, {key:"2",size:1,group:4,finger:"ring-left"}, {key:"3",size:1,group:3,finger:"middle-left"}, {key:"4",size:1,group:1,finger:"index-left"}, {key:"5",size:1,group:1,finger:"index-left"}, {key:"6",size:1,group:2,finger:"index-right"}, {key:"7",size:1,group:2,finger:"index-right"}, {key:"8",size:1,group:3,finger:"middle-right"}, {key:"9",size:1,group:4,finger:"ring-right"}, {key:"0",size:1,group:6,finger:"pinky-right"}, {key:"'",size:1,group:6,finger:"pinky-right"}, {key:"¡",size:1,group:6,finger:"pinky-right"}, {key:"Backspace",label:"←",size:2,group:6,finger:"pinky-right"}],
    [{key:"Tab",size:1.5,group:6,finger:"pinky-left"}, {key:"Q",size:1,group:6,finger:"pinky-left"}, {key:"W",size:1,group:4,finger:"ring-left"}, {key:"E",size:1,group:3,finger:"middle-left"}, {key:"R",size:1,group:1,finger:"index-left"}, {key:"T",size:1,group:1,finger:"index-left"}, {key:"Y",size:1,group:2,finger:"index-right"}, {key:"U",size:1,group:2,finger:"index-right"}, {key:"I",size:1,group:3,finger:"middle-right"}, {key:"O",size:1,group:4,finger:"ring-right"}, {key:"P",size:1,group:6,finger:"pinky-right"}, {key:"`",size:1,group:6,finger:"pinky-right"}, {key:"+",size:1,group:6,finger:"pinky-right"}, {key:"\\",size:1.5,label:"",disabled:true,group:6}],
    [{key:"CapsLock",label:"Bloq Mayús",size:1.75,group:6,finger:"pinky-left"}, {key:"A",size:1,group:6,finger:"pinky-left"}, {key:"S",size:1,group:4,finger:"ring-left"}, {key:"D",size:1,group:3,finger:"middle-left"}, {key:"F",size:1,group:1,finger:"index-left"}, {key:"G",size:1,group:1,finger:"index-left"}, {key:"H",size:1,group:2,finger:"index-right"}, {key:"J",size:1,group:2,finger:"index-right"}, {key:"K",size:1,group:3,finger:"middle-right"}, {key:"L",size:1,group:4,finger:"ring-right"}, {key:"Ñ",size:1,group:6,finger:"pinky-right"}, {key:"´",size:1,group:6,finger:"pinky-right"}, {key:"Ç",size:1,group:6,finger:"pinky-right"}, {key:"Enter",size:1.25,group:6,finger:"pinky-right"}],
    [{key:"ShiftLeft",label:"Shift",size:1.25,group:6,finger:"pinky-left"}, {key:"<",size:1,group:6,finger:"pinky-left"}, {key:"Z",size:1,group:6,finger:"ring-left"}, {key:"X",size:1,group:4,finger:"middle-left"}, {key:"C",size:1,group:3,finger:"index-left"}, {key:"V",size:1,group:1,finger:"index-left"}, {key:"B",size:1,group:1,finger:"index-right"}, {key:"N",size:1,group:2,finger:"index-right"}, {key:"M",size:1,group:2,finger:"middle-right"}, {key:",",size:1,group:3,finger:"ring-right"}, {key:".",size:1,group:4,finger:"pinky-right"}, {key:"-",size:1,group:6,finger:"pinky-right"}, {key:"ShiftRight",label:"Shift",size:2.75,group:6,finger:"pinky-right"}],
    [{key:"CtrlLeft",label:"Ctrl",size:1.25,group:6,finger:"pinky-left"}, {key:"Win",size:1.25,group:6}, {key:"AltLeft",label:"Alt",size:1.25,group:5,finger:"thumb-left"}, {key:"Space",label:"",size:6.25,group:5,finger:"thumb"}, {key:"AltRight",label:"AltGr",size:1.25,group:5,finger:"thumb-right"}, {key:"Menu",size:1.25,group:6}, {key:"CtrlRight",label:"Ctrl",size:1.25,group:6,finger:"pinky-right"}]
];
const diacriticMap = {
    'á': { base: 'a', deadKey: '´' }, 'é': { base: 'e', deadKey: '´' }, 'í': { base: 'i', deadKey: '´' }, 'ó': { base: 'o', deadKey: '´' }, 'ú': { base: 'u', deadKey: '´' }, 'ü': { base: 'u', deadKey: '¨' }
};

// =================================================================
// SECCIÓN 3: LÓGICA PRINCIPAL DEL MOTOR DE APRENDIZAJE
// =================================================================
function calcularDesviacionEstandar(arr) {
    if (arr.length < 2) return 0;
    const media = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    const desviacionCuadratica = arr.reduce((acc, val) => acc.concat((val - media) ** 2), []);
    const varianza = desviacionCuadratica.reduce((acc, val) => acc + val, 0) / arr.length;
    return Math.sqrt(varianza);
}

function resetearEstadoEjercicio() {
    if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
    liveStatsIntervalId = null;

    estadoEjercicio = {
        tipo: 'texto_fijo',
        criterios: {},
        textoMuestraCompleto: [],
        precisionExigida: 95,
        rachaDeErrores: 0,
        errores: [],
        correcciones: 0,
        mapaErrores: {},
        tiempoInicio: null,
        timerIniciado: false,
        isPaused: false,
        tiemposDePulsacion: [],
        haRecibidoPrimeraAdvertencia: false,
        advertenciaPrecisionMostrada: false,
        pulsacionesEnCooldown: 0,
    };
    livePpmElement.textContent = '0';
    liveAccuracyElement.textContent = '100';
    liveCorrectionsElement.textContent = '0';
    liveTopErrorsElement.textContent = '-';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
}

/**
 * Función que agrupa todas las comprobaciones de fatiga.
 * Devuelve true si se detecta fatiga, false en caso contrario.
 */
function detectarFatiga() {
    if (estadoEjercicio.pulsacionesEnCooldown > 0) return false;

    const crit = estadoEjercicio.criterios;

    // --- MÉTRICA 1: Racha de errores ---
    if (crit.fatiga_racha_errores && estadoEjercicio.rachaDeErrores > 0) {
        console.log(`🔥 Racha de Errores: ${estadoEjercicio.rachaDeErrores} / ${crit.fatiga_racha_errores}`);
        if (estadoEjercicio.rachaDeErrores >= crit.fatiga_racha_errores) {
            intervenirConPausa("Has cometido varios errores seguidos. ¡Tómate un respiro!");
            return true;
        }
    }

    // --- MÉTRICA 3: Ritmo inconsistente (IKI) ---
    const tiempos = estadoEjercicio.tiemposDePulsacion;
    if (tiempos.length > 10) {
        // 1. Calculamos los intervalos de las últimas 10 teclas UNA SOLA VEZ.
        const intervalosRecientes = [];
        for (let i = tiempos.length - 10; i < tiempos.length; i++) {
            intervalosRecientes.push(tiempos[i] - tiempos[i - 1]);
        }

        // 2. Calculamos la desviación actual del ritmo del usuario.
        const desviacionActual = calcularDesviacionEstandar(intervalosRecientes);

        const perfil = estadoEjercicio.perfilUsuario;
        let umbralDinamico;
        const UMBRAL_KEYSTROKES_CALIBRACION = estadoEjercicio.criterios.umbralKeystrokesCalibracion || 2000;

        if (perfil && perfil.totalKeystrokes > UMBRAL_KEYSTROKES_CALIBRACION) {
            // ---- Usuario Calibrado: Usamos su perfil personal ----
            console.log("INFO: Usando perfil personal calibrado.");
            const desviacionNormalUsuario = perfil.stdDevIKI;
            const factorTolerancia = estadoEjercicio.criterios.fatiga_factor_tolerancia_iki || 1.5;
            umbralDinamico = desviacionNormalUsuario * factorTolerancia;

        } else {
            // ---- Usuario Nuevo: Usamos un UMBRAL RELATIVO a su ritmo RECIENTE ----
            console.log("INFO: Usando umbral por defecto RELATIVO (usuario en calibración).");

            // Reutilizamos los intervalos recientes para calcular la media de ritmo actual
            const mediaRitmoReciente = intervalosRecientes.reduce((a, b) => a + b, 0) / intervalosRecientes.length;

            const factorToleranciaRelativo = 0.75; 
            umbralDinamico = mediaRitmoReciente * factorToleranciaRelativo;

            if (umbralDinamico < 150) {
                umbralDinamico = 150;
            }
        }

        console.log(`🥁 Ritmo (Desviación IKI): ${desviacionActual.toFixed(2)}ms / ${umbralDinamico.toFixed(2)}ms`);

        if (desviacionActual > umbralDinamico) {
            intervenirConPausa("Tu ritmo es irregular. Intenta mantener una cadencia constante.");
            estadoEjercicio.tiemposDePulsacion = []; 
            return true;
        }
    }
    
    return false;
}

async function cargarModulo() {
    const params = new URLSearchParams(window.location.search);
    estadoModulo.cursoId = params.get('curso');
    estadoModulo.moduloId = params.get('modulo');

    if (!estadoModulo.cursoId || !estadoModulo.moduloId) {
        textoMuestraElement.textContent = "Error: Módulo no especificado.";
        return;
    }

    // Mostramos el spinner y limpiamos el texto
    textoMuestraElement.innerHTML = '';
    loadingSpinner.classList.remove('hidden');

    try {
        const ejerciciosRef = collection(db, "cursos", estadoModulo.cursoId, "modulos", estadoModulo.moduloId, "ejercicios");
        const q = query(ejerciciosRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loadingSpinner.classList.add('hidden'); // Ocultamos spinner
            textoMuestraElement.textContent = "Este módulo no tiene ejercicios.";
            return;
        }

        estadoModulo.listaEjercicios = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        estadoModulo.indiceEjercicioActual = 0;

        // Llamamos a preparar el ejercicio, que se encargará de ocultar el spinner
        prepararEjercicioActual();

    } catch (error) {
        console.error("Error al cargar el módulo:", error);
        loadingSpinner.classList.add('hidden'); // Ocultamos spinner
        textoMuestraElement.textContent = "Error al cargar la lección.";
    }
}

async function leerTypingProfile() {
    const usuario = auth.currentUser;
    if (!usuario) {
        console.log("No hay usuario, no se puede leer el perfil.");
        return null;
    }

    try {
        const profileRef = doc(db, "users", usuario.uid, "stats", "typingProfile");
        const docSnap = await getDoc(profileRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Es un usuario nuevo o aún no ha completado ningún ejercicio
            return null;
        }
    } catch (error) {
        console.error("Error al leer el perfil de ritmo:", error);
        return null;
    }
}

async function prepararEjercicioActual() {
    resetearEstadoEjercicio();

    // Leemos el perfil del usuario al inicio del ejercicio
    const perfil = await leerTypingProfile();
    if (perfil) {
        console.log("👤 Perfil de ritmo personal cargado:", perfil);
        estadoEjercicio.perfilUsuario = perfil;
    } else {
        console.log("👤 No se encontró perfil de ritmo. Se usarán valores por defecto.");
        estadoEjercicio.perfilUsuario = {}; // Nos aseguramos de que el objeto exista
    }

    if (estadoModulo.indiceEjercicioActual >= estadoModulo.listaEjercicios.length) {
        textoMuestraElement.textContent = "¡Has completado el módulo! 🎉";
        entradaUsuario.disabled = true;
        adaptiveInfoContainer.classList.add('hidden');
        return;
    }

    const ejercicio = estadoModulo.listaEjercicios[estadoModulo.indiceEjercicioActual];
    estadoEjercicio.tipo = ejercicio.tipo;
    estadoEjercicio.criterios = ejercicio.criterio_ventana || {};

    if (ejercicio.tipo === 'patron_adaptativo') {
        const longitudGenerar = (ejercicio.criterio_ventana.longitudMaxima || 500) + 100;
        estadoEjercicio.textoMuestraCompleto = generarTextoDePatron(ejercicio.patron, longitudGenerar);
        estadoEjercicio.precisionExigida = estadoEjercicio.criterios.precisionObjetivo;

        adaptiveInfoContainer.classList.remove('hidden');
        targetAccuracyElement.textContent = `${estadoEjercicio.precisionExigida.toFixed(0)}%`;
        windowAccuracyElement.textContent = `--%`;
    } else {
        estadoEjercicio.textoMuestraCompleto = (ejercicio.texto || '').split('');
        adaptiveInfoContainer.classList.add('hidden');
    }

    exerciseLengthElement.textContent = estadoEjercicio.textoMuestraCompleto.length;
    loadingSpinner.classList.add('hidden');

    renderizarTextoEnUI();
}

function generarTextoDePatron(patron, longitud) {
    let texto = '';
    if (!patron) return [];
    while (texto.length < longitud) {
        texto += patron;
    }
    return texto.substring(0, longitud).split('');
}

function renderizarTextoEnUI() {
    textoMuestraElement.innerHTML = '';
    estadoEjercicio.textoMuestraCompleto.forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        textoMuestraElement.appendChild(span);
    });

    entradaUsuario.value = '';
    entradaUsuario.disabled = false;
    entradaUsuario.focus();
    updateHighlighting();
    requestAnimationFrame(updateSampleTextPosition);
}

function verificarProgresoEnVentana() {
    if (estadoEjercicio.pulsacionesEnCooldown > 0) return;

    const pos = entradaUsuario.value.length;
    const crit = estadoEjercicio.criterios;
    const umbralCritico = crit.fatiga_precision_critica;
    const umbralRecuperacion = umbralCritico ? umbralCritico + 5 : 80; // Umbral para "re-armar" la advertencia (75 + 5 = 80%)


    if (!crit.longitudVentana || pos < crit.longitudVentana) return;

    // --- MÉTRICA 2: Caída de Precisión en la Ventana ---
    const erroresEnVentana = estadoEjercicio.errores.filter(errorIndex => errorIndex >= (pos - crit.longitudVentana)).length;
    const precisionActualVentana = ((crit.longitudVentana - erroresEnVentana) / crit.longitudVentana) * 100;
    
    console.log(`🎯 Precisión Ventana: ${precisionActualVentana.toFixed(1)}% | Objetivo: ${estadoEjercicio.precisionExigida.toFixed(1)}%`);
    windowAccuracyElement.textContent = `${precisionActualVentana.toFixed(0)}%`;
    
    if (umbralCritico && precisionActualVentana < umbralCritico && !estadoEjercicio.advertenciaPrecisionMostrada) {
        // --- Condición 1: La precisión ha caído Y NO hemos avisado todavía ---
        intervenirConPausa(`Tu precisión ha bajado del ${umbralCritico}%. ¡Respira y concéntrate!`);
        // Activamos el flag para no volver a avisar inmediatamente
        estadoEjercicio.advertenciaPrecisionMostrada = true;
        console.log("⚠️ Advertencia por baja precisión activada. No se volverá a mostrar hasta la recuperación.");
        return; // Detenemos la ejecución para mostrar la pausa

    } else if (estadoEjercicio.advertenciaPrecisionMostrada && precisionActualVentana > umbralRecuperacion) {
        // --- Condición 2: El flag estaba activado PERO el usuario se ha recuperado ---
        estadoEjercicio.advertenciaPrecisionMostrada = false; // "Re-armamos" el sistema de advertencia
        console.log("✅ Precisión recuperada. El sistema de advertencia por baja precisión se ha reseteado.");
    }

    if (pos >= crit.longitudMinima && precisionActualVentana >= estadoEjercicio.precisionExigida) {
        finalizarEjercicio("¡Objetivo de precisión alcanzado!");
        return;
    }
    
    if (pos >= crit.longitudMaxima && pos > 0) {
        console.log(`📉 Límite máximo alcanzado. Reduciendo objetivo de precisión.`);
        estadoEjercicio.precisionExigida -= (crit.reduccionPorFallo || 1);
        targetAccuracyElement.textContent = `${estadoEjercicio.precisionExigida.toFixed(0)}%`;
    }
}

/**
 * NUEVO: Interrumpe al usuario con un mensaje para que se re-enfoque.
 */
function intervenirConPausa(razon) {
    if (estadoEjercicio.isPaused) return; 

    // Decide qué advertencia mostrar
    if (!estadoEjercicio.haRecibidoPrimeraAdvertencia) {
        // --- PRIMERA ADVERTENCIA: La micropausa de siempre ---
        console.warn(`⏸️ INTERVENCIÓN (1/2): Micropausa. Razón: ${razon}`);
        estadoEjercicio.isPaused = true;
        estadoEjercicio.haRecibidoPrimeraAdvertencia = true; // La marcamos como vista

        const messageElement = interventionModal.querySelector('#intervention-message');
        messageElement.textContent = razon;
        interventionModal.classList.add('visible');

        setTimeout(() => {
            interventionModal.classList.remove('visible');
            estadoEjercicio.isPaused = false;
            estadoEjercicio.rachaDeErrores = 0;
            estadoEjercicio.tiemposDePulsacion = [];
            entradaUsuario.focus();
            estadoEjercicio.pulsacionesEnCooldown = 10;
        }, 4000);
    } else {
        // --- SEGUNDA ADVERTENCIA: Ofrecer la Salida Digna ---
        console.warn(`⏯️ INTERVENCIÓN (2/2): Ofreciendo Salida Digna. Razón: ${razon}`);
        ofrecerSalidaDigna();
    }
}

function ofrecerSalidaDigna() {
    // Log para depurar: ¿estamos encontrando el elemento del modal?
    console.log("✅ Intentando mostrar el modal de Salida Digna. Elemento encontrado:", gracefulExitModal);

    if (!gracefulExitModal) {
        console.error("❌ ¡ERROR CRÍTICO! El elemento con id 'graceful-exit-modal' no se encontró en el DOM. Revisa tu archivo ejercicio.html.");
        return;
    }

    estadoEjercicio.isPaused = true;
    gracefulExitModal.classList.add('visible');
}

function finalizarEjercicio() {
    if (!estadoEjercicio.timerIniciado) {
        pasarAlSiguiente();
        return;
    }

    // 1. Calculamos los intervalos de la sesión
    const intervalos = [];
    if (estadoEjercicio.tiemposDePulsacion.length > 1) {
        for (let i = 1; i < estadoEjercicio.tiemposDePulsacion.length; i++) {
            intervalos.push(estadoEjercicio.tiemposDePulsacion[i] - estadoEjercicio.tiemposDePulsacion[i - 1]);
        }
    }

    // 2. Llamamos a la Cloud Function en segundo plano, sin esperar respuesta.
    if (intervalos.length > 10) { // Solo si la sesión es mínimamente representativa
        const updateProfile = httpsCallable(functions, 'updateTypingProfile');
        updateProfile({ sessionIKIs: intervalos })
            .then(result => console.log("Respuesta de la Cloud Function:", result.data))
            .catch(error => console.error("Error al llamar a la Cloud Function:", error));
    }

    // 3. El resto de la lógica sigue igual
    const tiempoTranscurrido = (Date.now() - estadoEjercicio.tiempoInicio) / 1000;
    calcularResultados(tiempoTranscurrido, false);
}

function pasarAlSiguiente() {
    resultsModal.style.display = 'none';
    estadoModulo.indiceEjercicioActual++;
    prepararEjercicioActual();
}

function repetirEjercicio() {
    resultsModal.style.display = 'none';
    prepararEjercicioActual();
}

// =================================================================
// SECCIÓN 4: EVENT LISTENERS Y FUNCIONES AUXILIARES
// =================================================================

function toggleStatsPanel() {
    liveStatsContainer.classList.toggle('is-open');
}

document.addEventListener('keydown', (event) => {
    // Combinación para mostrar/ocultar el panel de estadísticas
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault(); // Previene acciones por defecto del navegador (como Guardar)
        toggleStatsPanel();
    }
});

entradaUsuario.addEventListener('input', (event) => {
    if (estadoEjercicio.pulsacionesEnCooldown > 0) {
        estadoEjercicio.pulsacionesEnCooldown--;
        console.log(`❄️ Cooldown activo. Pulsaciones restantes: ${estadoEjercicio.pulsacionesEnCooldown}`);
    }

    if (estadoEjercicio.isPaused) {
        entradaUsuario.value = entradaUsuario.value.slice(0, -1);
        return;
    }

    if (!estadoEjercicio.timerIniciado && entradaUsuario.value.length > 0) {
        estadoEjercicio.timerIniciado = true;
        estadoEjercicio.tiempoInicio = Date.now();
        if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
        liveStatsIntervalId = setInterval(actualizarEstadisticasEnVivo, 1000);
    }
    
    // NUEVO: Guardamos el timestamp de la pulsación para la Métrica 3 (Ritmo)
    estadoEjercicio.tiemposDePulsacion.push(Date.now());
    
    const posActual = entradaUsuario.value.length - 1;
    const charUsuario = entradaUsuario.value[posActual];
    const charMuestra = estadoEjercicio.textoMuestraCompleto[posActual];
    
    if (event.inputType === 'insertText') {
        if (charUsuario === charMuestra) {
            playSound(audioTecleo);
            estadoEjercicio.rachaDeErrores = 0; // Se rompe la racha de errores
        } else {
            playSound(audioError);
            sampleContainer.classList.add('shake');
            setTimeout(() => sampleContainer.classList.remove('shake'), 500);
            
            if (charMuestra) {
                estadoEjercicio.errores.push(posActual);
                estadoEjercicio.mapaErrores[charMuestra] = (estadoEjercicio.mapaErrores[charMuestra] || 0) + 1;
            }
            estadoEjercicio.rachaDeErrores++; // Aumentamos la racha de errores
        }
    }

    const lastCharTyped = entradaUsuario.value.slice(-1);
    const finger = getFingerForKey(lastCharTyped);
    if (finger?.includes("left")) lastHandUsed = "left";
    if (finger?.includes("right")) lastHandUsed = "right";

    const typedLength = entradaUsuario.value.length;
    const totalLength = estadoEjercicio.textoMuestraCompleto.length;
    const porcentaje = totalLength > 0 ? Math.min(typedLength / totalLength * 100, 100) : 0;
    progressBar.style.width = `${porcentaje}%`;
    progressText.textContent = `${Math.round(porcentaje)}%`;

    updateHighlighting();
    updateSampleTextPosition();

    // NUEVO: Verificación de fatiga en cada pulsación para patrones
    if (estadoEjercicio.tipo === 'patron_adaptativo') {
            if (detectarFatiga()) return; // Si se detecta fatiga, se activa la pausa y no seguimos
            verificarProgresoEnVentana();
        } else {
            if (entradaUsuario.value.length === estadoEjercicio.textoMuestraCompleto.length) {
                finalizarEjercicio();
            }
        }
    });

entradaUsuario.addEventListener("keydown", (event) => {
    if (event.key === 'Backspace') {
        playSound(audioBorrado);
        const indexABorrar = entradaUsuario.value.length;
        const errorIndex = estadoEjercicio.errores.lastIndexOf(indexABorrar);
        if (errorIndex !== -1) {
            estadoEjercicio.errores.splice(errorIndex, 1);
        }
        estadoEjercicio.correcciones++;
    }

    const capsLockKey = document.querySelector('.key[data-key="CAPSLOCK"]');
    if (event.getModifierState && capsLockKey) {
        capsLockKey.classList.toggle("active", event.getModifierState("CapsLock"));
    }
});

closeModal.addEventListener('click', pasarAlSiguiente);
repeatButton.addEventListener('click', repetirEjercicio);
musicToggleButton.addEventListener('click', () => {
    isMusicPlaying = !isMusicPlaying;
    if (isMusicPlaying) {
        backgroundMusic.play();
        musicToggleButton.textContent = '🔊';
    } else {
        backgroundMusic.pause();
        musicToggleButton.textContent = '🔇';
    }
});

// --- Funciones auxiliares de UI y sonido ---

function updateHighlighting() {
    const typedValue = entradaUsuario.value;
    const textSpans = textoMuestraElement.querySelectorAll("span");
    const errorPositions = new Set(estadoEjercicio.errores);

    textSpans.forEach((span, index) => {
        if (index < typedValue.length) {
            if (errorPositions.has(index)) {
                span.style.color = "#f87171";
                if (span.textContent === ' ') {
                    span.style.backgroundColor = "rgba(239, 68, 68, 0.5)";
                    span.style.borderRadius = "3px";
                }
            } else {
                span.style.color = "#4ade80";
                span.style.backgroundColor = "transparent";
            }
        } else if (index === typedValue.length) {
            span.style.backgroundColor = "var(--color-cursor-bg)";
            span.style.borderRadius = "3px";
            span.style.color = "var(--color-text)";
        } else {
            span.style.backgroundColor = "transparent";
            span.style.color = "var(--color-text)";
        }
    });
    updateKeyboardAndHandHighlight();
}

function updateKeyboardAndHandHighlight() {
    document.querySelectorAll(".key.highlight").forEach(key => key.classList.remove("highlight"));
    document.querySelectorAll(".hand-finger").forEach(finger => finger.style.fill = "var(--color-surface-accent)");
    const currentIndex = entradaUsuario.value.length;
    const text = estadoEjercicio.textoMuestraCompleto;

    if (currentIndex >= text.length) {
        document.getElementById('keyboard-container').classList.remove('foco-activo');
        return;
    }
    document.getElementById('keyboard-container').classList.add('foco-activo');

    let nextChar = text[currentIndex];
    const diacriticInfo = diacriticMap[nextChar];
    const isUppercase = nextChar && nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase() && !diacriticInfo;
    let keyToHighlightSelector;

    if (isWaitingForVowel && diacriticInfo) {
        keyToHighlightSelector = `.key[data-key="${diacriticInfo.base.toUpperCase()}"]`;
    } else if (diacriticInfo) {
        keyToHighlightSelector = `.key[data-key="${diacriticInfo.deadKey}"]`;
    } else if (nextChar) {
        const keyId = nextChar.toUpperCase() === ' ' ? 'SPACE' : nextChar.toUpperCase();
        keyToHighlightSelector = `.key[data-key="${keyId}"]`;
    }

    const keyToHighlight = document.querySelector(keyToHighlightSelector);
    if (keyToHighlight) {
        keyToHighlight.classList.add("highlight");
        if (isUppercase) {
            const keyFinger = getFingerForKey(nextChar);
            if (keyFinger?.includes('left')) {
                document.querySelector('.key[data-key="SHIFTRIGHT"]')?.classList.add('highlight');
            } else if (keyFinger?.includes('right')) {
                document.querySelector('.key[data-key="SHIFTLEFT"]')?.classList.add('highlight');
            }
        }
    }

    let finger = getFingerForKey(diacriticInfo ? diacriticInfo.base : nextChar);
    if (nextChar === " ") finger = lastHandUsed === "left" ? "thumb-right" : "thumb-left";
    
    if (finger) {
        const fingerElement = document.getElementById(`finger-${finger}`);
        if (fingerElement) {
            if (nextChar === ' ') {
                const spaceKey = document.querySelector('.key[data-key="SPACE"]');
                if (spaceKey) {
                    fingerElement.style.fill = window.getComputedStyle(spaceKey).backgroundColor;
                }
            } else { 
                const keyGroup = getGroupForKey(diacriticInfo ? diacriticInfo.base : nextChar);
                if (keyGroup) {
                    const keyWithGroup = document.querySelector(`.key[data-key-group="group-${keyGroup}"]`);
                    // CORREGIDO: "keyWithGroup" en lugar de "keyWithGoup"
                    if (keyWithGroup) { 
                        fingerElement.style.fill = window.getComputedStyle(keyWithGroup).backgroundColor;
                    }
                }
            }
        }
    }
}

function createKeyboard() {
    keyboardDiv.innerHTML = '';
    keyLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        row.forEach(keyInfo => {
            const keyData = (typeof keyInfo === 'object') ? keyInfo : { key: keyInfo };
            const keyText = keyData.label !== undefined ? keyData.label : keyData.key;
            const keyId = keyData.key.toUpperCase();
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.textContent = keyText;
            keyDiv.style.flexGrow = keyData.size || 1;
            keyDiv.setAttribute('data-key', keyId);
            if (keyData.disabled) keyDiv.classList.add('disabled');
            if (keyData.group) keyDiv.setAttribute('data-key-group', `group-${keyData.group}`);
            if (keyData.finger) keyDiv.setAttribute('data-finger', keyData.finger);
            rowDiv.appendChild(keyDiv);
        });
        keyboardDiv.appendChild(rowDiv);
    });
}

function updateSampleTextPosition() {
    const spans = textoMuestraElement.querySelectorAll("span");
    if (spans.length === 0) return;
    const currentSpan = spans[entradaUsuario.value.length] || spans[spans.length - 1];
    if (!currentSpan) return;
    const spanCenter = currentSpan.offsetLeft + (currentSpan.offsetWidth / 2);
    const newLeft = (sampleContainer.clientWidth / 2) - spanCenter;
    textoMuestraElement.style.left = `${newLeft}px`;
}

function getFingerForKey(char) {
    if (!char) return null;
    const keyData = keyLayout.flat().find(k => (k.key || k).toUpperCase() === char.toUpperCase());
    return keyData ? keyData.finger : null;
}

function getGroupForKey(char) {
    if (!char) return null;
    const keyData = keyLayout.flat().find(k => (k.key || k).toUpperCase() === char.toUpperCase());
    return keyData ? keyData.group : null;
}

function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => {
        if (e.name !== 'AbortError') { console.error("Error al reproducir sonido:", e); }
    });
}

function makeDraggable(element) {
    let isDragging = false, offsetX, offsetY;
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
        element.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            element.style.left = `${e.clientX - offsetX}px`;
            element.style.top = `${e.clientY - offsetY}px`;
        }
    });
    document.addEventListener('mouseup', () => { isDragging = false; element.style.cursor = 'grab'; });
}

// --- Funciones de estadísticas y guardado ---

function actualizarEstadisticasEnVivo() {
    if (!estadoEjercicio.timerIniciado) return;
    const segundosTranscurridos = (Date.now() - estadoEjercicio.tiempoInicio) / 1000;
    if (segundosTranscurridos === 0) return;
    calcularResultados(segundosTranscurridos, true);
}

function calcularResultados(segundos, soloActualizarStats = false) {
    if (liveStatsIntervalId && !soloActualizarStats) {
        clearInterval(liveStatsIntervalId);
        liveStatsIntervalId = null;
    }

    const typedText = entradaUsuario.value;
    const errores = estadoEjercicio.errores.length;
    const minutos = segundos > 0 ? segundos / 60 : 1;
    const precision = typedText.length > 0 ? ((typedText.length - errores) / typedText.length) * 100 : 100;
    const netPPM = Math.max(0, Math.round((typedText.length - errores) / minutos));

    livePpmElement.textContent = netPPM;
    liveAccuracyElement.textContent = Math.max(0, precision).toFixed(1);
    liveCorrectionsElement.textContent = estadoEjercicio.correcciones;
    const topErrores = Object.entries(estadoEjercicio.mapaErrores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(item => item[0] === ' ' ? "'espacio'" : item[0]).join(', ');
    liveTopErrorsElement.textContent = topErrores || '-';

    if (soloActualizarStats) return;

    modalTiempo.textContent = segundos.toFixed(1);
    modalNetPPM.textContent = netPPM;
    modalPrecision.textContent = Math.max(0, precision).toFixed(1);
    modalErrors.textContent = errores;
    resultsModal.style.display = 'flex';
    
    guardarResultado({ ppm: netPPM, precision: parseFloat(precision.toFixed(1)), errores, duracion: parseFloat(segundos.toFixed(1)) });
}

async function guardarResultado(datos) {
    const usuario = auth.currentUser;
    if (!usuario) return;
    try {
        await addDoc(collection(db, "resultados"), {
            userId: usuario.uid,
            timestamp: serverTimestamp(),
            ...datos
        });
    } catch (e) {
        console.error("Error al guardar el resultado: ", e);
    }
}

// Botón para seguir intentando en el modal de salida digna
exitContinueBtn.addEventListener('click', () => {
    gracefulExitModal.classList.remove('visible');
    estadoEjercicio.isPaused = false;
    estadoEjercicio.rachaDeErrores = 0; // Le damos otra oportunidad
    estadoEjercicio.tiemposDePulsacion = [];
    estadoEjercicio.pulsacionesEnCooldown = 10;
    estadoEjercicio.haRecibidoPrimeraAdvertencia = false; 

    entradaUsuario.focus();
});

// Botón para posponer y pasar al siguiente ejercicio
exitPostponeBtn.addEventListener('click', () => {
    gracefulExitModal.classList.remove('visible');
    // Usamos la función que ya teníamos para pasar de ejercicio
    pasarAlSiguiente(); 
});

// =================================================================
// SECCIÓN 5: LÓGICA DE TEMA Y INICIALIZACIÓN
// =================================================================

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
};

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
};

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});

function init() {
    createKeyboard();
    makeDraggable(liveStatsContainer);
    cargarModulo();
    initializeTheme();
    
    document.body.addEventListener('click', e => {
        if (!e.target.closest('.modal-content') && !e.target.closest('#user-menu-button') && !e.target.closest('#live-stats-container')) {
            entradaUsuario.focus();
        }
    }, true);
    window.addEventListener('resize', updateSampleTextPosition);
}

init();