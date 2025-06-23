 // =================================================================
        // SECCIÓN 1: INICIALIZACIÓN DE FIREBASE Y LÓGICA DE USUARIO
        // =================================================================
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
        // SECCIÓN 2: CONSTANTES DE LA APP, ESTADO Y CONFIGURACIÓN
        // =================================================================

        // --- Referencias al DOM ---
        const textoMuestraElement = document.getElementById('texto-muestra');
        const sampleContainer     = document.getElementById('sample-container');
        const entradaUsuario      = document.getElementById('entrada-usuario');
        const progressBar         = document.getElementById('progress-bar');
        const progressText        = document.getElementById('progress-text');
        const resultsModal        = document.getElementById('results-modal');
        const closeModal          = document.getElementById('close-modal');
        const starRating          = document.getElementById('star-rating');
        const keyboardDiv         = document.getElementById('keyboard');
        const modalTiempo         = document.getElementById('modal-tiempo');
        const modalNetPPM         = document.getElementById('modal-netPPM');
        const modalPrecision      = document.getElementById('modal-precision');
        const modalErrors         = document.getElementById('modal-errors');
        const repeatButton        = document.getElementById('repeat-button');
        const liveStatsContainer  = document.getElementById('live-stats-container');
        const exerciseLengthElement = document.getElementById('exercise-length');
        const livePpmElement      = document.getElementById('live-ppm');
        const liveAccuracyElement = document.getElementById('live-accuracy');
        const liveCorrectionsElement = document.getElementById('live-corrections');
        const liveTopErrorsElement   = document.getElementById('live-top-errors');

        // --- Carga de Sonidos ---
        const audioTecleo   = new Audio('sounds/tecleo.mp3');
        const audioError    = new Audio('sounds/error.mp3');
        const audioBorrado  = new Audio('sounds/borrado.mp3');
        const audioEstrella = new Audio('sounds/estrella.mp3'); 
        const backgroundMusic = new Audio('sounds/background-music.mp3');
        backgroundMusic.loop = true; 
        backgroundMusic.volume = 0.2;
        audioTecleo.volume = 0.5;
        audioError.volume = 0.4;
        audioBorrado.volume = 0.3;
        audioEstrella.volume = 0.6;

        // --- Estado del Ejercicio ---
        let sampleText         = [];
        let tiempoInicio       = null;
        let timerIniciado      = false;
        let lastHandUsed       = 'right';
        let liveStatsIntervalId = null;
        let isWaitingForVowel  = false;
        let correcciones = 0;
        let mapaErrores = {};
        let isMusicPlaying = false
        let mapaErroresAnterior = {}; // Para binomios tipo: (letra_anterior, letra_fallada)
let mapaErroresPosterior = {}; // Para binomios tipo: (letra_fallada, letra_siguiente)

        // --- Configuración del Teclado ---
        const keyLayout = [
            [{key:"º",size:1,group:6,finger:"pinky-left"}, {key:"1",size:1,group:6,finger:"pinky-left"}, {key:"2",size:1,group:4,finger:"ring-left"}, {key:"3",size:1,group:3,finger:"middle-left"}, {key:"4",size:1,group:1,finger:"index-left"}, {key:"5",size:1,group:1,finger:"index-left"}, {key:"6",size:1,group:2,finger:"index-right"}, {key:"7",size:1,group:2,finger:"index-right"}, {key:"8",size:1,group:3,finger:"middle-right"}, {key:"9",size:1,group:4,finger:"ring-right"}, {key:"0",size:1,group:6,finger:"pinky-right"}, {key:"'",size:1,group:6,finger:"pinky-right"}, {key:"¡",size:1,group:6,finger:"pinky-right"}, {key:"Backspace",label:"←",size:2,group:6,finger:"pinky-right"}],
            [{key:"Tab",size:1.5,group:6,finger:"pinky-left"}, {key:"Q",size:1,group:6,finger:"pinky-left"}, {key:"W",size:1,group:4,finger:"ring-left"}, {key:"E",size:1,group:3,finger:"middle-left"}, {key:"R",size:1,group:1,finger:"index-left"}, {key:"T",size:1,group:1,finger:"index-left"}, {key:"Y",size:1,group:2,finger:"index-right"}, {key:"U",size:1,group:2,finger:"index-right"}, {key:"I",size:1,group:3,finger:"middle-right"}, {key:"O",size:1,group:4,finger:"ring-right"}, {key:"P",size:1,group:6,finger:"pinky-right"}, {key:"`",size:1,group:6,finger:"pinky-right"}, {key:"+",size:1,group:6,finger:"pinky-right"}, {key:"\\",size:1.5,label:"",disabled:true,group:6}],
            [{key:"CapsLock",label:"Bloq Mayús",size:1.75,group:6,finger:"pinky-left"}, {key:"A",size:1,group:6,finger:"pinky-left"}, {key:"S",size:1,group:4,finger:"ring-left"}, {key:"D",size:1,group:3,finger:"middle-left"}, {key:"F",size:1,group:1,finger:"index-left"}, {key:"G",size:1,group:1,finger:"index-left"}, {key:"H",size:1,group:2,finger:"index-right"}, {key:"J",size:1,group:2,finger:"index-right"}, {key:"K",size:1,group:3,finger:"middle-right"}, {key:"L",size:1,group:4,finger:"ring-right"}, {key:"Ñ",size:1,group:6,finger:"pinky-right"}, {key:"´",size:1,group:6,finger:"pinky-right"}, {key:"Ç",size:1,group:6,finger:"pinky-right"}, {key:"Enter",size:1.25,group:6,finger:"pinky-right"}],
            [{key:"ShiftLeft",label:"Shift",size:1.25,group:6,finger:"pinky-left"}, {key:"<",size:1,group:6,finger:"pinky-left"}, {key:"Z",size:1,group:6,finger:"ring-left"}, {key:"X",size:1,group:4,finger:"middle-left"}, {key:"C",size:1,group:3,finger:"index-left"}, {key:"V",size:1,group:1,finger:"index-left"}, {key:"B",size:1,group:1,finger:"index-right"}, {key:"N",size:1,group:2,finger:"index-right"}, {key:"M",size:1,group:2,finger:"middle-right"}, {key:",",size:1,group:3,finger:"ring-right"}, {key:".",size:1,group:4,finger:"pinky-right"}, {key:"-",size:1,group:6,finger:"pinky-right"}, {key:"ShiftRight",label:"Shift",size:2.75,group:6,finger:"pinky-right"}],
            [{key:"CtrlLeft",label:"Ctrl",size:1.25,group:6,finger:"pinky-left"}, {key:"Win",size:1.25,group:6}, {key:"AltLeft",label:"Alt",size:1.25,group:5,finger:"thumb-left"}, {key:"Space",label:"",size:6.25,group:5,finger:"thumb"}, {key:"AltRight",label:"AltGr",size:1.25,group:5,finger:"thumb-right"}, {key:"Menu",size:1.25,group:6}, {key:"CtrlRight",label:"Ctrl",size:1.25,group:6,finger:"pinky-right"}]
        ];
        
        const diacriticMap = {
            'á': { base: 'a', deadKey: '´' }, 'é': { base: 'e', deadKey: '´' }, 'í': { base: 'i', deadKey: '´' }, 'ó': { base: 'o', deadKey: '´' }, 'ú': { base: 'u', deadKey: '´' },
            'Á': { base: 'A', deadKey: '´' }, 'É': { base: 'E', deadKey: '´' }, 'Í': { base: 'I', deadKey: '´' }, 'Ó': { base: 'O', deadKey: '´' }, 'Ú': { base: 'U', deadKey: '´' },
            'ü': { base: 'u', deadKey: '¨' }, 'Ü': { base: 'U', deadKey: '¨' }, 'à': { base: 'a', deadKey: '`' }, 'è': { base: 'e', deadKey: '`' }, 'â': { base: 'a', deadKey: '^' }, 'ê': { base: 'e', deadKey: '^' },
        };

        // =================================================================
        // SECCIÓN 3: FUNCIONES PRINCIPALES DE LA APLICACIÓN
        // =================================================================


        function getGroupForKey(char) {
            const keyData = keyLayout.flat().find(k => (k.key || k).toUpperCase() === char.toUpperCase());
            return keyData ? keyData.group : null;
        }

        function playSound(audio) {
            audio.currentTime = 0;
            audio.play().catch(e => {
                if (e.name !== 'AbortError') { console.error("Error al reproducir sonido:", e); }
            });
        }

        function toggleStatsPanel() {
            liveStatsContainer.classList.toggle('is-open');
        }

        function makeDraggable(element) {
            let isDragging = false;
            let offsetX, offsetY;

            // Cuando se HACE CLIC en el panel
            element.addEventListener('mousedown', (e) => {
                isDragging = true;
                
                offsetX = e.clientX - element.offsetLeft;
                offsetY = e.clientY - element.offsetTop;
                
                element.style.transition = 'none';
                element.style.cursor = 'grabbing'; // <-- AÑADIDO: La mano se cierra
            });

            // Cuando se MUEVE el ratón
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                element.style.left = `${e.clientX - offsetX}px`;
                element.style.top = `${e.clientY - offsetY}px`;
            });

            // Cuando se SUELTA el clic
            document.addEventListener('mouseup', () => {
                isDragging = false;
                element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                element.style.cursor = 'grab'; // <-- AÑADIDO: La mano vuelve a abrirse
            });
        }

        function actualizarEstadisticasEnVivo() {
            if (!timerIniciado) return;

            // --- Cálculo de PPM y Precisión (sin cambios) ---
            const segundosTranscurridos = (Date.now() - tiempoInicio) / 1000;
            if (segundosTranscurridos === 0) return;
            const typedText = entradaUsuario.value;
            const minutosTranscurridos = segundosTranscurridos / 60;
            let errores = 0;
            for (let i = 0; i < typedText.length; i++) {
                if (typedText[i] !== sampleText[i]) errores++;
            }
            const currentPPM = Math.max(0, Math.round((typedText.length - errores) / minutosTranscurridos));
            const currentAccuracy = typedText.length > 0 ? ((typedText.length - errores) / typedText.length) * 100 : 100;
            
            // --- NUEVA LÓGICA PARA PROCESAR CORRECCIONES Y TOP ERRORES ---
            const topErrores = Object.entries(mapaErrores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(item => item[0] === ' ' ? "'espacio'" : item[0])
                .join(', ');

            // --- Actualizamos TODO el panel ---
            livePpmElement.textContent = currentPPM;
            liveAccuracyElement.textContent = Math.max(0, currentAccuracy).toFixed(1);
            liveCorrectionsElement.textContent = correcciones;
            liveTopErrorsElement.textContent = topErrores || '-';
        }

        async function fetchTextFromWebhook() {
            try {
                const resp = await fetch("https://kluppy-n8n.divk72.easypanel.host/webhook/33b5b99a-06be-47fb-aed1-c27ca7778e7b", {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idioma: 'Español' })
                });
                if (!resp.ok) throw new Error(`Error en el webhook: ${resp.statusText}`);
                const data = await resp.json();
                return data.texto || 'El texto de ejemplo no pudo cargarse. Inténtalo de nuevo.';
            } catch (error) {
                console.error("Error al obtener texto:", error);
                return 'Error de conexión. No se pudo cargar el texto.';
            }
        }

        async function cargarNuevoTexto() {
            const texto = await fetchTextFromWebhook();
            sampleText = texto.split('');
            exerciseLengthElement.textContent = sampleText.length;

            textoMuestraElement.innerHTML = '';
            textoMuestraElement.style.transform = 'translateX(0)'; // <<— reset
            sampleText.forEach(char => {
                const span = document.createElement('span');
                span.textContent = char;
                textoMuestraElement.appendChild(span);
            });
            updateHighlighting();
            requestAnimationFrame(updateSampleTextPosition);
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
        
        function updateHighlighting() {
            const typedValue = entradaUsuario.value;
            const textSpans = textoMuestraElement.querySelectorAll("span");
            
            textSpans.forEach((span, index) => {
                span.style.backgroundColor = "transparent";
                span.style.color = "var(--color-text)";
                if (index < typedValue.length) {
                    if (typedValue[index] === span.textContent) {
                        span.style.color = "#4ade80";
                    } else {
                        span.style.color = "#f87171";
                        if (span.textContent === ' ') {
                            span.style.backgroundColor = "rgba(239, 68, 68, 0.5)";
                            span.style.borderRadius = "3px";
                        }
                    }
                } else if (index === typedValue.length) {
                    // Estilo para el carácter actual (cursor)
                    span.style.backgroundColor = "var(--color-cursor-bg)"; // <-- AHORA USA LA VARIABLE
                    span.style.borderRadius = "3px";
                }
            });
            updateKeyboardAndHandHighlight();
        }
        
        function getFingerForKey(char) {
            const keyData = keyLayout.flat().find(k => (k.key || k).toUpperCase() === char.toUpperCase());
            return keyData ? keyData.finger : null;
        }
        
        function updateKeyboardAndHandHighlight() {
            // 1. Reseteamos los resaltados anteriores
            document.querySelectorAll(".key.highlight").forEach(key => key.classList.remove("highlight"));
            document.querySelectorAll(".hand-finger").forEach(finger => finger.style.fill = "var(--color-surface-accent)");

            const currentIndex = entradaUsuario.value.length;

            // 2. Gestión del foco del teclado
            if (currentIndex >= sampleText.length) {
                document.getElementById('keyboard-container').classList.remove('foco-activo');
                return;
            }
            document.getElementById('keyboard-container').classList.add('foco-activo');

            // 3. Lógica para determinar qué tecla resaltar (sin cambios)
            let nextChar = sampleText[currentIndex];
            const diacriticInfo = diacriticMap[nextChar];
            const isUppercase = nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase() && !diacriticInfo;
            let keyToHighlightSelector;
            if (isWaitingForVowel && diacriticInfo) {
                keyToHighlightSelector = `.key[data-key="${diacriticInfo.base.toUpperCase()}"]`;
            } else if (diacriticInfo) {
                keyToHighlightSelector = `.key[data-key="${diacriticInfo.deadKey}"]`;
            } else {
                keyToHighlightSelector = `.key[data-key="${nextChar.toUpperCase() === ' ' ? 'SPACE' : nextChar.toUpperCase()}"]`;
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

            // 4. --- LÓGICA MEJORADA PARA RESALTAR EL DEDO (INCLUYE CASO ESPACIO) ---
            let finger = getFingerForKey(diacriticInfo ? diacriticInfo.base : nextChar);
            if (nextChar === " ") finger = lastHandUsed === "left" ? "thumb-right" : "thumb-left";
            
            if (finger) {
                const fingerElement = document.getElementById(`finger-${finger}`);
                if (!fingerElement) return;

                // Si la siguiente tecla es un espacio...
                if (nextChar === ' ') {
                    const spaceKey = document.querySelector('.key[data-key="SPACE"]');
                    if (spaceKey) {
                        fingerElement.style.fill = window.getComputedStyle(spaceKey).backgroundColor;
                    }
                } else { // Para el resto de las teclas...
                    const keyGroup = getGroupForKey(diacriticInfo ? diacriticInfo.base : nextChar);
                    const keyWithGroup = document.querySelector(`.key[data-key-group="group-${keyGroup}"]`);
                    if (keyWithGroup) {
                        fingerElement.style.fill = window.getComputedStyle(keyWithGroup).backgroundColor;
                    }
                }
            }
        }
        
      function updateSampleTextPosition() {
            const spans = textoMuestraElement.querySelectorAll("span");
            if (spans.length === 0) return;

            const currentSpan = spans[entradaUsuario.value.length] || spans[spans.length - 1];
            if (!currentSpan) return;

            // Usamos offsetLeft, que es estable y no depende de la posición del contenedor
            const spanCenter = currentSpan.offsetLeft + (currentSpan.offsetWidth / 2);
            
            const newLeft = (sampleContainer.clientWidth / 2) - spanCenter;

            textoMuestraElement.style.left = `${newLeft}px`;
        }

        function calcularResultados(segundos) {
            if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
            liveStatsIntervalId = null;

            const typedText = entradaUsuario.value;
            let errores = 0;
            sampleText.forEach((char, i) => {
                if (i < typedText.length && typedText[i] !== char) errores++;
            });

            const minutos = segundos / 60;
            const precision = sampleText.length > 0 ? (typedText.length - errores) / typedText.length * 100 : 0;
            const netPPM = Math.max(0, Math.round((typedText.length - errores) / minutos));

            // Preparamos el objeto con TODOS los datos a guardar
            const datosResultado = {
                ppm: netPPM,
                precision: parseFloat(precision.toFixed(1)),
                errores: errores,
                correcciones: correcciones,
                duracion: parseFloat(segundos.toFixed(1)),
                mapaErrores: Object.entries(mapaErrores),
                mapaErroresAnterior: Object.entries(mapaErroresAnterior),
                mapaErroresPosterior: Object.entries(mapaErroresPosterior)
            };
            
            // Llamamos a la función para que guarde todo en la base de datos
            guardarResultado(datosResultado);

            // Actualizamos el modal (sin los errores detallados, que ya no están aquí)
            modalTiempo.textContent = segundos.toFixed(1);
            modalNetPPM.textContent = netPPM;
            modalPrecision.textContent = Math.max(0, precision).toFixed(1);
            modalErrors.textContent = errores;
            
            let estrellas = 0;
            if (precision >= 98 && netPPM >= 250) estrellas = 3;
            else if (precision >= 95 && netPPM >= 175) estrellas = 2;
            else if (precision >= 90 && netPPM >= 100) estrellas = 1;

            starRating.innerHTML = '';
            if (estrellas > 0) {
                for (let i = 0; i < estrellas; i++) {
                    const delay = i * 400;
                    const starSpan = document.createElement('span');
                    starSpan.className = 'star';
                    starSpan.textContent = '⭐';
                    starSpan.style.animationDelay = `${delay / 1000}s`;
                    starRating.appendChild(starSpan);
                    setTimeout(() => { playSound(audioEstrella); }, delay + 500);
                }
            }
            resultsModal.style.display = 'flex';
        }

        function reiniciarEjercicio() {
            liveCorrectionsElement.textContent = '0';
            liveTopErrorsElement.textContent = '-';
            correcciones = 0;
            mapaErrores = {};
            isWaitingForVowel = false;
            if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
            liveStatsIntervalId = null;
            livePpmElement.textContent = '0';
            liveAccuracyElement.textContent = '100';
            resultsModal.style.display = 'none';
            entradaUsuario.value = '';
            entradaUsuario.disabled = false;
            timerIniciado = false;
            tiempoInicio = null;
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            document.getElementById('keyboard-container').classList.remove('foco-activo');
            cargarNuevoTexto();
            entradaUsuario.focus();
        }

        function repetirEjercicioActual() {
            liveCorrectionsElement.textContent = '0';
            liveTopErrorsElement.textContent = '-';
            correcciones = 0;
            mapaErrores = {};
            isWaitingForVowel = false;
            if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
            liveStatsIntervalId = null;
            livePpmElement.textContent = '0';
            liveAccuracyElement.textContent = '100';
            resultsModal.style.display = 'none';
            entradaUsuario.value = '';
            entradaUsuario.disabled = false;
            timerIniciado = false;
            tiempoInicio = null;
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            document.getElementById('keyboard-container').classList.remove('foco-activo');
            updateHighlighting();
            updateSampleTextPosition();
            entradaUsuario.focus();
        }

        async function guardarResultado(datos) {
            const usuario = auth.currentUser;
            if (!usuario) {
                console.log("No hay usuario conectado. No se guardan los resultados.");
                return;
            }
            try {
                await addDoc(collection(db, "resultados"), {
                    userId: usuario.uid,
                    timestamp: serverTimestamp(),
                    ppm: datos.ppm,
                    precision: datos.precision,
                    errores: datos.errores,
                    correcciones: datos.correcciones,
                    duracion: datos.duracion,
                    mapaErrores: Object.fromEntries(datos.mapaErrores),
                    mapaErroresAnterior: Object.fromEntries(datos.mapaErroresAnterior),
                    mapaErroresPosterior: Object.fromEntries(datos.mapaErroresPosterior)
                });
                console.log("Resultado detallado guardado en Firestore.");
            } catch (e) {
                console.error("Error al guardar el resultado: ", e);
            }
        }

        // =================================================================
        // SECCIÓN 4: EVENT LISTENERS (ESCUCHADORES DE EVENTOS)
        // =================================================================
        const musicToggleButton = document.getElementById('music-toggle-button');

        musicToggleButton.addEventListener('click', () => {
            isMusicPlaying = !isMusicPlaying; // Invertimos el estado

            if (isMusicPlaying) {
                backgroundMusic.play();
                musicToggleButton.textContent = '🔊'; // Cambiamos el icono a "sonando"
            } else {
                backgroundMusic.pause();
                musicToggleButton.textContent = '🔇'; // Cambiamos el icono a "silencio"
            }
        });

        entradaUsuario.addEventListener('input', (event) => {
            if (!timerIniciado && entradaUsuario.value.length > 0) {
                timerIniciado = true;
                tiempoInicio = Date.now();
                if (liveStatsIntervalId) clearInterval(liveStatsIntervalId);
                liveStatsIntervalId = setInterval(actualizarEstadisticasEnVivo, 1000);
            }
            const typedValue = entradaUsuario.value;
            const lastCharIndex = typedValue.length - 1;

            if (event.inputType === 'insertText') {
                if (typedValue[lastCharIndex] === sampleText[lastCharIndex]) {
                    playSound(audioTecleo);
                } else {
                    playSound(audioError);
                    sampleContainer.classList.add('shake');
                    setTimeout(() => { sampleContainer.classList.remove('shake'); }, 500);

                    const charFallado = sampleText[lastCharIndex];
                    if (charFallado) { 
                        mapaErrores[charFallado] = (mapaErrores[charFallado] || 0) + 1;

                        const charAnterior = sampleText[lastCharIndex - 1];
                        if (charAnterior) {
                            const binomioAnterior = charAnterior + charFallado;
                            mapaErroresAnterior[binomioAnterior] = (mapaErroresAnterior[binomioAnterior] || 0) + 1;
                        }
                        const charPosterior = sampleText[lastCharIndex + 1];
                        if (charPosterior) {
                            const binomioPosterior = charFallado + charPosterior;
                            mapaErroresPosterior[binomioPosterior] = (mapaErroresPosterior[binomioPosterior] || 0) + 1;
                        }
                    }
                }
            }
            const lastChar = typedValue.slice(-1);
            const finger = getFingerForKey(lastChar);
            if (finger?.includes("left")) lastHandUsed = "left";
            if (finger?.includes("right")) lastHandUsed = "right";
            const porcentaje = Math.min(typedValue.length / sampleText.length * 100, 100);
            progressBar.style.width = `${porcentaje}%`;
            progressText.textContent = `${Math.round(porcentaje)}%`;
            updateHighlighting();
            updateSampleTextPosition();

            if (typedValue.length === sampleText.length) {
                const tiempoTranscurrido = (Date.now() - tiempoInicio) / 1000;
                entradaUsuario.disabled = true;
                timerIniciado = false;
                calcularResultados(tiempoTranscurrido);
            }
        });

        entradaUsuario.addEventListener("keydown", (event) => {
            // Lógica para las tildes (sin cambios)
            const nextChar = sampleText[entradaUsuario.value.length];
            const diacriticInfo = diacriticMap[nextChar];
            if (diacriticInfo && !isWaitingForVowel && event.key === 'Dead') { /*...*/ return; }
            if (isWaitingForVowel) { isWaitingForVowel = false; }

            // --- LÓGICA PARA CONTAR CORRECCIONES ---
            if (event.key === 'Backspace') {
                playSound(audioBorrado);
                
                const indexABorrar = entradaUsuario.value.length - 1;
                if (indexABorrar >= 0) {
                    const charBorrado = entradaUsuario.value[indexABorrar];
                    const charCorrecto = sampleText[indexABorrar];
                    // Si el carácter que borramos era un error, lo contamos como corrección
                    if (charBorrado !== charCorrecto) {
                        correcciones++;
                    }
                }
            }
            // --- FIN DE LA LÓGICA ---

            // Lógica para CapsLock (sin cambios)
            const capsLockKey = document.querySelector('.key[data-key="CAPSLOCK"]');
            if (event.getModifierState && capsLockKey) {
                capsLockKey.classList.toggle("active", event.getModifierState("CapsLock"));
            }
        });

        closeModal.addEventListener('click', reiniciarEjercicio);
        repeatButton.addEventListener('click', repetirEjercicioActual);

        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                toggleStatsPanel();
            }
        });

        // =================================================================
        // SECCIÓN 5: INICIALIZACIÓN DE LA APLICACIÓN
        // =================================================================
        
        async function init() {
            createKeyboard();
            makeDraggable(liveStatsContainer);
            await reiniciarEjercicio();
            document.body.addEventListener('click', e => {
                if (!e.target.closest('.modal-content') && !e.target.closest('#user-menu-button') && !e.target.closest('#live-stats-container')) {
                    entradaUsuario.focus();
                }
            }, true);
            window.addEventListener('resize', updateSampleTextPosition);
        }
        // --- LÓGICA DEL TEMA OSCURO/CLARO ---
        const themeToggle = document.getElementById('theme-toggle');

        // Función para aplicar el tema (añade o quita la clase .dark-theme del body)
        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        };

        // Al cargar la página, comprobamos las preferencias
        const initializeTheme = () => {
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (savedTheme) { // 1. Primero, miramos si el usuario ya eligió un tema
                applyTheme(savedTheme);
            } else if (systemPrefersDark) { // 2. Si no, respetamos la configuración del sistema
                applyTheme('dark');
            } else { // 3. Por defecto, aplicamos el tema claro
                applyTheme('light');
            }
        };

        // Evento para el botón del interruptor
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-theme');
            const newTheme = isDark ? 'light' : 'dark';
            applyTheme(newTheme);
            // Guardamos la elección del usuario para que la recuerde en su próxima visita
            localStorage.setItem('theme', newTheme);
        });

        // Inicializamos el tema al cargar la página
        initializeTheme();


        init();