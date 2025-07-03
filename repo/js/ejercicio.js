// =================================================================
// EJERCICIO.JS - EL ORQUESTADOR PRINCIPAL
// =================================================================

// --- 1. IMPORTACIONES DE MÓDULOS ---

// Módulos de Firebase
import { auth } from './firebase.js';

// Módulo de Estado
import { estadoLeccion, estadoEjercicio, setEstadoLeccion, setEstadoEjercicio } from './state.js';

// Módulo de API (Carga de lecciones y generación de texto)
import { cargarLeccion, prepararFaseActual } from './ejercicioApi.js';

// Módulo de UI (Todo lo visual)
import { 
    createKeyboard, 
    renderizarTextoEnUI, 
    playSound, 
    audioTecleo, 
    audioError, 
    audioBorrado,
    backgroundMusic, 
    isMusicPlaying, 
    setMusicPlaying, 
    toggleStatsPanel,  
    initializeTheme,
    updateHighlighting,
    updateSampleTextPosition,
    actualizarBarraDeProgreso,
    // actualizarTimerUI
} from './ui.js';

// Módulo de Estadísticas
import { actualizarEstadisticasEnVivo, calcularResultados } from './stats.js';

// Módulo de Detección de Fatiga
import { detectarFatiga, verificarProgresoEnVentana } from './fatigue.js';

// Referencias al DOM
import {
  textoMuestraElement,
  sampleContainer,
  entradaUsuario,
  progressBar,
  progressText,
  resultsModal,
  closeModal,
  starRating,
  keyboardDiv,
  modalTiempo,
  modalNetPPM,
  modalPrecision,
  modalErrors,
  repeatButton,
  liveStatsContainer,
  exerciseLengthElement,
  livePpmElement,
  liveAccuracyElement,
  liveCorrectionsElement,
  liveTopErrorsElement,
  adaptiveInfoContainer,
  windowAccuracyElement,
  targetAccuracyElement,
  musicToggleButton,
  themeToggle,
  interventionModal,
  gracefulExitModal,
  exitContinueBtn,
  exitPostponeBtn,
  loadingSpinner,
  moduleProgressContainer,
  countdownTimer,
  countdownRing,
  countdownText
} from './dom.js';

//Utils
import { makeDraggable } from './utils.js';

// --- 2. LÓGICA DE NAVEGACIÓN Y FINALIZACIÓN ---

function finalizarEjercicio() {
    if (estadoEjercicio.idTemporizador) clearTimeout(estadoEjercicio.idTemporizador);
    // if (estadoEjercicio.idTimerUI) clearInterval(estadoEjercicio.idTimerUI);
    if (!estadoEjercicio.timerIniciado) {
        avanzarLeccion(); // Avanza al siguiente intento si no se empezó
        return;
    }

    entradaUsuario.disabled = true;
    const tiempoTranscurrido = (Date.now() - estadoEjercicio.tiempoInicio) / 1000;
    const resultadoIntento = calcularResultados(tiempoTranscurrido, false);
    const faseActual = estadoLeccion.datos.fases[estadoLeccion.faseActualIndex];
    const faseSuperada = evaluarPaseDeFase(faseActual, resultadoIntento);

    if (faseSuperada) {
        setEstadoLeccion({ faseActualIndex: estadoLeccion.faseActualIndex + 1 });
        setTimeout(() => {
            alert(`¡FASE SUPERADA: ${faseActual.nombre}! Prepárate para la siguiente.`);
        }, 500);
    }
}

function avanzarLeccion() {
    resultsModal.style.display = 'none';
    gracefulExitModal.classList.remove('visible');
    prepararFaseActual();
}

function repetirEjercicio() {
    resultsModal.style.display = 'none';
    const idFaseActual = estadoLeccion.datos.fases[estadoLeccion.faseActualIndex].id;
    let progreso = estadoLeccion.progresoPorFase;
    if (progreso[idFaseActual]) {
        delete progreso[idFaseActual];
        setEstadoLeccion({ progresoPorFase: progreso });
    }
    console.log(`♻️ Repitiendo fase. Progreso para '${idFaseActual}' reseteado.`);
    prepararFaseActual();
}

// --- 3. EVENT LISTENERS PRINCIPALES ---

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        toggleStatsPanel();
    }
});

entradaUsuario.addEventListener('input', (event) => {
    // 1. Gestión de Pausa y Cooldown
    if (estadoEjercicio.isPaused) {
        entradaUsuario.value = entradaUsuario.value.slice(0, -1);
        return;
    }

    if (estadoEjercicio.pulsacionesEnCooldown > 0) {
        setEstadoEjercicio({ pulsacionesEnCooldown: estadoEjercicio.pulsacionesEnCooldown - 1 });
        console.log(`❄️ Cooldown activo: ${estadoEjercicio.pulsacionesEnCooldown} restantes.`);
    }

    if (!estadoEjercicio.timerIniciado && entradaUsuario.value.length > 0) {
    // Marcamos el inicio del intento y guardamos la hora
    setEstadoEjercicio({ timerIniciado: true, tiempoInicio: Date.now() });

    // Limpiamos cualquier intervalo que pudiera quedar de un estado anterior
    if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);

    // Iniciamos el único intervalo que actualiza la UI cada 250ms
    liveStatsIntervalId = setInterval(() => {
        actualizarEstadisticasEnVivo(); // Actualiza las stats en vivo
        actualizarBarraDeProgreso();  // Actualiza la barra de progreso (sea por tiempo o por longitud)
    }, 250);

    // Iniciamos el temporizador principal que finaliza el bloque
    const duracion = estadoEjercicio.criterios.duracionBloque; 
    if (duracion > 0) {
        console.log(`⏰ Temporizador de finalización iniciado: ${duracion} segundos.`);
        setEstadoEjercicio({ 
            idTemporizador: setTimeout(() => finalizarEjercicio(), duracion * 1000) 
        });
    }
}

    estadoEjercicio.tiemposDePulsacion.push(Date.now());
    const posActual = entradaUsuario.value.length - 1;
    const charUsuario = entradaUsuario.value[posActual];
    const charMuestra = estadoEjercicio.textoMuestraCompleto[posActual];

    if (event.inputType === 'insertText') {
        if (charUsuario === charMuestra) {
            playSound(audioTecleo);
            setEstadoEjercicio({ rachaDeErrores: 0 });
        } else {
            playSound(audioError);
            if (sampleContainer) sampleContainer.classList.add('shake');
            setTimeout(() => sampleContainer.classList.remove('shake'), 500);
            if (charMuestra) {
                estadoEjercicio.errores.push(posActual);
                estadoEjercicio.mapaErrores[charMuestra] = (estadoEjercicio.mapaErrores[charMuestra] || 0) + 1;
            }
            setEstadoEjercicio({ rachaDeErrores: estadoEjercicio.rachaDeErrores + 1 });
        }
    }

    actualizarBarraDeProgreso();
    updateHighlighting();
    updateSampleTextPosition();

    const textLength = estadoEjercicio.textoMuestraCompleto.length;
    if (estadoEjercicio.criterios.duracionBloque > 0 && textLength > 0 && textLength - entradaUsuario.value.length < 50) {
        const textoOriginal = estadoEjercicio.textoMuestraCompleto.join('');
        setEstadoEjercicio({ textoMuestraCompleto: (textoOriginal + " " + textoOriginal).split('') });
        renderizarTextoEnUI(true);
    }

    const tiposDeFaseActivos = ['bloques_fijos', 'maestria_ventana_movil', 'test_unico'];
    if (tiposDeFaseActivos.includes(estadoEjercicio.tipo)) {
        if (detectarFatiga()) return;
    }
    if (estadoEjercicio.tipo === 'maestria_ventana_movil') {
        verificarProgresoEnVentana();
    }

    if (entradaUsuario.value.length === textLength && !estadoEjercicio.criterios.duracionBloque) {
        finalizarEjercicio();
    }
});

entradaUsuario.addEventListener("keydown", (event) => {
    if (event.key === 'Backspace') {
        playSound(audioBorrado);
        const indexBorrado = entradaUsuario.value.length - 1;
        if (indexBorrado >= 0) {
            const errorIndex = estadoEjercicio.errores.indexOf(indexBorrado);
            if (errorIndex !== -1) {
                estadoEjercicio.errores.splice(errorIndex, 1);
            }
            setEstadoEjercicio({ correcciones: estadoEjercicio.correcciones + 1 });
        }
    }
});

closeModal.addEventListener('click', avanzarLeccion);
repeatButton.addEventListener('click', repetirEjercicio);
exitPostponeBtn.addEventListener('click', () => avanzarLeccion(true));
exitContinueBtn.addEventListener('click', () => {
    gracefulExitModal.classList.remove('visible');
    setEstadoEjercicio({ isPaused: false, rachaDeErrores: 0, pulsacionesEnCooldown: 10, haRecibidoPrimeraAdvertencia: false, tiemposDePulsacion: [] });
    entradaUsuario.focus();
});
musicToggleButton.addEventListener('click', () => {
    // Simplemente llamamos a la función de ui.js para que haga todo el trabajo
    setMusicPlaying(!isMusicPlaying); 
});


// --- 4. INICIALIZACIÓN ---
function init() {
    createKeyboard();
    makeDraggable(liveStatsContainer);
    initializeTheme();
    cargarLeccion();
    
    document.body.addEventListener('click', e => {
        if (!e.target.closest('.modal-content') && !e.target.closest('#user-menu-button') && !e.target.closest('#live-stats-container')) {
            entradaUsuario.focus();
        }
    }, true);
}

init();