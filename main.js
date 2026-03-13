// main.js — Campo de Batalla
// Simulación de combate por turnos: Aliados (Ö) vs Enemigos (Ü)

"use strict";

// ══════════════════════════════════════════════════════════
// MÓDULO: Sistema de menú y navegación de pantallas
// ══════════════════════════════════════════════════════════
const Menu = (() => {

    // ── Definición de modos de juego ─────────────────────
    // Para añadir más modos, simplemente agregar objetos a este array.
    // Cada modo tiene un id único, nombre visible, descripción, y
    // opcionalmente un objeto config que sobreescribe valores de CONFIG.
    const MODOS = [
        {
            id: "clasico",
            nombre: "Clásico",
            descripcion: "Dos bandos luchan en una cuadrícula 30×30. Los aliados huyen, los enemigos persiguen. Último en pie gana.",
            config: {}
        },
        // ── Modos futuros (descomentar o añadir para expandir) ──
        // {
        //     id: "caos",
        //     nombre: "Caos Total",
        //     descripcion: "Más personajes, menos obstáculos, velocidad al máximo.",
        //     config: { PROB_VACIO: 0.70, PROB_PERSONAJE: 0.15 }
        // },
        // {
        //     id: "arena",
        //     nombre: "Arena Pequeña",
        //     descripcion: "Tablero reducido 15×15 con combates rápidos e intensos.",
        //     config: { ANCHO: 15, ALTO: 15 }
        // },
    ];

    let indiceActual = 0;

    // ── Referencias al DOM ───────────────────────────────
    const pantallaTitulo = document.getElementById("pantalla-titulo");
    const pantallaModos  = document.getElementById("pantalla-modos");
    const pantallaJuego  = document.getElementById("pantalla-juego");

    const elNombre       = document.getElementById("modo-nombre");
    const elDescripcion  = document.getElementById("modo-descripcion");
    const elIndicadores  = document.getElementById("modos-indicadores");
    const btnPrev        = document.getElementById("btn-modo-prev");
    const btnNext        = document.getElementById("btn-modo-next");
    const btnJugar       = document.getElementById("btn-jugar");
    const btnMenuVolver  = document.getElementById("btn-menu");

    // ── Cambio de pantalla ───────────────────────────────
    function mostrarPantalla(pantalla) {
        document.querySelectorAll(".pantalla").forEach(p => {
            p.classList.remove("activa");
        });
        pantalla.classList.add("activa");
    }

    // ── Renderizar modo actual ───────────────────────────
    function renderizarModo() {
        const modo = MODOS[indiceActual];
        elNombre.textContent = modo.nombre;
        elDescripcion.textContent = modo.descripcion;

        // Actualizar dots indicadores
        const dots = elIndicadores.querySelectorAll(".indicador-dot");
        dots.forEach((dot, i) => {
            dot.classList.toggle("activo", i === indiceActual);
        });
    }

    // ── Crear dots indicadores ───────────────────────────
    function crearIndicadores() {
        elIndicadores.innerHTML = "";
        MODOS.forEach((_, i) => {
            const dot = document.createElement("span");
            dot.className = "indicador-dot" + (i === 0 ? " activo" : "");
            dot.addEventListener("click", () => {
                indiceActual = i;
                renderizarModo();
            });
            elIndicadores.appendChild(dot);
        });
    }

    // ── Navegación cíclica entre modos ───────────────────
    function modoPrev() {
        indiceActual = (indiceActual - 1 + MODOS.length) % MODOS.length;
        renderizarModo();
    }

    function modoNext() {
        indiceActual = (indiceActual + 1) % MODOS.length;
        renderizarModo();
    }

    // ── Confirmar modo y lanzar juego ────────────────────
    function confirmarModo() {
        const modoSeleccionado = MODOS[indiceActual];
        mostrarPantalla(pantallaJuego);
        startGame(modoSeleccionado);
    }

    // ── Volver al menú desde el juego ────────────────────
    function volverAlMenu() {
        detenerJuego();
        mostrarPantalla(pantallaModos);
    }

    // ── Inicialización ───────────────────────────────────
    function init() {
        crearIndicadores();
        renderizarModo();

        // Pantalla título → click lleva a selección de modo
        pantallaTitulo.addEventListener("click", () => {
            mostrarPantalla(pantallaModos);
        });

        // Flechas de navegación
        btnPrev.addEventListener("click", modoPrev);
        btnNext.addEventListener("click", modoNext);

        // Navegación con teclado en pantalla de modos
        document.addEventListener("keydown", (e) => {
            if (!pantallaModos.classList.contains("activa")) return;
            if (e.key === "ArrowLeft")  modoPrev();
            if (e.key === "ArrowRight") modoNext();
            if (e.key === "Enter")      confirmarModo();
        });

        // Botón jugar
        btnJugar.addEventListener("click", confirmarModo);

        // Botón volver al menú desde el juego
        btnMenuVolver.addEventListener("click", volverAlMenu);
    }

    return { init };
})();


// ══════════════════════════════════════════════════════════
// Configuración del juego
// ══════════════════════════════════════════════════════════
const CONFIG = {
    ANCHO: 30,
    ALTO: 30,
    PROB_VACIO: 0.85,
    PROB_PERSONAJE: 0.05,
    RADIO_DETECCION: 4,
    TAMANO_CELDA: 20,
};

// Valores base para poder restaurar al cambiar de modo
const CONFIG_BASE = { ...CONFIG };

// Tipos de celda
const TIPO = {
    VACIO: 0,
    ALIADO: 1,
    ENEMIGO: 2,
    OBSTACULO_X: 3,
    OBSTACULO_O: 4,
    OBSTACULO_Z: 5,
};

// ══════════════════════════════════════════════════════════
// Estado del juego
// ══════════════════════════════════════════════════════════
let tablero = [];
let movidoEsteTurno = [];
let turno = 0;
let intervaloId = null;
let velocidad = 100;
let juegoActivo = false;

// ══════════════════════════════════════════════════════════
// Referencias al DOM del juego
// ══════════════════════════════════════════════════════════
const canvas = document.getElementById("tablero");
const ctx = canvas.getContext("2d");
const elAliados = document.getElementById("cuenta-aliados");
const elEnemigos = document.getElementById("cuenta-enemigos");
const elTurno = document.getElementById("cuenta-turno");
const btnIniciar = document.getElementById("btn-iniciar");
const btnPausar = document.getElementById("btn-pausar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const rangoVelocidad = document.getElementById("rango-velocidad");
const textoVelocidad = document.getElementById("texto-velocidad");
const mensajeFinal = document.getElementById("mensaje-final");

// ══════════════════════════════════════════════════════════
// Punto de entrada: llamado por el menú al confirmar modo
// ══════════════════════════════════════════════════════════

/**
 * Arranca (o reinicia) el juego con el modo seleccionado.
 * @param {Object} modo — objeto del array MODOS con id, nombre y config
 */
function startGame(modo) {
    // Restaurar config base y aplicar overrides del modo
    Object.assign(CONFIG, CONFIG_BASE, modo.config || {});

    turno = 0;
    velocidad = parseInt(rangoVelocidad.value);
    ocultarMensaje();
    crearTablero();
    ajustarCanvas();
    dibujarTablero();
    actualizarContadores();

    // Dejar los botones listos
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    juegoActivo = false;
}

// ══════════════════════════════════════════════════════════
// Inicialización del tablero
// ══════════════════════════════════════════════════════════

function crearTablero() {
    tablero = [];
    for (let i = 0; i < CONFIG.ALTO; i++) {
        const fila = [];
        for (let j = 0; j < CONFIG.ANCHO; j++) {
            fila.push(generarEntidad());
        }
        tablero.push(fila);
    }
}

function generarEntidad() {
    const r = Math.random();
    if (r < CONFIG.PROB_VACIO) return TIPO.VACIO;
    if (r < CONFIG.PROB_VACIO + CONFIG.PROB_PERSONAJE) {
        return Math.random() < 0.5 ? TIPO.ALIADO : TIPO.ENEMIGO;
    }
    const tiposObstaculo = [TIPO.OBSTACULO_X, TIPO.OBSTACULO_O, TIPO.OBSTACULO_Z];
    return tiposObstaculo[Math.floor(Math.random() * 3)];
}

function reiniciarMovidos() {
    movidoEsteTurno = [];
    for (let i = 0; i < CONFIG.ALTO; i++) {
        movidoEsteTurno.push(new Array(CONFIG.ANCHO).fill(false));
    }
}

// ══════════════════════════════════════════════════════════
// Lógica de turno
// ══════════════════════════════════════════════════════════

function ejecutarTurno() {
    turno++;
    reiniciarMovidos();

    resolverCombates();

    const posiciones = obtenerPosicionesPersonajes();
    mezclarArray(posiciones);

    for (const pos of posiciones) {
        const tipo = tablero[pos.i][pos.j];
        if (!esPersonaje(tipo) || movidoEsteTurno[pos.i][pos.j]) continue;

        const enemigoCercano = buscarEnemigo(pos.i, pos.j, tipo, CONFIG.RADIO_DETECCION);

        if (enemigoCercano) {
            moverHaciaODesde(pos.i, pos.j, tipo, enemigoCercano);
        } else {
            moverAleatorio(pos.i, pos.j);
        }
    }

    dibujarTablero();
    actualizarContadores();
    comprobarFinDelJuego();
}

function resolverCombates() {
    const haPeleado = [];
    for (let i = 0; i < CONFIG.ALTO; i++) {
        haPeleado.push(new Array(CONFIG.ANCHO).fill(false));
    }

    for (let i = 0; i < CONFIG.ALTO; i++) {
        for (let j = 0; j < CONFIG.ANCHO; j++) {
            const tipo = tablero[i][j];
            if (!esPersonaje(tipo) || haPeleado[i][j]) continue;

            const enemigo = buscarEnemigo(i, j, tipo, 1);
            if (enemigo && !haPeleado[enemigo.i][enemigo.j]) {
                if (Math.random() < 0.5) {
                    tablero[i][j] = TIPO.VACIO;
                } else {
                    tablero[enemigo.i][enemigo.j] = TIPO.VACIO;
                }
                haPeleado[i][j] = true;
                haPeleado[enemigo.i][enemigo.j] = true;
            }
        }
    }
}

function obtenerPosicionesPersonajes() {
    const lista = [];
    for (let i = 0; i < CONFIG.ALTO; i++) {
        for (let j = 0; j < CONFIG.ANCHO; j++) {
            if (esPersonaje(tablero[i][j])) {
                lista.push({ i, j });
            }
        }
    }
    return lista;
}

// ══════════════════════════════════════════════════════════
// Movimiento
// ══════════════════════════════════════════════════════════

const DIRECCIONES = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
];

function moverAleatorio(fi, fj) {
    const dirs = [...DIRECCIONES];
    mezclarArray(dirs);

    for (const [di, dj] of dirs) {
        const ni = fi + di;
        const nj = fj + dj;
        if (dentroDelTablero(ni, nj) && tablero[ni][nj] === TIPO.VACIO) {
            tablero[ni][nj] = tablero[fi][fj];
            tablero[fi][fj] = TIPO.VACIO;
            movidoEsteTurno[ni][nj] = true;
            return;
        }
    }
}

function moverHaciaODesde(fi, fj, tipo, enemigo) {
    const di = Math.sign(enemigo.i - fi);
    const dj = Math.sign(enemigo.j - fj);

    let pasoI, pasoJ;

    if (tipo === TIPO.ALIADO) {
        pasoI = -di;
        pasoJ = -dj;
    } else {
        pasoI = di;
        pasoJ = dj;
    }

    const ni = fi + pasoI;
    const nj = fj + pasoJ;

    if (dentroDelTablero(ni, nj) && tablero[ni][nj] === TIPO.VACIO) {
        tablero[ni][nj] = tablero[fi][fj];
        tablero[fi][fj] = TIPO.VACIO;
        movidoEsteTurno[ni][nj] = true;
    } else {
        moverAleatorio(fi, fj);
    }
}

// ══════════════════════════════════════════════════════════
// Detección de enemigos
// ══════════════════════════════════════════════════════════

function buscarEnemigo(fi, fj, tipoPropio, radio) {
    let mejorDist = Infinity;
    let mejorPos = null;

    for (let di = -radio; di <= radio; di++) {
        for (let dj = -radio; dj <= radio; dj++) {
            if (di === 0 && dj === 0) continue;
            const ni = fi + di;
            const nj = fj + dj;
            if (!dentroDelTablero(ni, nj)) continue;

            const vecino = tablero[ni][nj];
            if (esPersonaje(vecino) && vecino !== tipoPropio) {
                const dist = Math.abs(di) + Math.abs(dj);
                if (dist < mejorDist) {
                    mejorDist = dist;
                    mejorPos = { i: ni, j: nj };
                }
            }
        }
    }
    return mejorPos;
}

// ══════════════════════════════════════════════════════════
// Utilidades
// ══════════════════════════════════════════════════════════

function esPersonaje(tipo) {
    return tipo === TIPO.ALIADO || tipo === TIPO.ENEMIGO;
}

function esObstaculo(tipo) {
    return tipo === TIPO.OBSTACULO_X || tipo === TIPO.OBSTACULO_O || tipo === TIPO.OBSTACULO_Z;
}

function dentroDelTablero(i, j) {
    return i >= 0 && i < CONFIG.ALTO && j >= 0 && j < CONFIG.ANCHO;
}

function mezclarArray(arr) {
    for (let k = arr.length - 1; k > 0; k--) {
        const r = Math.floor(Math.random() * (k + 1));
        [arr[k], arr[r]] = [arr[r], arr[k]];
    }
}

function contarTipo(tipo) {
    let n = 0;
    for (let i = 0; i < CONFIG.ALTO; i++) {
        for (let j = 0; j < CONFIG.ANCHO; j++) {
            if (tablero[i][j] === tipo) n++;
        }
    }
    return n;
}

// ══════════════════════════════════════════════════════════
// Renderizado con Canvas
// ══════════════════════════════════════════════════════════

function ajustarCanvas() {
    const rect = canvas.getBoundingClientRect();
    const tamano = Math.floor(rect.width);
    canvas.width = tamano;
    canvas.height = tamano;
    CONFIG.TAMANO_CELDA = tamano / CONFIG.ANCHO;
}

function dibujarTablero() {
    const tam = CONFIG.TAMANO_CELDA;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < CONFIG.ALTO; i++) {
        for (let j = 0; j < CONFIG.ANCHO; j++) {
            const x = j * tam;
            const y = i * tam;

            ctx.fillStyle = (i + j) % 2 === 0 ? "#13131d" : "#111119";
            ctx.fillRect(x, y, tam, tam);

            const tipo = tablero[i][j];

            if (tipo === TIPO.ALIADO) {
                dibujarPersonaje(x, y, tam, "#f5c842", "#ffe066", "Ö");
            } else if (tipo === TIPO.ENEMIGO) {
                dibujarPersonaje(x, y, tam, "#e84545", "#ff7070", "Ü");
            } else if (esObstaculo(tipo)) {
                dibujarObstaculo(x, y, tam, tipo);
            }
        }
    }
}

function dibujarPersonaje(x, y, tam, color, brillo, simbolo) {
    const centro = tam / 2;
    const gradiente = ctx.createRadialGradient(
        x + centro, y + centro, tam * 0.1,
        x + centro, y + centro, tam * 0.6
    );
    gradiente.addColorStop(0, brillo);
    gradiente.addColorStop(1, "transparent");
    ctx.fillStyle = gradiente;
    ctx.fillRect(x, y, tam, tam);

    ctx.fillStyle = color;
    ctx.font = `bold ${tam * 0.65}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(simbolo, x + centro, y + centro + 1);
}

function dibujarObstaculo(x, y, tam, tipo) {
    const centro = tam / 2;
    ctx.fillStyle = "#2a2a3a";
    ctx.font = `${tam * 0.5}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let simbolo;
    if (tipo === TIPO.OBSTACULO_X) simbolo = "✕";
    else if (tipo === TIPO.OBSTACULO_O) simbolo = "◯";
    else simbolo = "▣";

    ctx.fillText(simbolo, x + centro, y + centro + 1);
}

// ══════════════════════════════════════════════════════════
// UI y control del juego
// ══════════════════════════════════════════════════════════

function actualizarContadores() {
    elAliados.textContent = contarTipo(TIPO.ALIADO);
    elEnemigos.textContent = contarTipo(TIPO.ENEMIGO);
    elTurno.textContent = turno;
}

function comprobarFinDelJuego() {
    const aliados = contarTipo(TIPO.ALIADO);
    const enemigos = contarTipo(TIPO.ENEMIGO);

    if (aliados === 0 && enemigos === 0) {
        detenerJuego();
        mostrarMensaje("🤝 ¡Empate! Todos han caído.", "derrota");
    } else if (aliados === 0) {
        detenerJuego();
        mostrarMensaje("💀 ¡Los enemigos dominan el campo!", "derrota");
    } else if (enemigos === 0) {
        detenerJuego();
        mostrarMensaje("🏆 ¡Los aliados han vencido!", "victoria");
    }
}

function mostrarMensaje(texto, clase) {
    mensajeFinal.textContent = texto;
    mensajeFinal.className = clase;
}

function ocultarMensaje() {
    mensajeFinal.className = "oculto";
}

function iniciarJuego() {
    if (juegoActivo) return;
    juegoActivo = true;
    btnIniciar.disabled = true;
    btnPausar.disabled = false;
    intervaloId = setInterval(ejecutarTurno, velocidad);
}

function pausarJuego() {
    if (!juegoActivo) return;
    juegoActivo = false;
    clearInterval(intervaloId);
    intervaloId = null;
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
}

function detenerJuego() {
    juegoActivo = false;
    clearInterval(intervaloId);
    intervaloId = null;
    btnIniciar.disabled = true;
    btnPausar.disabled = true;
}

function reiniciarJuego() {
    detenerJuego();
    turno = 0;
    ocultarMensaje();
    crearTablero();
    ajustarCanvas();
    dibujarTablero();
    actualizarContadores();
    btnIniciar.disabled = false;
}

// ══════════════════════════════════════════════════════════
// Eventos del juego
// ══════════════════════════════════════════════════════════

btnIniciar.addEventListener("click", iniciarJuego);
btnPausar.addEventListener("click", pausarJuego);
btnReiniciar.addEventListener("click", reiniciarJuego);

rangoVelocidad.addEventListener("input", () => {
    velocidad = parseInt(rangoVelocidad.value);
    textoVelocidad.textContent = velocidad + "ms";
    if (juegoActivo) {
        clearInterval(intervaloId);
        intervaloId = setInterval(ejecutarTurno, velocidad);
    }
});

window.addEventListener("resize", () => {
    // Solo redimensionar si la pantalla de juego está activa
    if (document.getElementById("pantalla-juego").classList.contains("activa")) {
        ajustarCanvas();
        dibujarTablero();
    }
});

// ══════════════════════════════════════════════════════════
// Arranque — ya NO inicia el juego directamente,
// solo inicializa el sistema de menú
// ══════════════════════════════════════════════════════════
Menu.init();
