// stats.js
// Gestión de estadísticas en vivo, resultados y evaluación de fase

import { estadoEjercicio } from './state.js';
import { auth, db } from './firebase.js';
import {
  modalTiempo,
  modalNetPPM,
  modalPrecision,
  modalErrors,
  resultsModal
} from './dom.js';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { estadoLeccion, setEstadoLeccion } from './state.js';

/**
 * Actualiza estadísticas en vivo cada segundo mientras el ejercicio está activo.
 */
export function actualizarEstadisticasEnVivo() {
  if (!estadoEjercicio.timerIniciado) return;
  const segundos = (Date.now() - estadoEjercicio.tiempoInicio) / 1000;
  if (segundos > 0) calcularResultados(segundos, true);
}

/**
 * Calcula resultados (PPM, precisión, errores) al acabar o en vivo.
 * @param {number} segundos - Tiempo transcurrido en segundos.
 * @param {boolean} soloActualizarStats - Si es true, no muestra modal ni guarda.
 * @returns {object|undefined} Cuando no es solo actualizar, devuelve { exito, ppm, precision }.
 */
export function calcularResultados(segundos, soloActualizarStats = false) {
  if (estadoEjercicio.liveStatsIntervalId && !soloActualizarStats) {
    clearInterval(estadoEjercicio.liveStatsIntervalId);
    estadoEjercicio.liveStatsIntervalId = null;
  }

  const typed = estadoEjercicio.textoMuestraCompleto.length
    ? estadoEjercicio.textoMuestraCompleto.slice(0, - (estadoEjercicio.textoMuestraCompleto.length - (estadoEjercicio.textoMuestraCompleto.length))).length
    : 0; // valor real no necesario para cálculo
  const typedLength = estadoEjercicio.tiemposDePulsacion.length;
  const errores = estadoEjercicio.errores.length;
  const minutos = segundos > 0 ? segundos / 60 : 1;
  const precision = typedLength > 0 ? ((typedLength - errores) / typedLength) * 100 : 100;
  const netPPM = Math.max(0, Math.round((typedLength - errores) / minutos));

  if (!soloActualizarStats) {
    // Muestra resultados en modal
    modalTiempo.textContent = segundos.toFixed(1);
    modalNetPPM.textContent = netPPM;
    modalPrecision.textContent = Math.max(0, precision).toFixed(1);
    modalErrors.textContent = errores;
    resultsModal.style.display = 'flex';

    // Guarda resultado en Firestore
    guardarResultado({ ppm: netPPM, precision: parseFloat(precision.toFixed(1)), errores, duracion: parseFloat(segundos.toFixed(1)) });

    return {
      exito: precision >= (estadoEjercicio.criterios.precisionMinima || 95),
      ppm: netPPM,
      precision
    };
  }
}

/**
 * Guarda el resultado de un intento en Firestore.
 * @param {object} datos - { ppm, precision, errores, duracion }
 */
export async function guardarResultado(datos) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, 'resultados'), {
      userId: user.uid,
      timestamp: serverTimestamp(),
      ...datos
    });
  } catch (e) {
    console.error('Error al guardar el resultado:', e);
  }
}

/**
 * Evalúa si el usuario supera la fase actual y guarda el progreso.
 * @param {object} fase - Objeto de la fase actual.
 * @param {object} resultado - { exito, ppm, precision }
 * @returns {Promise<boolean>} True si supera la fase.
 */
export async function evaluarPaseDeFase(fase, resultado) {
  const usuario = auth.currentUser;
  if (!usuario) return false;

  const idFase = fase.id || fase.nombre;
  const criterios = fase.criterioPaseFase;

  // Inicializa si no existe
  if (!estadoLeccion.progresoPorFase[idFase]) {
    estadoLeccion.progresoPorFase[idFase] = {
      intentosTotales: 0,
      historialResultados: [],
      precisiones: []
    };
  }
  const progreso = estadoLeccion.progresoPorFase[idFase];
  progreso.intentosTotales++;

  let faseSuperada = false;
  switch (fase.tipoFase) {
    case 'bloques_fijos':
      progreso.precisiones.push(resultado.precision);
      if (progreso.intentosTotales >= criterios.bloquesRequeridos) {
        const media = progreso.precisiones.reduce((a,b)=>a+b,0)/progreso.precisiones.length;
        faseSuperada = media >= criterios.precisionMinimaMedia;
      }
      break;

    case 'maestria_ventana_movil':
      progreso.historialResultados.push(resultado.exito);
      if (progreso.historialResultados.length > criterios.ventanaDeIntentos) progreso.historialResultados.shift();
      const exitos = progreso.historialResultados.filter(r=>r).length;
      faseSuperada = exitos >= criterios.exitosRequeridos;
      break;

    case 'test_unico':
      faseSuperada = resultado.precision >= criterios.precisionMinima;
      break;

    default:
      faseSuperada = false;
  }

  // Guarda progreso en Firestore
  try {
    const progRef = doc(db, 'users', usuario.uid, 'progresoLecciones', estadoLeccion.id);
    await setDoc(progRef, {
      leccionId: estadoLeccion.id,
      faseActualIndex: estadoLeccion.faseActualIndex,
      progresoPorFase: estadoLeccion.progresoPorFase,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error('Error al guardar progreso de fase:', e);
  }

  if (faseSuperada) {
    setEstadoLeccion({ faseActualIndex: estadoLeccion.faseActualIndex + 1 });
  }

  return faseSuperada;
}