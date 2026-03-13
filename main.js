// main.js — Campo de Batalla: simulación autónoma de facciones
// Puerto a navegador del juego original en Java.

// ============================================================
//  Constantes y configuración
// ============================================================

const ANCHO = 30;
const ALTO  = 30;

// Tamaño de cada celda en píxeles
const TAM_CELDA = 18;

// Tipos de entidad
const VACIO     = ' ';
const BUENO     = 'Ö';
const MALO      = 'Ü';
const OBS_X     = 'X';
const OBS_O     = 'O';
const OBS_Z     = 'Z';

const OBSTACULOS  = [OBS_X, OBS_O, OBS_Z];
const PERSONAJES  = [BUENO, MALO];

// Radio de detección para perseguir/huir
const RADIO_DETECCION = 4;

// Colores para el canvas
const COLORES = {
    fondo:     '#181c26',
    rejilla:   '#1e2230',
    bueno:     '#f5c542',
    malo:      '#e84545',
    obsX:      '#4a5068',
    obsO:      '#3d4460',
    obsZ:      '#565c78',
    textoObs:  '#8890a8',
};

// ============================================================
//  Estado del juego
// ============================================================

let tablero = [];      // matriz ALTO × ANCHO
let corriendo = false;
let temporizador = null;
let turno = 0;
let intervaloMs = 120;

// ============================================================
//  Referencias al DOM
// ============================================================

const canvas       = document.getElementById('tablero');
const ctx          = canvas.getContext('2d');
const btnInicio    = document.getElementById('btn-inicio');
const btnPausa     = document.getElementById('btn-pausa');
const btnReiniciar = document.getElementById('btn-reiniciar');
const sliderVel    = document.getElementById('velocidad');
const lblVel       = document.getElementById('vel-valor');
const contBuenos   = document.getElementById('cont-buenos');
const contMalos    = document.getElementById('cont-malos');
const contTurno    = document.getElementById('cont-turno');
const msgFinal     = document.getElementById('mensaje-final');

// Dimensionar canvas
canvas.width  = ANCHO * TAM_CELDA;
canvas.height = ALTO  * TAM_CELDA;

// ============================================================
//  Utilidades
// ============================================================

/** Número entero aleatorio en [0, max) */
function randInt(max) {
    return Math.floor(Math.random() * max);
}

/** Mezcla un array in-place (Fisher–Yates) */
function mezclar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function esPersonaje(tipo) {
    return tipo === BUENO || tipo === MALO;
}

function esObstaculo(tipo) {
    return tipo === OBS_X || tipo === OBS_O || tipo === OBS_Z;
}

function dentroLimites(fila, col) {
    return fila >= 0 && fila < ALTO && col >= 0 && col < ANCHO;
}

// ============================================================
//  Creación del tablero
// ============================================================

function crearTablero() {
    const t = [];
    for (let f = 0; f < ALTO; f++) {
        const fila = [];
        for (let c = 0; c < ANCHO; c++) {
            fila.push(crearEntidad());
        }
        t.push(fila);
    }
    return t;
}

/**
 * Crea una entidad aleatoria.
 * ~85 % vacío, ~7.5 % personaje, ~7.5 % obstáculo.
 */
function crearEntidad() {
    const r = Math.random();
    if (r < 0.85) return { tipo: VACIO };
    if (r < 0.925) {
        return { tipo: Math.random() < 0.5 ? BUENO : MALO, movido: false, peleado: false };
    }
    const obs = OBSTACULOS[randInt(3)];
    return { tipo: obs };
}

// ============================================================
//  Renderizado con canvas
// ============================================================

function dibujarTablero() {
    ctx.fillStyle = COLORES.fondo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let f = 0; f < ALTO; f++) {
        for (let c = 0; c < ANCHO; c++) {
            const x = c * TAM_CELDA;
            const y = f * TAM_CELDA;
            const ent = tablero[f][c];

            // Rejilla sutil
            ctx.strokeStyle = COLORES.rejilla;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, TAM_CELDA, TAM_CELDA);

            if (ent.tipo === VACIO) continue;

            if (ent.tipo === BUENO) {
                // Círculo amarillo con brillo
                ctx.fillStyle = COLORES.bueno;
                ctx.beginPath();
                ctx.arc(x + TAM_CELDA / 2, y + TAM_CELDA / 2, TAM_CELDA * 0.35, 0, Math.PI * 2);
                ctx.fill();
            } else if (ent.tipo === MALO) {
                // Rombo rojo
                const cx = x + TAM_CELDA / 2;
                const cy = y + TAM_CELDA / 2;
                const r  = TAM_CELDA * 0.35;
                ctx.fillStyle = COLORES.malo;
                ctx.beginPath();
                ctx.moveTo(cx, cy - r);
                ctx.lineTo(cx + r, cy);
                ctx.lineTo(cx, cy + r);
                ctx.lineTo(cx - r, cy);
                ctx.closePath();
                ctx.fill();
            } else if (esObstaculo(ent.tipo)) {
                // Cuadrado gris con letra
                const margen = 2;
                ctx.fillStyle = ent.tipo === OBS_X ? COLORES.obsX
                              : ent.tipo === OBS_O ? COLORES.obsO
                              : COLORES.obsZ;
                ctx.fillRect(x + margen, y + margen, TAM_CELDA - margen * 2, TAM_CELDA - margen * 2);
                ctx.fillStyle = COLORES.textoObs;
                ctx.font = `bold ${TAM_CELDA * 0.55}px 'JetBrains Mono', monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ent.tipo, x + TAM_CELDA / 2, y + TAM_CELDA / 2 + 1);
            }
        }
    }
}

// ============================================================
//  Lógica de juego
// ============================================================

/** Todas las 8 direcciones */
const DIRECCIONES = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
];

/**
 * Busca el enemigo más cercano dentro de un radio dado.
 * Devuelve {fila, col} o null.
 */
function buscarEnemigo(fila, col, tipoPropio, radio) {
    let mejorDist = Infinity;
    let mejor = null;

    for (let df = -radio; df <= radio; df++) {
        for (let dc = -radio; dc <= radio; dc++) {
            if (df === 0 && dc === 0) continue;
            const nf = fila + df;
            const nc = col + dc;
            if (!dentroLimites(nf, nc)) continue;
            const vecino = tablero[nf][nc].tipo;
            if (esPersonaje(vecino) && vecino !== tipoPropio) {
                const dist = Math.abs(df) + Math.abs(dc);
                if (dist < mejorDist) {
                    mejorDist = dist;
                    mejor = { fila: nf, col: nc };
                }
            }
        }
    }
    return mejor;
}

/**
 * Resuelve combates entre personajes adyacentes.
 * Se usa un coin-flip: el perdedor es eliminado.
 */
function resolverPeleas() {
    for (let f = 0; f < ALTO; f++) {
        for (let c = 0; c < ANCHO; c++) {
            const ent = tablero[f][c];
            if (!esPersonaje(ent.tipo) || ent.peleado) continue;

            const enemigo = buscarEnemigo(f, c, ent.tipo, 1);
            if (!enemigo) continue;

            const entEnemigo = tablero[enemigo.fila][enemigo.col];
            if (entEnemigo.peleado) continue;

            // Coin flip
            if (Math.random() < 0.5) {
                tablero[f][c] = { tipo: VACIO };
            } else {
                tablero[enemigo.fila][enemigo.col] = { tipo: VACIO };
            }

            // Marcar como peleados (al superviviente)
            if (tablero[f][c].tipo !== VACIO) tablero[f][c].peleado = true;
            if (tablero[enemigo.fila][enemigo.col].tipo !== VACIO) {
                tablero[enemigo.fila][enemigo.col].peleado = true;
            }
        }
    }
}

/**
 * Mover un personaje aleatoriamente a una celda vecina vacía.
 */
function moverAleatorio(fila, col) {
    const dirs = mezclar([...DIRECCIONES]);
    for (const [df, dc] of dirs) {
        const nf = fila + df;
        const nc = col + dc;
        if (dentroLimites(nf, nc) && tablero[nf][nc].tipo === VACIO) {
            tablero[nf][nc] = tablero[fila][col];
            tablero[nf][nc].movido = true;
            tablero[fila][col] = { tipo: VACIO };
            return;
        }
    }
}

/**
 * Mover un personaje en una dirección concreta (perseguir o huir).
 * - Los "buenos" (Ö) huyen del enemigo.
 * - Los "malos" (Ü) persiguen al enemigo.
 */
function moverHaciaODesde(fila, col, enemigoPos) {
    const ent = tablero[fila][col];
    const df = enemigoPos.fila - fila;
    const dc = enemigoPos.col - col;

    // Dirección normalizada hacia el enemigo
    let pasoF = df > 0 ? 1 : (df < 0 ? -1 : 0);
    let pasoC = dc > 0 ? 1 : (dc < 0 ? -1 : 0);

    // Los buenos huyen (invertir dirección)
    if (ent.tipo === BUENO) {
        pasoF = -pasoF;
        pasoC = -pasoC;
    }
    // Los malos persiguen (la dirección ya es correcta)

    const nf = fila + pasoF;
    const nc = col + pasoC;

    if (dentroLimites(nf, nc) && tablero[nf][nc].tipo === VACIO) {
        tablero[nf][nc] = tablero[fila][col];
        tablero[nf][nc].movido = true;
        tablero[fila][col] = { tipo: VACIO };
        return;
    }

    // Si la diagonal está bloqueada, intentar solo fila o solo columna
    const intentos = mezclar([
        { f: fila + pasoF, c: col },
        { f: fila, c: col + pasoC },
    ]);
    for (const intento of intentos) {
        if (dentroLimites(intento.f, intento.c) && tablero[intento.f][intento.c].tipo === VACIO) {
            tablero[intento.f][intento.c] = tablero[fila][col];
            tablero[intento.f][intento.c].movido = true;
            tablero[fila][col] = { tipo: VACIO };
            return;
        }
    }
}

/**
 * Ejecuta un turno completo del juego.
 */
function ejecutarTurno() {
    turno++;

    // 1. Resolver peleas adyacentes
    resolverPeleas();

    // 2. Recopilar posiciones de personajes y mezclar orden
    const posiciones = [];
    for (let f = 0; f < ALTO; f++) {
        for (let c = 0; c < ANCHO; c++) {
            if (esPersonaje(tablero[f][c].tipo)) {
                posiciones.push({ fila: f, col: c });
            }
        }
    }
    mezclar(posiciones);

    // 3. Mover cada personaje
    for (const pos of posiciones) {
        const ent = tablero[pos.fila][pos.col];
        if (!esPersonaje(ent.tipo) || ent.movido) continue;

        const enemigo = buscarEnemigo(pos.fila, pos.col, ent.tipo, RADIO_DETECCION);

        if (enemigo) {
            moverHaciaODesde(pos.fila, pos.col, enemigo);
        } else {
            moverAleatorio(pos.fila, pos.col);
        }
    }

    // 4. Limpiar banderas de turno
    for (let f = 0; f < ALTO; f++) {
        for (let c = 0; c < ANCHO; c++) {
            const ent = tablero[f][c];
            if (ent.movido !== undefined) ent.movido = false;
            if (ent.peleado !== undefined) ent.peleado = false;
        }
    }

    // 5. Dibujar y actualizar estadísticas
    dibujarTablero();
    actualizarEstadisticas();
}

// ============================================================
//  Estadísticas y condición de fin
// ============================================================

function contarEntidades() {
    let buenos = 0, malos = 0;
    for (let f = 0; f < ALTO; f++) {
        for (let c = 0; c < ANCHO; c++) {
            if (tablero[f][c].tipo === BUENO) buenos++;
            else if (tablero[f][c].tipo === MALO) malos++;
        }
    }
    return { buenos, malos };
}

function actualizarEstadisticas() {
    const { buenos, malos } = contarEntidades();
    contBuenos.textContent = buenos;
    contMalos.textContent  = malos;
    contTurno.textContent  = turno;

    // Condición de fin: una facción eliminada completamente
    if (buenos === 0 || malos === 0) {
        detenerJuego();

        msgFinal.classList.remove('oculto', 'victoria-buenos', 'victoria-malos', 'empate');

        if (buenos === 0 && malos === 0) {
            msgFinal.textContent = '¡Empate! Ambas facciones se han eliminado.';
            msgFinal.classList.add('empate');
        } else if (buenos === 0) {
            msgFinal.textContent = `¡Victoria de los Agresivos (Ü)! Sobreviven ${malos} unidades en ${turno} turnos.`;
            msgFinal.classList.add('victoria-malos');
        } else {
            msgFinal.textContent = `¡Victoria de los Pacíficos (Ö)! Sobreviven ${buenos} unidades en ${turno} turnos.`;
            msgFinal.classList.add('victoria-buenos');
        }
    }
}

// ============================================================
//  Control del bucle de juego
// ============================================================

function iniciarJuego() {
    if (corriendo) return;
    corriendo = true;
    msgFinal.classList.add('oculto');
    btnInicio.disabled = true;
    btnPausa.disabled  = false;
    temporizador = setInterval(ejecutarTurno, intervaloMs);
}

function pausarJuego() {
    if (!corriendo) return;
    corriendo = false;
    clearInterval(temporizador);
    temporizador = null;
    btnInicio.disabled = false;
    btnPausa.disabled  = true;
}

function detenerJuego() {
    corriendo = false;
    clearInterval(temporizador);
    temporizador = null;
    btnInicio.disabled = true;
    btnPausa.disabled  = true;
}

function reiniciarJuego() {
    detenerJuego();
    turno = 0;
    tablero = crearTablero();
    dibujarTablero();
    actualizarEstadisticas();
    msgFinal.classList.add('oculto');
    btnInicio.disabled = false;
    btnPausa.disabled  = true;
}

// ============================================================
//  Eventos
// ============================================================

btnInicio.addEventListener('click', iniciarJuego);
btnPausa.addEventListener('click', pausarJuego);
btnReiniciar.addEventListener('click', reiniciarJuego);

sliderVel.addEventListener('input', () => {
    intervaloMs = parseInt(sliderVel.value, 10);
    lblVel.textContent = `${intervaloMs}ms`;

    // Reajustar el intervalo si está corriendo
    if (corriendo) {
        clearInterval(temporizador);
        temporizador = setInterval(ejecutarTurno, intervaloMs);
    }
});

// ============================================================
//  Inicio
// ============================================================

tablero = crearTablero();
dibujarTablero();
actualizarEstadisticas();
