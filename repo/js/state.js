export let estadoLeccion = {
    id: null,
    datos: null,
    faseActualIndex: 0,
    progresoPorFase: {}, 
};

export let estadoEjercicio = {};

// Funciones para modificar el estado de forma segura desde otros archivos
export function setEstadoLeccion(nuevosDatos) {
    estadoLeccion = { ...estadoLeccion, ...nuevosDatos };
}

export function setEstadoEjercicio(nuevosDatos) {
    estadoEjercicio = { ...estadoEjercicio, ...nuevosDatos };
}

export function resetearEstadoEjercicio() {
    // Guardamos el perfil de usuario para que no se borre entre intentos
    const perfilUsuarioAnterior = estadoEjercicio.perfilUsuario || {};

    // Usamos nuestro 'setter' para actualizar el estado
    setEstadoEjercicio({
        tipo: null,
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
        idTemporizador: null,
        idTimerUI: null,
        tiemposDePulsacion: [],
        haRecibidoPrimeraAdvertencia: false,
        advertenciaPrecisionMostrada: false,
        pulsacionesEnCooldown: 0,
        perfilUsuario: perfilUsuarioAnterior // Lo restauramos
    });
}