// main.js — Game Bar
// Sistema modular: Menú → Modos → Juego Clásico / Lotus of the Damned

"use strict";

// ══════════════════════════════════════════════════════════
// MÓDULO: Efectos de estado (funciones puras, testeables)
// ══════════════════════════════════════════════════════════
const Efectos = (() => {

    /**
     * Sangrado — daño progresivo al final del turno.
     * Aplica daño = acumulaciones, luego reduce a ceil(acum / 2).
     */
    function aplicarSangradoFinTurno(jefe) {
        const acum = jefe.efectos.sangrado;
        if (acum <= 0) return { dano: 0, nuevasAcum: 0 };
        const dano = acum;
        const nuevas = Math.ceil(acum / 2);
        return { dano, nuevasAcum: nuevas >= 1 ? nuevas : 0 };
    }

    /**
     * Ruptura — daño extra al recibir golpe.
     * Daño extra = acumulaciones, luego reduce en ceil(10% del actual).
     */
    function aplicarRupturaAlGolpe(jefe) {
        const acum = jefe.efectos.ruptura;
        if (acum <= 0) return { danoExtra: 0, nuevasAcum: 0 };
        const danoExtra = acum;
        const reduccion = Math.ceil(acum * 0.1);
        const nuevas = Math.max(0, acum - reduccion);
        return { danoExtra, nuevasAcum: nuevas };
    }

    /**
     * Choque — al llegar a 30, el jefe pierde 1 turno.
     * Retorna si el jefe debe ser stunneado.
     */
    function comprobarChoque(jefe) {
        if (jefe.efectos.choque >= 30) {
            return { stunned: true, nuevasAcum: 0 };
        }
        return { stunned: false, nuevasAcum: jefe.efectos.choque };
    }

    /**
     * Choque — cuando un aliado recibe daño, se reducen 5 acumulaciones.
     */
    function reducirChoquePorDanoAliado(jefe) {
        const nuevas = Math.max(0, jefe.efectos.choque - 5);
        return nuevas;
    }

    /**
     * Marchitamiento — reduce el daño del jefe.
     * Reducción = 0.1 * n %, máximo 99 acumulaciones.
     * Al final del turno pierde 2 acumulaciones.
     */
    function calcularReduccionMarchitamiento(acum) {
        const n = Math.min(acum, 99);
        return (0.1 * n) / 100; // Fracción decimal del porcentaje
    }

    function reducirMarchitamientoFinTurno(acum) {
        return Math.max(0, acum - 2);
    }

    /**
     * Fragilidad — el jefe recibe más daño.
     * Incremento = 0.1 * n %, máx 5% adicional.
     * Al final del turno pierde 2.
     */
    function calcularBonusFragilidad(acum) {
        const porcentaje = Math.min(0.1 * acum, 5);
        return porcentaje / 100; // Fracción decimal
    }

    function reducirFragilidadFinTurno(acum) {
        return Math.max(0, acum - 2);
    }

    /**
     * Marca — el siguiente ataque hace 15% más daño.
     * No es acumulable: activo/inactivo.
     */
    function calcularBonusMarca(marcaActiva) {
        return marcaActiva ? 0.15 : 0;
    }

    /**
     * Floración — al llegar a 20, explota.
     * Daño = 20 * 10% del ATK del último aplicador.
     */
    function comprobarFloracion(jefe) {
        if (jefe.efectos.floracion >= 20) {
            const atkAplicador = jefe.ultimoAplicadorFloracionATK || 0;
            const dano = Math.ceil(20 * 0.1 * atkAplicador);
            return { explota: true, dano, nuevasAcum: 0 };
        }
        return { explota: false, dano: 0, nuevasAcum: jefe.efectos.floracion };
    }

    return {
        aplicarSangradoFinTurno,
        aplicarRupturaAlGolpe,
        comprobarChoque,
        reducirChoquePorDanoAliado,
        calcularReduccionMarchitamiento,
        reducirMarchitamientoFinTurno,
        calcularBonusFragilidad,
        reducirFragilidadFinTurno,
        calcularBonusMarca,
        comprobarFloracion,
    };
})();


// ══════════════════════════════════════════════════════════
// MÓDULO: Datos de personajes
// ══════════════════════════════════════════════════════════
const PERSONAJES = [
    { id: "aiko",    nombre: "Aiko",    titulo: "la Espada Carmesí",        efecto: "sangrado",       atk: 45, hp: 120 },
    { id: "ren",     nombre: "Ren",     titulo: "el Cazador Silencioso",    efecto: "ruptura",        atk: 50, hp: 100 },
    { id: "meilin",  nombre: "Meilin",  titulo: "Sacerdotisa del Trueno",   efecto: "choque",         atk: 40, hp: 130 },
    { id: "katsuro", nombre: "Katsuro", titulo: "Guardia del Dragón",       efecto: "sangrado",       atk: 42, hp: 140 },
    { id: "hana",    nombre: "Hana",    titulo: "Flor Errante",             efecto: "marchitamiento", atk: 35, hp: 110 },
    { id: "jiro",    nombre: "Jiro",    titulo: "Espadachín del Crepúsculo",efecto: "ruptura",        atk: 55, hp: 90 },
    { id: "lian",    nombre: "Lian",    titulo: "Monje del Viento",         efecto: "fragilidad",     atk: 38, hp: 125 },
    { id: "sora",    nombre: "Sora",    titulo: "Bailarina de Loto",        efecto: "fragilidad",     atk: 36, hp: 115 },
    { id: "daichi",  nombre: "Daichi",  titulo: "Martillo de Jade",         efecto: "choque",         atk: 60, hp: 150 },
    { id: "yume",    nombre: "Yume",    titulo: "Oráculo de la Niebla",     efecto: "marca",          atk: 44, hp: 105 },
    { id: "takeda",  nombre: "Takeda",  titulo: "General Caído",            efecto: "sangrado",       atk: 48, hp: 135 },
    { id: "lotus",   nombre: "Lotus",   titulo: "Portador de Pétalos",      efecto: "floracion",      atk: 40, hp: 120 },
];

// Acumulaciones que aplica cada ataque por tipo de efecto
const ACUM_POR_GOLPE = {
    sangrado: 5,
    ruptura: 4,
    choque: 8,
    marchitamiento: 6,
    fragilidad: 5,
    marca: 1,     // Activa/desactiva
    floracion: 5,
};


// ══════════════════════════════════════════════════════════
// MÓDULO: Motor de combate (Lotus of the Damned)
// ══════════════════════════════════════════════════════════
const Combate = (() => {
    let jefe = null;
    let equipo = [];       // Personajes del jugador (con hp actual)
    let turno = 0;
    let pjActualIdx = 0;   // Índice del personaje que ataca ahora
    let combateActivo = false;

    function crearJefe() {
        return {
            nombre: "Lotus Guardian",
            hpMax: 2000,
            hp: 2000,
            atk: 30,
            efectos: {
                sangrado: 0,
                ruptura: 0,
                choque: 0,
                marchitamiento: 0,
                fragilidad: 0,
                marca: false,
                floracion: 0,
            },
            stunned: false,
            ultimoAplicadorFloracionATK: 0,
        };
    }

    function crearEquipo(personajesSeleccionados) {
        return personajesSeleccionados.map(p => ({
            ...p,
            hpActual: p.hp,
            vivo: true,
        }));
    }

    function iniciar(personajesSeleccionados) {
        jefe = crearJefe();
        equipo = crearEquipo(personajesSeleccionados);
        turno = 0;
        pjActualIdx = 0;
        combateActivo = true;
        avanzarAPersonajeVivo();
        renderUI();
        logMsg("¡El combate contra " + jefe.nombre + " comienza!", "log-turno");
    }

    function avanzarAPersonajeVivo() {
        let intentos = 0;
        while (intentos < equipo.length) {
            if (equipo[pjActualIdx].vivo) return;
            pjActualIdx = (pjActualIdx + 1) % equipo.length;
            intentos++;
        }
    }

    function obtenerVivos() {
        return equipo.filter(p => p.vivo);
    }

    // ── Turno del jugador: atacar con el personaje actual ──
    function atacar() {
        if (!combateActivo) return;
        const pj = equipo[pjActualIdx];
        if (!pj.vivo) return;

        // Calcular daño base
        let danoBase = pj.atk;

        // Bonus de Marca
        const bonusMarca = Efectos.calcularBonusMarca(jefe.efectos.marca);
        if (bonusMarca > 0) {
            danoBase = Math.ceil(danoBase * (1 + bonusMarca));
            jefe.efectos.marca = false;
            logMsg("💛 Marca consumida: +" + Math.round(bonusMarca * 100) + "% daño", "log-efecto");
        }

        // Bonus de Fragilidad
        const bonusFrag = Efectos.calcularBonusFragilidad(jefe.efectos.fragilidad);
        if (bonusFrag > 0) {
            danoBase = Math.ceil(danoBase * (1 + bonusFrag));
        }

        // Daño extra de Ruptura
        const ruptRes = Efectos.aplicarRupturaAlGolpe(jefe);
        jefe.efectos.ruptura = ruptRes.nuevasAcum;
        const danoTotal = danoBase + ruptRes.danoExtra;

        jefe.hp = Math.max(0, jefe.hp - danoTotal);

        let msg = `⚔️ ${pj.nombre} ataca por ${danoBase} daño`;
        if (ruptRes.danoExtra > 0) msg += ` (+${ruptRes.danoExtra} Ruptura)`;
        logMsg(msg, "log-dano");

        // Aplicar efecto del personaje
        aplicarEfecto(pj);

        // Comprobar floración
        const florRes = Efectos.comprobarFloracion(jefe);
        if (florRes.explota) {
            jefe.hp = Math.max(0, jefe.hp - florRes.dano);
            jefe.efectos.floracion = florRes.nuevasAcum;
            logMsg(`🌸 ¡Floración explota! ${florRes.dano} daño adicional`, "log-efecto");
        }

        // Comprobar victoria
        if (jefe.hp <= 0) {
            combateActivo = false;
            logMsg("🏆 ¡Victoria! " + jefe.nombre + " ha sido derrotado.", "log-victoria");
            renderUI();
            document.getElementById("btn-atacar").disabled = true;
            return;
        }

        // Avanzar al siguiente personaje
        pjActualIdx = (pjActualIdx + 1) % equipo.length;
        avanzarAPersonajeVivo();

        // Si hemos dado la vuelta completa → fin de ronda
        if (pjActualIdx === 0 || todosMuertos()) {
            finDeRonda();
        }

        renderUI();
    }

    function aplicarEfecto(pj) {
        const tipo = pj.efecto;
        const acum = ACUM_POR_GOLPE[tipo] || 0;

        switch (tipo) {
            case "sangrado":
                jefe.efectos.sangrado += acum;
                logMsg(`🩸 +${acum} Sangrado (total: ${jefe.efectos.sangrado})`, "log-efecto");
                break;
            case "ruptura":
                jefe.efectos.ruptura += acum;
                logMsg(`💥 +${acum} Ruptura (total: ${jefe.efectos.ruptura})`, "log-efecto");
                break;
            case "choque":
                jefe.efectos.choque += acum;
                logMsg(`⚡ +${acum} Choque (total: ${jefe.efectos.choque})`, "log-efecto");
                break;
            case "marchitamiento":
                jefe.efectos.marchitamiento = Math.min(99, jefe.efectos.marchitamiento + acum);
                logMsg(`🍂 +${acum} Marchitamiento (total: ${jefe.efectos.marchitamiento})`, "log-efecto");
                break;
            case "fragilidad":
                jefe.efectos.fragilidad += acum;
                logMsg(`🔻 +${acum} Fragilidad (total: ${jefe.efectos.fragilidad})`, "log-efecto");
                break;
            case "marca":
                jefe.efectos.marca = true;
                logMsg(`🎯 Marca aplicada al jefe`, "log-efecto");
                break;
            case "floracion":
                jefe.efectos.floracion += acum;
                jefe.ultimoAplicadorFloracionATK = pj.atk;
                logMsg(`🌺 +${acum} Floración (total: ${jefe.efectos.floracion})`, "log-efecto");
                break;
        }
    }

    // ── Fin de ronda: efectos de fin de turno + ataque del jefe ──
    function finDeRonda() {
        turno++;
        logMsg(`── Fin de ronda ${turno} ──`, "log-turno");

        // Sangrado al final del turno
        const sangRes = Efectos.aplicarSangradoFinTurno(jefe);
        if (sangRes.dano > 0) {
            jefe.hp = Math.max(0, jefe.hp - sangRes.dano);
            jefe.efectos.sangrado = sangRes.nuevasAcum;
            logMsg(`🩸 Sangrado inflige ${sangRes.dano} daño (quedan ${sangRes.nuevasAcum} acum.)`, "log-dano");
        }

        // Reducir marchitamiento y fragilidad
        jefe.efectos.marchitamiento = Efectos.reducirMarchitamientoFinTurno(jefe.efectos.marchitamiento);
        jefe.efectos.fragilidad = Efectos.reducirFragilidadFinTurno(jefe.efectos.fragilidad);

        // Comprobar victoria por sangrado
        if (jefe.hp <= 0) {
            combateActivo = false;
            logMsg("🏆 ¡Victoria! " + jefe.nombre + " cayó por efectos.", "log-victoria");
            renderUI();
            document.getElementById("btn-atacar").disabled = true;
            return;
        }

        // Comprobar Choque
        const choqueRes = Efectos.comprobarChoque(jefe);
        if (choqueRes.stunned) {
            jefe.efectos.choque = choqueRes.nuevasAcum;
            jefe.stunned = true;
            logMsg(`⚡ ¡Choque activado! El jefe pierde su turno.`, "log-efecto");
        } else {
            jefe.stunned = false;
        }

        // Turno del jefe
        if (!jefe.stunned) {
            turnoDelJefe();
        } else {
            logMsg(`${jefe.nombre} está aturdido y no puede actuar.`, "log-jefe");
            jefe.stunned = false;
        }

        // Reset del índice de personajes
        pjActualIdx = 0;
        avanzarAPersonajeVivo();

        if (todosMuertos()) {
            combateActivo = false;
            logMsg("💀 Todo tu equipo ha caído...", "log-derrota");
            document.getElementById("btn-atacar").disabled = true;
        }

        renderUI();
    }

    function turnoDelJefe() {
        const vivos = obtenerVivos();
        if (vivos.length === 0) return;

        // Reducción de daño por marchitamiento
        const redMarch = Efectos.calcularReduccionMarchitamiento(jefe.efectos.marchitamiento);
        let dano = Math.max(1, Math.ceil(jefe.atk * (1 - redMarch)));

        // El jefe ataca a un personaje aleatorio vivo
        const objetivo = vivos[Math.floor(Math.random() * vivos.length)];
        objetivo.hpActual = Math.max(0, objetivo.hpActual - dano);

        logMsg(`🐉 ${jefe.nombre} ataca a ${objetivo.nombre} por ${dano} daño`, "log-jefe");

        if (objetivo.hpActual <= 0) {
            objetivo.vivo = false;
            logMsg(`☠️ ${objetivo.nombre} ha caído!`, "log-derrota");
        }

        // Reducir choque porque un aliado recibió daño
        jefe.efectos.choque = Efectos.reducirChoquePorDanoAliado(jefe);
    }

    function todosMuertos() {
        return equipo.every(p => !p.vivo);
    }

    // ── Renderizado del UI de combate ──
    function renderUI() {
        // Barra de vida del jefe
        if (!jefe) return;
        const pct = Math.max(0, (jefe.hp / jefe.hpMax) * 100);
        document.getElementById("jefe-vida-fill").style.width = pct + "%";
        document.getElementById("jefe-vida-texto").textContent = `${jefe.hp} / ${jefe.hpMax}`;

        // Efectos del jefe
        const contenedor = document.getElementById("jefe-efectos");
        contenedor.innerHTML = "";
        const efectoNames = {
            sangrado: "🩸 Sangrado", ruptura: "💥 Ruptura", choque: "⚡ Choque",
            marchitamiento: "🍂 Marchit.", fragilidad: "🔻 Fragil.",
            marca: "🎯 Marca", floracion: "🌺 Floración"
        };
        for (const [key, label] of Object.entries(efectoNames)) {
            const val = jefe.efectos[key];
            if (key === "marca") {
                if (val) {
                    const badge = document.createElement("span");
                    badge.className = `efecto-badge efecto-${key}`;
                    badge.textContent = label;
                    contenedor.appendChild(badge);
                }
            } else if (val > 0) {
                const badge = document.createElement("span");
                badge.className = `efecto-badge efecto-${key}`;
                badge.textContent = `${label} ${val}`;
                contenedor.appendChild(badge);
            }
        }

        // Equipo
        const equipoEl = document.getElementById("equipo-combate");
        equipoEl.innerHTML = "";
        equipo.forEach((pj, i) => {
            const card = document.createElement("div");
            card.className = "pj-combate-card";
            if (i === pjActualIdx && combateActivo && pj.vivo) card.classList.add("activo");
            if (!pj.vivo) card.classList.add("muerto");
            card.innerHTML = `
                <div class="pj-combate-nombre">${pj.nombre}</div>
                <div class="pj-combate-hp">${pj.vivo ? pj.hpActual + "/" + pj.hp : "☠️"}</div>
                <div class="pj-combate-efecto">${pj.efecto}</div>
            `;
            equipoEl.appendChild(card);
        });

        // Indicador de turno
        document.getElementById("turno-indicador").textContent = `Ronda ${turno}`;
    }

    function logMsg(texto, clase) {
        const log = document.getElementById("combate-log");
        const p = document.createElement("p");
        if (clase) p.className = clase;
        p.textContent = texto;
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }

    function estaActivo() { return combateActivo; }

    return { iniciar, atacar, estaActivo };
})();


// ══════════════════════════════════════════════════════════
// MÓDULO: Selección de personajes
// ══════════════════════════════════════════════════════════
const Seleccion = (() => {
    const MAX_EQUIPO = 6;
    let seleccionados = new Set();

    function init() {
        seleccionados.clear();
        renderGrid();
        renderEquipo();
        document.getElementById("btn-confirmar-equipo").disabled = true;
    }

    function renderGrid() {
        const grid = document.getElementById("grid-personajes");
        grid.innerHTML = "";

        PERSONAJES.forEach(pj => {
            const card = document.createElement("div");
            card.className = "tarjeta-personaje";
            if (seleccionados.has(pj.id)) card.classList.add("seleccionado");
            if (!seleccionados.has(pj.id) && seleccionados.size >= MAX_EQUIPO) {
                card.classList.add("deshabilitado");
            }

            const claseEfecto = "efecto-" + pj.efecto;
            card.innerHTML = `
                <div class="pj-nombre">${pj.nombre}</div>
                <div class="pj-titulo">${pj.titulo}</div>
                <span class="pj-efecto ${claseEfecto}">${pj.efecto}</span>
            `;

            card.addEventListener("click", () => toggle(pj.id));
            grid.appendChild(card);
        });
    }

    function toggle(id) {
        if (seleccionados.has(id)) {
            seleccionados.delete(id);
        } else {
            if (seleccionados.size >= MAX_EQUIPO) return;
            seleccionados.add(id);
        }
        renderGrid();
        renderEquipo();
    }

    function renderEquipo() {
        const slots = document.getElementById("equipo-slots");
        slots.innerHTML = "";
        seleccionados.forEach(id => {
            const pj = PERSONAJES.find(p => p.id === id);
            const span = document.createElement("span");
            span.className = "equipo-slot";
            span.textContent = pj.nombre;
            slots.appendChild(span);
        });
        document.getElementById("equipo-contador").textContent = `${seleccionados.size} / ${MAX_EQUIPO}`;
        document.getElementById("btn-confirmar-equipo").disabled = seleccionados.size === 0;
    }

    function obtenerSeleccionados() {
        return PERSONAJES.filter(p => seleccionados.has(p.id));
    }

    return { init, obtenerSeleccionados };
})();


// ══════════════════════════════════════════════════════════
// MÓDULO: Menú y navegación
// ══════════════════════════════════════════════════════════
const Menu = (() => {

    const MODOS = [
        {
            id: "clasico",
            nombre: "Clásico",
            descripcion: "Dos bandos luchan en una cuadrícula 30×30. Los aliados huyen, los enemigos persiguen.",
            tema: "tema-default",
            arranque: (modo) => {
                mostrarPantalla(document.getElementById("pantalla-juego"));
                startClassicGame(modo);
            },
            config: {},
        },
        {
            id: "lotus",
            nombre: "Lotus of the Damned",
            descripcion: "Combate por turnos contra un jefe legendario. Elige a tu equipo de guerreros y domina sus efectos.",
            tema: "tema-lotus",
            arranque: () => {
                Seleccion.init();
                mostrarPantalla(document.getElementById("pantalla-seleccion"));
            },
            config: {},
        },
    ];

    let indiceActual = 0;

    const pantallaTitulo = document.getElementById("pantalla-titulo");
    const pantallaModos  = document.getElementById("pantalla-modos");
    const elNombre       = document.getElementById("modo-nombre");
    const elDescripcion  = document.getElementById("modo-descripcion");
    const elIndicadores  = document.getElementById("modos-indicadores");

    function mostrarPantalla(pantalla) {
        document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
        pantalla.classList.add("activa");
    }

    function aplicarTema(tema) {
        document.body.className = tema;
    }

    function renderizarModo() {
        const modo = MODOS[indiceActual];
        elNombre.textContent = modo.nombre;
        elDescripcion.textContent = modo.descripcion;
        aplicarTema(modo.tema);
        elIndicadores.querySelectorAll(".indicador-dot").forEach((d, i) => {
            d.classList.toggle("activo", i === indiceActual);
        });
    }

    function crearIndicadores() {
        elIndicadores.innerHTML = "";
        MODOS.forEach((_, i) => {
            const dot = document.createElement("span");
            dot.className = "indicador-dot" + (i === 0 ? " activo" : "");
            dot.addEventListener("click", () => { indiceActual = i; renderizarModo(); });
            elIndicadores.appendChild(dot);
        });
    }

    function modoPrev() {
        indiceActual = (indiceActual - 1 + MODOS.length) % MODOS.length;
        renderizarModo();
    }
    function modoNext() {
        indiceActual = (indiceActual + 1) % MODOS.length;
        renderizarModo();
    }

    function confirmarModo() {
        const modo = MODOS[indiceActual];
        modo.arranque(modo);
    }

    function volverAModos() {
        detenerJuego();
        mostrarPantalla(pantallaModos);
    }

    function init() {
        crearIndicadores();
        renderizarModo();

        pantallaTitulo.addEventListener("click", () => mostrarPantalla(pantallaModos));
        document.getElementById("btn-modo-prev").addEventListener("click", modoPrev);
        document.getElementById("btn-modo-next").addEventListener("click", modoNext);
        document.getElementById("btn-jugar").addEventListener("click", confirmarModo);
        document.getElementById("btn-menu").addEventListener("click", volverAModos);
        document.getElementById("btn-combate-menu").addEventListener("click", volverAModos);
        document.getElementById("btn-volver-modos").addEventListener("click", volverAModos);

        // Confirmar equipo → iniciar combate Lotus
        document.getElementById("btn-confirmar-equipo").addEventListener("click", () => {
            const equipo = Seleccion.obtenerSeleccionados();
            if (equipo.length === 0) return;
            document.getElementById("combate-log").innerHTML = "";
            mostrarPantalla(document.getElementById("pantalla-combate"));
            document.getElementById("btn-atacar").disabled = false;
            Combate.iniciar(equipo);
        });

        // Botón atacar en combate
        document.getElementById("btn-atacar").addEventListener("click", () => {
            Combate.atacar();
        });

        // Teclado
        document.addEventListener("keydown", (e) => {
            if (pantallaModos.classList.contains("activa")) {
                if (e.key === "ArrowLeft") modoPrev();
                if (e.key === "ArrowRight") modoNext();
                if (e.key === "Enter") confirmarModo();
            }
            if (document.getElementById("pantalla-combate").classList.contains("activa")) {
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    Combate.atacar();
                }
            }
        });
    }

    // Exponer mostrarPantalla y volverAModos para uso externo
    return { init, mostrarPantalla, volverAModos };
})();


// ══════════════════════════════════════════════════════════
// JUEGO CLÁSICO — Lógica original (sin cambios funcionales)
// ══════════════════════════════════════════════════════════
const CONFIG = {
    ANCHO: 30, ALTO: 30,
    PROB_VACIO: 0.85, PROB_PERSONAJE: 0.05,
    RADIO_DETECCION: 4, TAMANO_CELDA: 20,
};
const CONFIG_BASE = { ...CONFIG };
const TIPO = { VACIO: 0, ALIADO: 1, ENEMIGO: 2, OBSTACULO_X: 3, OBSTACULO_O: 4, OBSTACULO_Z: 5 };

let tablero = [], movidoEsteTurno = [], turnoClasico = 0, intervaloId = null, velocidad = 100, juegoActivo = false;

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

function startClassicGame(modo) {
    Object.assign(CONFIG, CONFIG_BASE, modo.config || {});
    turnoClasico = 0;
    velocidad = parseInt(rangoVelocidad.value);
    ocultarMensaje();
    crearTablero();
    ajustarCanvas();
    dibujarTablero();
    actualizarContadores();
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    juegoActivo = false;
}

function crearTablero() {
    tablero = [];
    for (let i = 0; i < CONFIG.ALTO; i++) {
        const f = [];
        for (let j = 0; j < CONFIG.ANCHO; j++) f.push(generarEntidad());
        tablero.push(f);
    }
}
function generarEntidad() {
    const r = Math.random();
    if (r < CONFIG.PROB_VACIO) return TIPO.VACIO;
    if (r < CONFIG.PROB_VACIO + CONFIG.PROB_PERSONAJE) return Math.random() < 0.5 ? TIPO.ALIADO : TIPO.ENEMIGO;
    return [TIPO.OBSTACULO_X, TIPO.OBSTACULO_O, TIPO.OBSTACULO_Z][Math.floor(Math.random() * 3)];
}
function reiniciarMovidos() {
    movidoEsteTurno = [];
    for (let i = 0; i < CONFIG.ALTO; i++) movidoEsteTurno.push(new Array(CONFIG.ANCHO).fill(false));
}

const DIRECCIONES = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function ejecutarTurno() {
    turnoClasico++;
    reiniciarMovidos();
    resolverCombatesClasico();
    const pos = [];
    for (let i = 0; i < CONFIG.ALTO; i++) for (let j = 0; j < CONFIG.ANCHO; j++) if (esPersonaje(tablero[i][j])) pos.push({i,j});
    mezclarArray(pos);
    for (const p of pos) {
        const t = tablero[p.i][p.j];
        if (!esPersonaje(t) || movidoEsteTurno[p.i][p.j]) continue;
        const en = buscarEnemigo(p.i, p.j, t, CONFIG.RADIO_DETECCION);
        if (en) moverHaciaODesde(p.i, p.j, t, en); else moverAleatorio(p.i, p.j);
    }
    dibujarTablero(); actualizarContadores(); comprobarFinDelJuego();
}

function resolverCombatesClasico() {
    const pel = [];
    for (let i = 0; i < CONFIG.ALTO; i++) pel.push(new Array(CONFIG.ANCHO).fill(false));
    for (let i = 0; i < CONFIG.ALTO; i++) for (let j = 0; j < CONFIG.ANCHO; j++) {
        const t = tablero[i][j]; if (!esPersonaje(t) || pel[i][j]) continue;
        const en = buscarEnemigo(i, j, t, 1);
        if (en && !pel[en.i][en.j]) {
            if (Math.random() < 0.5) tablero[i][j] = TIPO.VACIO; else tablero[en.i][en.j] = TIPO.VACIO;
            pel[i][j] = true; pel[en.i][en.j] = true;
        }
    }
}
function buscarEnemigo(fi,fj,tipo,radio) {
    let best=Infinity, pos=null;
    for (let di=-radio;di<=radio;di++) for (let dj=-radio;dj<=radio;dj++) {
        if (!di&&!dj) continue; const ni=fi+di,nj=fj+dj;
        if (!dentroDelTablero(ni,nj)) continue;
        const v = tablero[ni][nj];
        if (esPersonaje(v) && v !== tipo) { const d=Math.abs(di)+Math.abs(dj); if (d<best) { best=d; pos={i:ni,j:nj}; } }
    }
    return pos;
}
function moverAleatorio(fi,fj) {
    const dirs = [...DIRECCIONES]; mezclarArray(dirs);
    for (const [di,dj] of dirs) {
        const ni=fi+di,nj=fj+dj;
        if (dentroDelTablero(ni,nj) && tablero[ni][nj]===TIPO.VACIO) {
            tablero[ni][nj]=tablero[fi][fj]; tablero[fi][fj]=TIPO.VACIO; movidoEsteTurno[ni][nj]=true; return;
        }
    }
}
function moverHaciaODesde(fi,fj,tipo,enemigo) {
    const di=Math.sign(enemigo.i-fi),dj=Math.sign(enemigo.j-fj);
    let pi,pj;
    if (tipo===TIPO.ALIADO){pi=-di;pj=-dj}else{pi=di;pj=dj}
    const ni=fi+pi,nj=fj+pj;
    if (dentroDelTablero(ni,nj)&&tablero[ni][nj]===TIPO.VACIO) {
        tablero[ni][nj]=tablero[fi][fj]; tablero[fi][fj]=TIPO.VACIO; movidoEsteTurno[ni][nj]=true;
    } else moverAleatorio(fi,fj);
}

function esPersonaje(t){return t===TIPO.ALIADO||t===TIPO.ENEMIGO}
function esObstaculo(t){return t===TIPO.OBSTACULO_X||t===TIPO.OBSTACULO_O||t===TIPO.OBSTACULO_Z}
function dentroDelTablero(i,j){return i>=0&&i<CONFIG.ALTO&&j>=0&&j<CONFIG.ANCHO}
function mezclarArray(a){for(let k=a.length-1;k>0;k--){const r=Math.floor(Math.random()*(k+1));[a[k],a[r]]=[a[r],a[k]]}}
function contarTipo(t){let n=0;for(let i=0;i<CONFIG.ALTO;i++)for(let j=0;j<CONFIG.ANCHO;j++)if(tablero[i][j]===t)n++;return n}

function ajustarCanvas() {
    const rect = canvas.getBoundingClientRect();
    const s = Math.floor(rect.width);
    canvas.width = s; canvas.height = s;
    CONFIG.TAMANO_CELDA = s / CONFIG.ANCHO;
}
function dibujarTablero() {
    const tam = CONFIG.TAMANO_CELDA;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let i=0;i<CONFIG.ALTO;i++) for (let j=0;j<CONFIG.ANCHO;j++) {
        const x=j*tam,y=i*tam;
        ctx.fillStyle=(i+j)%2===0?"#13131d":"#111119";
        ctx.fillRect(x,y,tam,tam);
        const tipo=tablero[i][j],c=tam/2;
        if (tipo===TIPO.ALIADO) dibujarPersonaje(x,y,tam,"#f5c842","#ffe066","Ö");
        else if (tipo===TIPO.ENEMIGO) dibujarPersonaje(x,y,tam,"#e84545","#ff7070","Ü");
        else if (esObstaculo(tipo)) dibujarObstaculo(x,y,tam,tipo);
    }
}
function dibujarPersonaje(x,y,tam,color,brillo,simbolo) {
    const c=tam/2;
    const g=ctx.createRadialGradient(x+c,y+c,tam*0.1,x+c,y+c,tam*0.6);
    g.addColorStop(0,brillo);g.addColorStop(1,"transparent");
    ctx.fillStyle=g;ctx.fillRect(x,y,tam,tam);
    ctx.fillStyle=color;ctx.font=`bold ${tam*0.65}px 'JetBrains Mono',monospace`;
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(simbolo,x+c,y+c+1);
}
function dibujarObstaculo(x,y,tam,tipo) {
    const c=tam/2;ctx.fillStyle="#2a2a3a";
    ctx.font=`${tam*0.5}px 'JetBrains Mono',monospace`;
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(tipo===TIPO.OBSTACULO_X?"✕":tipo===TIPO.OBSTACULO_O?"◯":"▣",x+c,y+c+1);
}

function actualizarContadores() {
    elAliados.textContent=contarTipo(TIPO.ALIADO);
    elEnemigos.textContent=contarTipo(TIPO.ENEMIGO);
    elTurno.textContent=turnoClasico;
}
function comprobarFinDelJuego() {
    const a=contarTipo(TIPO.ALIADO),e=contarTipo(TIPO.ENEMIGO);
    if(a===0&&e===0){detenerJuego();mostrarMensaje("🤝 ¡Empate!","derrota")}
    else if(a===0){detenerJuego();mostrarMensaje("💀 ¡Enemigos ganan!","derrota")}
    else if(e===0){detenerJuego();mostrarMensaje("🏆 ¡Aliados ganan!","victoria")}
}
function mostrarMensaje(t,c){mensajeFinal.textContent=t;mensajeFinal.className=c}
function ocultarMensaje(){mensajeFinal.className="oculto"}
function iniciarJuego(){if(juegoActivo)return;juegoActivo=true;btnIniciar.disabled=true;btnPausar.disabled=false;intervaloId=setInterval(ejecutarTurno,velocidad)}
function pausarJuego(){if(!juegoActivo)return;juegoActivo=false;clearInterval(intervaloId);intervaloId=null;btnIniciar.disabled=false;btnPausar.disabled=true}
function detenerJuego(){juegoActivo=false;clearInterval(intervaloId);intervaloId=null;btnIniciar.disabled=true;btnPausar.disabled=true}
function reiniciarJuego(){detenerJuego();turnoClasico=0;ocultarMensaje();crearTablero();ajustarCanvas();dibujarTablero();actualizarContadores();btnIniciar.disabled=false}

btnIniciar.addEventListener("click",iniciarJuego);
btnPausar.addEventListener("click",pausarJuego);
btnReiniciar.addEventListener("click",reiniciarJuego);
rangoVelocidad.addEventListener("input",()=>{velocidad=parseInt(rangoVelocidad.value);textoVelocidad.textContent=velocidad+"ms";if(juegoActivo){clearInterval(intervaloId);intervaloId=setInterval(ejecutarTurno,velocidad)}});
window.addEventListener("resize",()=>{if(document.getElementById("pantalla-juego").classList.contains("activa")){ajustarCanvas();dibujarTablero()}});


// ══════════════════════════════════════════════════════════
// TESTS — ejecutar desde consola con: Tests.ejecutar()
// ══════════════════════════════════════════════════════════
const Tests = (() => {
    let pasados = 0, fallados = 0;

    function assert(condicion, mensaje) {
        if (condicion) {
            console.log(`  ✅ ${mensaje}`);
            pasados++;
        } else {
            console.error(`  ❌ ${mensaje}`);
            fallados++;
        }
    }

    function crearJefeTest() {
        return {
            hp: 2000, hpMax: 2000, atk: 30,
            efectos: { sangrado: 0, ruptura: 0, choque: 0, marchitamiento: 0, fragilidad: 0, marca: false, floracion: 0 },
            stunned: false, ultimoAplicadorFloracionATK: 0,
        };
    }

    function testSangrado() {
        console.log("🩸 Test Sangrado:");
        let j = crearJefeTest();
        j.efectos.sangrado = 10;
        const r = Efectos.aplicarSangradoFinTurno(j);
        assert(r.dano === 10, `Daño = 10 (recibido: ${r.dano})`);
        assert(r.nuevasAcum === 5, `Acumulaciones 10→5 (recibido: ${r.nuevasAcum})`);

        j.efectos.sangrado = 7;
        const r2 = Efectos.aplicarSangradoFinTurno(j);
        assert(r2.nuevasAcum === 4, `Acumulaciones 7→4 ceil(3.5) (recibido: ${r2.nuevasAcum})`);

        j.efectos.sangrado = 1;
        const r3 = Efectos.aplicarSangradoFinTurno(j);
        assert(r3.nuevasAcum === 1, `Acumulaciones 1→1 ceil(0.5) (recibido: ${r3.nuevasAcum})`);

        j.efectos.sangrado = 0;
        const r4 = Efectos.aplicarSangradoFinTurno(j);
        assert(r4.dano === 0, `Sin acumulaciones = 0 daño`);
    }

    function testRuptura() {
        console.log("💥 Test Ruptura:");
        let j = crearJefeTest();
        j.efectos.ruptura = 10;
        const r = Efectos.aplicarRupturaAlGolpe(j);
        assert(r.danoExtra === 10, `Daño extra = 10 (recibido: ${r.danoExtra})`);
        assert(r.nuevasAcum === 9, `Acum 10→9 (10 - ceil(1)) (recibido: ${r.nuevasAcum})`);

        j.efectos.ruptura = 3;
        const r2 = Efectos.aplicarRupturaAlGolpe(j);
        assert(r2.nuevasAcum === 2, `Acum 3→2 (3 - ceil(0.3)=1) (recibido: ${r2.nuevasAcum})`);
    }

    function testChoque() {
        console.log("⚡ Test Choque:");
        let j = crearJefeTest();
        j.efectos.choque = 29;
        let r = Efectos.comprobarChoque(j);
        assert(!r.stunned, "29 acum = no stun");

        j.efectos.choque = 30;
        r = Efectos.comprobarChoque(j);
        assert(r.stunned, "30 acum = stun");
        assert(r.nuevasAcum === 0, "Reset a 0 tras stun");

        j.efectos.choque = 12;
        const n = Efectos.reducirChoquePorDanoAliado(j);
        assert(n === 7, `12 - 5 = 7 (recibido: ${n})`);

        j.efectos.choque = 3;
        const n2 = Efectos.reducirChoquePorDanoAliado(j);
        assert(n2 === 0, `3 - 5 = 0 (mín 0) (recibido: ${n2})`);
    }

    function testMarchitamiento() {
        console.log("🍂 Test Marchitamiento:");
        const red20 = Efectos.calcularReduccionMarchitamiento(20);
        const esperado = (0.1 * 20) / 100; // 0.02
        assert(Math.abs(red20 - esperado) < 0.0001, `20 acum → ${(esperado*100).toFixed(2)}% reducción (recibido: ${(red20*100).toFixed(2)}%)`);

        const nueva = Efectos.reducirMarchitamientoFinTurno(5);
        assert(nueva === 3, `5 - 2 = 3 (recibido: ${nueva})`);

        const nueva2 = Efectos.reducirMarchitamientoFinTurno(1);
        assert(nueva2 === 0, `1 - 2 = 0 mín (recibido: ${nueva2})`);
    }

    function testFragilidad() {
        console.log("🔻 Test Fragilidad:");
        const b10 = Efectos.calcularBonusFragilidad(10);
        assert(Math.abs(b10 - 0.01) < 0.0001, `10 acum → 1% extra (recibido: ${(b10*100).toFixed(2)}%)`);

        const bMax = Efectos.calcularBonusFragilidad(100);
        assert(Math.abs(bMax - 0.05) < 0.0001, `100 acum → máx 5% (recibido: ${(bMax*100).toFixed(2)}%)`);

        const nueva = Efectos.reducirFragilidadFinTurno(3);
        assert(nueva === 1, `3 - 2 = 1 (recibido: ${nueva})`);
    }

    function testMarca() {
        console.log("🎯 Test Marca:");
        assert(Efectos.calcularBonusMarca(true) === 0.15, "Marca activa → 15% bonus");
        assert(Efectos.calcularBonusMarca(false) === 0, "Marca inactiva → 0% bonus");
    }

    function testFloracion() {
        console.log("🌸 Test Floración:");
        let j = crearJefeTest();
        j.efectos.floracion = 19;
        let r = Efectos.comprobarFloracion(j);
        assert(!r.explota, "19 acum = no explota");

        j.efectos.floracion = 20;
        j.ultimoAplicadorFloracionATK = 40;
        r = Efectos.comprobarFloracion(j);
        assert(r.explota, "20 acum = explota");
        const danoEsperado = Math.ceil(20 * 0.1 * 40); // 80
        assert(r.dano === danoEsperado, `Daño = ${danoEsperado} (20 * 10% de ATK 40) (recibido: ${r.dano})`);
        assert(r.nuevasAcum === 0, "Reset a 0 tras explosión");
    }

    function ejecutar() {
        pasados = 0; fallados = 0;
        console.log("═══════════════════════════════════════");
        console.log("  TESTS — Lotus of the Damned: Efectos");
        console.log("═══════════════════════════════════════");
        testSangrado();
        testRuptura();
        testChoque();
        testMarchitamiento();
        testFragilidad();
        testMarca();
        testFloracion();
        console.log("═══════════════════════════════════════");
        console.log(`  Resultado: ${pasados} pasados, ${fallados} fallados`);
        console.log("═══════════════════════════════════════");
        return { pasados, fallados };
    }

    return { ejecutar };
})();


// ══════════════════════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════════════════════
Menu.init();

// Ejecutar tests automáticamente en desarrollo
Tests.ejecutar();
