// ui.js
// Lógica de interfaz de usuario: teclado, resaltado, sonido, modales y tema

import { keyLayout, diacriticMap } from './config.js';
import {
  progressBar, 
  progressText,
  keyboardDiv,
  textoMuestraElement,
  sampleContainer,
  entradaUsuario,
  liveStatsContainer,
  moduleProgressContainer,
  countdownRing,
  countdownText,
  themeToggle,
  countdownTimer,
  musicToggleButton
} from './dom.js';
import { estadoEjercicio } from './state.js';

// --- Estado de reproducción musical ---
export let isMusicPlaying = false;

/**
 * Cambia el estado de reproducción de la música de fondo.
 * @param {boolean} playing - true para reproducir, false para pausar
 */
export function setMusicPlaying(playing) {
  isMusicPlaying = playing;
  if (playing) {
    backgroundMusic.play();
    // Asegúrate de que 'musicToggleButton' está importado desde 'dom.js'
    musicToggleButton.textContent = '🔊';
  } else {
    backgroundMusic.pause();
    musicToggleButton.textContent = '🔇';
  }
}

// --- Carga de Sonidos ---
export const audioTecleo = new Audio('sounds/tecleo.mp3');
audioTecleo.volume = 0.5;
export const audioError = new Audio('sounds/error.mp3');
audioError.volume = 0.4;
export const audioBorrado = new Audio('sounds/borrado.mp3');
audioBorrado.volume = 0.3;
export const audioEstrella = new Audio('sounds/estrella.mp3');
audioEstrella.volume = 0.6;
export const backgroundMusic = new Audio('sounds/background-music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2;

/**
 * Reproduce un sonido desde el inicio.
 * @param {HTMLAudioElement} audio
 */
export function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(e => {
    if (e.name !== 'AbortError') console.error('Error al reproducir sonido:', e);
  });
}

/**
 * Genera y monta el teclado en pantalla usando keyLayout.
 */
export function createKeyboard() {
  keyboardDiv.innerHTML = '';
  keyLayout.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    row.forEach(keyInfo => {
      const { key, label, size = 1, disabled, group, finger } = keyInfo;
      const keyText = label || key;
      const keyId = key.toUpperCase();
      const keyDiv = document.createElement('div');
      keyDiv.className = 'key';
      keyDiv.textContent = keyText;
      keyDiv.style.flexGrow = size;
      keyDiv.dataset.key = keyId;
      if (disabled) keyDiv.classList.add('disabled');
      if (group) keyDiv.dataset.keyGroup = `group-${group}`;
      if (finger) keyDiv.dataset.finger = finger;
      rowDiv.appendChild(keyDiv);
    });
    keyboardDiv.appendChild(rowDiv);
  });
}

/**
 * Renderiza el texto de ejercicio en la UI.
 * @param {boolean} mantenerInput - Si true, conserva el texto ingresado.
 */
export function renderizarTextoEnUI(mantenerInput = false) {
    console.log("➡️ Ejecutando renderizarTextoEnUI(). El texto a pintar es:", estadoEjercicio.textoMuestraCompleto);
  const textoActual = entradaUsuario.value;
  textoMuestraElement.innerHTML = '';
  (estadoEjercicio.textoMuestraCompleto || []).forEach(char => {
    const span = document.createElement('span');
    span.textContent = char;
    textoMuestraElement.appendChild(span);
  });
  if (!mantenerInput) entradaUsuario.value = '';
  else entradaUsuario.value = textoActual;
  entradaUsuario.disabled = false;
  entradaUsuario.focus();
  updateHighlighting();
  requestAnimationFrame(updateSampleTextPosition);
}

/**
 * Actualiza colores y resaltado de caracteres según el progreso del usuario.
 */
export function updateHighlighting() {
  const typedValue = entradaUsuario.value;
  const spans = textoMuestraElement.querySelectorAll('span');
  const errores = new Set(estadoEjercicio.errores);
  spans.forEach((span, idx) => {
    if (idx < typedValue.length) {
      if (errores.has(idx)) {
        span.style.color = '#f87171';
        if (span.textContent === ' ') {
          span.style.backgroundColor = 'rgba(239, 68, 68, 0.5)';
          span.style.borderRadius = '3px';
        }
      } else {
        span.style.color = '#4ade80';
        span.style.backgroundColor = 'transparent';
      }
    } else if (idx === typedValue.length) {
      span.style.backgroundColor = 'var(--color-cursor-bg)';
      span.style.borderRadius = '3px';
      span.style.color = 'var(--color-text)';
    } else {
      span.style.backgroundColor = 'transparent';
      span.style.color = 'var(--color-text)';
    }
  });
  updateKeyboardAndHandHighlight();
}

/**
 * Resalta tecla y dedo adecuado según el siguiente carácter.
 */
export function updateKeyboardAndHandHighlight() {
  document.querySelectorAll('.key.highlight').forEach(k => k.classList.remove('highlight'));
  document.querySelectorAll('.hand-finger').forEach(f => f.style.fill = 'var(--color-surface-accent)');
  const idx = entradaUsuario.value.length;
  const text = estadoEjercicio.textoMuestraCompleto || [];
  if (idx >= text.length) {
    document.getElementById('keyboard-container')?.classList.remove('foco-activo');
    return;
  }
  document.getElementById('keyboard-container')?.classList.add('foco-activo');
  let nextChar = text[idx];
  const diac = diacriticMap[nextChar];
  const isUppercase = nextChar && nextChar === nextChar.toUpperCase() && !diac;
  let selector;
  if (diac) selector = `.key[data-key="${diac.base.toUpperCase()}"]`;
  else if (nextChar) {
    const keyId = nextChar === ' ' ? 'SPACE' : nextChar.toUpperCase();
    selector = `.key[data-key="${keyId}"]`;
  }
  const keyEl = selector && document.querySelector(selector);
  if (keyEl) keyEl.classList.add('highlight');
  if (isUppercase) {
    const finger = getFingerForKey(nextChar);
    const shiftKey = finger?.includes('left') ? 'SHIFTRIGHT' : 'SHIFTLEFT';
    document.querySelector(`.key[data-key="${shiftKey}"]`)?.classList.add('highlight');
  }
}

/**
 * Centra el texto de muestra en el contenedor.
 */
export function updateSampleTextPosition() {
  const spans = textoMuestraElement.querySelectorAll('span');
  if (!spans.length) return;
  const current = spans[entradaUsuario.value.length] || spans[spans.length - 1];
  const center = current.offsetLeft + (current.offsetWidth / 2);
  const shift = (sampleContainer.clientWidth / 2) - center;
  textoMuestraElement.style.left = `${shift}px`;
}

/**
 * Dibuja los puntos de progreso de la lección.
 */
export function renderModuleProgress(total, actual) {
  moduleProgressContainer.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'w-3 h-3 rounded-full transition-all duration-300';
    if (i < actual) dot.classList.add('bg-cyan-500');
    else if (i === actual) dot.classList.add('bg-cyan-300', 'scale-150');
    else dot.classList.add('bg-gray-600');
    moduleProgressContainer.appendChild(dot);
  }
}

/**
 * Abre o cierra el panel de estadísticas.
 */
export function toggleStatsPanel() {
  liveStatsContainer.classList.toggle('is-open');
}

/**
 * Aplica tema 'dark' o 'light'.
 */
export function applyTheme(theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark');
}

/**
 * Inicializa tema según preferencia guardada o del sistema.
 */
export function initializeTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
  themeToggle.addEventListener('click', () => {
    const next = themeToggle.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });
}

/**
 * Obtiene el dedo asignado a un caracter.
 */
function getFingerForKey(char) {
  const data = keyLayout.flat().find(k => (k.key || k).toUpperCase() === char?.toUpperCase());
  return data?.finger;
}

/**
 * Actualiza la barra de progreso principal.
 * Funciona de forma diferente para ejercicios por tiempo o por longitud.
 */
export function actualizarBarraDeProgreso() {
    const typedLength = entradaUsuario.value.length;
    let porcentaje = 0;
    let textoProgreso = `${typedLength} caracteres`;

    const duracion = estadoEjercicio.criterios?.duracionBloque;

    if (duracion > 0) {
        // --- Si el ejercicio es por tiempo ---
        // La barra representa el TIEMPO TRANSCURRIDO.
        const tiempoTranscurrido = estadoEjercicio.timerIniciado ? (Date.now() - estadoEjercicio.tiempoInicio) / 1000 : 0;
        porcentaje = Math.min((tiempoTranscurrido / duracion) * 100, 100);

        // Y el texto muestra el progreso de caracteres.
        const minCaracteres = estadoEjercicio.criterios?.minCaracteresRequeridos || 100;
        textoProgreso = `${typedLength} / ${minCaracteres} chars`;
    } else { 
        // --- Si no tiene duración, funciona como antes ---
        const totalLength = estadoEjercicio.textoMuestraCompleto?.length || 0;
        if (totalLength > 0) {
            porcentaje = Math.min((typedLength / totalLength) * 100, 100);
            textoProgreso = `${Math.round(porcentaje)}%`;
        }
    }

    if (progressBar) progressBar.style.width = `${porcentaje}%`;
    if (progressText) progressText.textContent = textoProgreso;
}

export function actualizarTimerUI() {
    // Esta función depende de 'estadoEjercicio' y de los elementos del DOM del timer.
    // Asegúrate de que están importados al principio de este archivo (ui.js).

    if (!estadoEjercicio.timerIniciado || !countdownTimer) {
        return;
    }

    // Hacemos visible el contenedor del timer si no lo está ya
    if(countdownTimer.classList.contains('hidden')) {
        countdownTimer.classList.remove('hidden');
    }

    const duracionTotal = estadoEjercicio.criterios?.duracionBloque;
    if (!duracionTotal) return;

    const tiempoTranscurrido = (Date.now() - estadoEjercicio.tiempoInicio) / 1000;
    const tiempoRestante = Math.max(0, duracionTotal - tiempoTranscurrido);

    if(countdownText) countdownText.textContent = Math.round(tiempoRestante);

    const porcentajeRestante = (tiempoRestante / duracionTotal) * 100;
    if(countdownRing) countdownRing.style.strokeDasharray = `${porcentajeRestante}, 100`;
}

// /**
//  * Actualiza la UI del temporizador de anillo (countdown).
//  */
// export function actualizarTimerUI() {
//     // Esta función depende de 'estadoEjercicio' y de los elementos del DOM del timer.
//     // Asegúrate de que están importados al principio de este archivo (ui.js).

//     if (!estadoEjercicio.timerIniciado || !countdownTimer) {
//         return;
//     }

//     const duracionTotal = estadoEjercicio.criterios?.duracionBloque;
//     if (!duracionTotal) return;

//     const tiempoTranscurrido = (Date.now() - estadoEjercicio.tiempoInicio) / 1000;
//     const tiempoRestante = Math.max(0, duracionTotal - tiempoTranscurrido);

//     if (countdownText) countdownText.textContent = Math.round(tiempoRestante);

//     const porcentajeRestante = (tiempoRestante / duracionTotal) * 100;
//     if (countdownRing) countdownRing.style.strokeDasharray = `${porcentajeRestante}, 100`;
// }