// fatigue.js
// Módulo de detección de fatiga e intervención al usuario

import { estadoEjercicio, setEstadoEjercicio } from './state.js';
import {
  interventionModal,
  gracefulExitModal,
  exitContinueBtn,
  exitPostponeBtn,
  entradaUsuario
} from './dom.js';

/**
 * Detecta señales de fatiga: racha de errores o ritmo inconsistente.
 * @returns {boolean} True si muestra fatiga y se ha intervenido, false en caso contrario.
 */
export function detectarFatiga() {
  if (estadoEjercicio.pulsacionesEnCooldown > 0) return false;
  const crit = estadoEjercicio.criterios || {};

  // Métrica 1: Racha de errores
  if (crit.fatiga_racha_errores && estadoEjercicio.rachaDeErrores >= crit.fatiga_racha_errores) {
    intervenirConPausa(`Has cometido varios errores seguidos. ¡Tómate un respiro!`);
    return true;
  }

  // Métrica 2: Ritmo inconsistente (IKI)
  const tiempos = estadoEjercicio.tiemposDePulsacion;
  if (tiempos.length > 10) {
    // Calcula desviación de últimos 10 intervalos
    const intervalos = tiempos.slice(-10).map((t,i,arr) => i>0 ? arr[i] - arr[i-1] : null).filter(v=>v!=null);
    const mean = intervalos.reduce((a,b)=>a+b,0)/intervalos.length;
    const variance = intervalos.reduce((acc,v)=>acc+(v-mean)**2,0)/intervalos.length;
    const desviacionActual = Math.sqrt(variance);

    // Umbral dinámico
    let umbral;
    const factor = crit.fatiga_factor_tolerancia_iki || 1.5;
    if (estadoEjercicio.perfilUsuario && estadoEjercicio.perfilUsuario.stdDevIKI) {
      umbral = estadoEjercicio.perfilUsuario.stdDevIKI * factor;
    } else {
      umbral = Math.max(mean * 0.75, 150);
    }

    if (desviacionActual > umbral) {
      intervenirConPausa(`Tu ritmo es irregular. Intenta mantener una cadencia constante.`);
      setEstadoEjercicio({ tiemposDePulsacion: [] });
      return true;
    }
  }
  return false;
}

/**
 * Realiza una intervención tipo pausa, mostrando un modal.
 * La primera vez es una micropausa, la segunda ofrece salida digna.
 * @param {string} razon - Mensaje para el usuario.
 */
export function intervenirConPausa(razon) {
  if (estadoEjercicio.isPaused) return;
  // Primera advertencia: micropausa
  if (!estadoEjercicio.haRecibidoPrimeraAdvertencia) {
    setEstadoEjercicio({ isPaused: true, haRecibidoPrimeraAdvertencia: true });
    const msg = interventionModal.querySelector('#intervention-message');
    msg.textContent = razon;
    interventionModal.classList.add('visible');
    setTimeout(() => {
      interventionModal.classList.remove('visible');
      setEstadoEjercicio({ isPaused: false, rachaDeErrores: 0, pulsacionesEnCooldown: 10 });
      entradaUsuario.focus();
    }, 4000);
  } else {
    // Segunda advertencia: salida digna
    ofrecerSalidaDigna();
  }
}

/**
 * Muestra el modal de salida digna para que el usuario pause o continúe.
 */
export function ofrecerSalidaDigna() {
  setEstadoEjercicio({ isPaused: true });
  if (!gracefulExitModal) return;
  gracefulExitModal.classList.add('visible');

  // Al hacer click en continuar, cerramos modal y reanudamos
  exitContinueBtn.addEventListener('click', () => {
    gracefulExitModal.classList.remove('visible');
    setEstadoEjercicio({ isPaused: false, rachaDeErrores: 0, pulsacionesEnCooldown: 10, haRecibidoPrimeraAdvertencia: false });
    entradaUsuario.focus();
  }, { once: true });

  // Al posponer, avanzamos sin completar
  exitPostponeBtn.addEventListener('click', () => {
    gracefulExitModal.classList.remove('visible');
    // El avance real debe implementarse en el módulo principal
  }, { once: true });
}

/**
 * Verifica la precisión en una ventana de caracteres y puede intervenir si baja.
 */
export function verificarProgresoEnVentana() {
  const crit = estadoEjercicio.criterios || {};
  const pos = entradaUsuario.value.length;
  if (!crit.longitudVentana || pos < crit.longitudVentana) return;
  const erroresEnVentana = estadoEjercicio.errores.filter(i => i >= pos - crit.longitudVentana).length;
  const precision = ((crit.longitudVentana - erroresEnVentana) / crit.longitudVentana) * 100;
  if (crit.fatiga_precision_critica && precision < crit.fatiga_precision_critica && !estadoEjercicio.advertenciaPrecisionMostrada) {
    intervenirConPausa(`Tu precisión ha bajado del ${crit.fatiga_precision_critica}%. ¡Respira y concéntrate!`);
    setEstadoEjercicio({ advertenciaPrecisionMostrada: true });
  } else if (estadoEjercicio.advertenciaPrecisionMostrada && precision > (crit.fatiga_precision_critica + 5)) {
    setEstadoEjercicio({ advertenciaPrecisionMostrada: false });
  }
}
