// ejercicioApi.js
// Módulo de acceso a datos y generación de ejercicios (Firebase y lógica procedural)

import { auth, db, functions } from './firebase.js';
import { renderizarTextoEnUI } from './ui.js';
import { estadoLeccion, estadoEjercicio, setEstadoLeccion, setEstadoEjercicio, resetearEstadoEjercicio } from './state.js';
import { loadingSpinner, textoMuestraElement } from './dom.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js';

/**
 * Carga la lección y el progreso previo del usuario.
 */
export async function cargarLeccion() {
    const params = new URLSearchParams(window.location.search);
    const cursoId = params.get('curso');
    const moduloId = params.get('modulo');
    if (!cursoId || !moduloId) {
        textoMuestraElement.textContent = 'Error: Lección no especificada.';
        return;
    }

    loadingSpinner.classList.remove('hidden');
    textoMuestraElement.innerHTML = '';

    try {
        const leccionRef = doc(db, 'cursos', cursoId, 'modulos', moduloId);
        const docSnap = await getDoc(leccionRef);

        if (!docSnap.exists() || docSnap.data().tipoLeccion !== 'fases_maestria') {
            loadingSpinner.classList.add('hidden');
            textoMuestraElement.textContent = 'Esta lección no es compatible o no existe.';
            return;
        }

        // Guardamos los datos de la lección en el estado
        setEstadoLeccion({
            id: moduloId,
            datos: docSnap.data(),
            faseActualIndex: 0,
            progresoPorFase: {}
        });

        // Leemos el progreso guardado del usuario
        const usuario = auth.currentUser;
        if (usuario) {
            const progresoRef = doc(db, 'users', usuario.uid, 'progresoLecciones', moduloId);
            const progresoSnap = await getDoc(progresoRef);
            if (progresoSnap.exists()) {
                console.log("📈 ¡Progreso anterior encontrado! Cargando...");
                const datosProgreso = progresoSnap.data();
                setEstadoLeccion({
                    faseActualIndex: datosProgreso.faseActualIndex || 0,
                    progresoPorFase: datosProgreso.progresoPorFase || {}
                });
            }
        }

        // --- ¡LLAMADA CRÍTICA QUE FALTABA! ---
        // Una vez tenemos todos los datos, llamamos a la siguiente función del proceso.
        await prepararFaseActual();

    } catch (e) {
        console.error('Error al cargar la lección:', e);
        loadingSpinner.classList.add('hidden');
        textoMuestraElement.textContent = 'Error al cargar la lección.';
    }
    // El spinner ahora se oculta dentro de prepararFaseActual, por lo que no hace falta un 'finally' aquí.
}

/**
 * Prepara la fase actual: resetea estado, carga perfil y genera texto.
 */
export async function prepararFaseActual() {
    resetearEstadoEjercicio(); // Asumiendo que esta función está importada o definida en otro módulo
    
    const perfil = await leerTypingProfile();
    if (perfil) {
        setEstadoEjercicio({ perfilUsuario: perfil });
        console.log("👤 Perfil de ritmo personal cargado:", perfil);
    } else {
        setEstadoEjercicio({ perfilUsuario: {} });
        console.log("👤 No se encontró perfil de ritmo. Se usarán valores por defecto.");
    }

    // Aquí definimos la variable como 'fase'
    const fase = estadoLeccion.datos.fases[estadoLeccion.faseActualIndex];
    
    if (!fase) {
        textoMuestraElement.textContent = "¡LECCIÓN COMPLETADA! 🎉";
        entradaUsuario.disabled = true;
        if(moduleProgressContainer) moduleProgressContainer.innerHTML = '';
        return;
    }

    
    // Usamos 'fase' para establecer el tipo y los criterios
    setEstadoEjercicio({
        tipo: fase.tipoFase,
        criterios: {
            ...fase.criterioPaseFase,
            ...fase.criterioExitoIntento,
            minCaracteresRequeridos: fase.configEjercicio.minCaracteresRequeridos,
            duracionBloque: fase.configEjercicio.duracionBloque
        }
    });

    loadingSpinner.classList.remove('hidden');
    textoMuestraElement.innerHTML = '';

    try {
        // Usamos 'fase' para obtener la configuración
        const config = fase.configEjercicio;
        const progresoFase = estadoLeccion.progresoPorFase[fase.id] || {};
        const fixedIndex = progresoFase.ejercicioFijoIndex || 0;
        const resultadosPrevios = progresoFase.resultadosFijos || [];
        let textoGenerado;

        if (fixedIndex < (fase.ejerciciosFijos || []).length) {
            textoGenerado = fase.ejerciciosFijos[fixedIndex];
            estadoLeccion.progresoPorFase[fase.id] = {
                ...progresoFase,
                ejercicioFijoIndex: fixedIndex + 1,
                resultadosFijos: resultadosPrevios
            };
        } else if (config.tipoGenerador === 'patron_simple' && config.patron) {
            console.log(`Generando texto localmente con el patrón: "${config.patron}"`);
            textoGenerado = generarTextoDePatron(config.patron, config.longitudGenerada || 200);
        } else {
            const promptParaIA = config.prompt || `un texto simple que use principalmente las letras ${config.characterSet.join(', ')}`;
            const configParaEnviar = { ...config, prompt: promptParaIA };
            
            console.log("Solicitando texto a la IA con el prompt:", promptParaIA);
            const generateText = httpsCallable(functions, 'generateExerciseText');
            const result = await generateText({ config: configParaEnviar, resultadosPrevios });
            textoGenerado = result.data.exerciseText.split('');
        }
        setEstadoEjercicio({ textoMuestraCompleto: Array.isArray(textoGenerado) ? textoGenerado : textoGenerado.split('') });

    } catch (error) {
        console.error("Error al generar texto con IA:", error);
        setEstadoEjercicio({ textoMuestraCompleto: "Error al generar el ejercicio. Inténtalo de nuevo.".split('') });
    } finally {
        loadingSpinner.classList.add('hidden');
        renderizarTextoEnUI();
    }
}

/**
 * Lee el perfil de ritmo del usuario desde Firestore.
 */
export async function leerTypingProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const profileRef = doc(db, 'users', user.uid, 'stats', 'typingProfile');
    const snap = await getDoc(profileRef);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/**
 * Genera texto procedural aleatorio según un conjunto de caracteres.
 */
export function generarEjercicioProcedural(config) {
  let { characterSet, longitudGenerada } = config;
  if (Array.isArray(characterSet)) characterSet = characterSet.join('');
  if (!characterSet.includes(' ')) characterSet += '  ';
  const len = longitudGenerada || 200;
  let text = '';
  for (let i = 0; i < len; i++) {
    text += characterSet[Math.floor(Math.random()*characterSet.length)];
  }
  return text.trim().replace(/ +/g,' ').slice(0,len);
}

/**
 * Genera texto repitiendo un patrón hasta longitud deseada.
 */
export function generarTextoDePatron(patron, longitud) {
  let text = '';
  while (text.length < longitud) text += patron;
  return text.substring(0, longitud);
}
