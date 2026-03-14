// main.js — Game Bar
// Vanilla JS, módulos IIFE: Menu, Seleccion, SpriteAnimator, TurnSystem, BattleScene, ClassicGame
"use strict";

// ══════════════════════════════════════════════════════════
// Datos de personajes con rutas de sprites
// ══════════════════════════════════════════════════════════
const PERSONAJES = [
    { id:"aiko",   nombre:"Aiko",   titulo:"la Espada Carmesí",         efecto:"sangrado",       atk:45, hp:120,
      icon:"Sprites/Aiko/AikoIcon.png",
      idle:{ src:"Sprites/Aiko/AikoIdle.png", cols:6, rows:4, total:24, fw:396, fh:457 } },
    { id:"ren",    nombre:"Ren",    titulo:"el Cazador Silencioso",     efecto:"ruptura",        atk:50, hp:100,
      icon:"Sprites/Ren/RenIcon.png",
      idle:{ src:"Sprites/Ren/RenIdle.png", cols:6, rows:6, total:36, fw:458, fh:570 } },
    { id:"meilin", nombre:"Meilin", titulo:"Sacerdotisa del Trueno",    efecto:"choque",         atk:40, hp:130,
      icon:"Sprites/Meilin/MeilinIcon.png",
      idle:{ src:"Sprites/Meilin/MeilinIdle.png", cols:6, rows:6, total:36, fw:336, fh:706 } },
    { id:"katsuro",nombre:"Katsuro",titulo:"Guardia del Dragón",       efecto:"sangrado",       atk:42, hp:140,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"hana",   nombre:"Hana",   titulo:"Flor Errante",             efecto:"marchitamiento", atk:35, hp:110,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"jiro",   nombre:"Jiro",   titulo:"Espadachín del Crepúsculo",efecto:"ruptura",        atk:55, hp:90,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"lian",   nombre:"Lian",   titulo:"Monje del Viento",         efecto:"fragilidad",     atk:38, hp:125,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"sora",   nombre:"Sora",   titulo:"Bailarina de Loto",        efecto:"fragilidad",     atk:36, hp:115,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"daichi", nombre:"Daichi", titulo:"Martillo de Jade",         efecto:"choque",         atk:60, hp:150,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"yume",   nombre:"Yume",   titulo:"Oráculo de la Niebla",     efecto:"marca",          atk:44, hp:105,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"takeda", nombre:"Takeda", titulo:"General Caído",            efecto:"sangrado",       atk:48, hp:135,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
    { id:"lotus",  nombre:"Lotus",  titulo:"Portador de Pétalos",      efecto:"floracion",      atk:40, hp:120,
      icon:"Sprites/PlaceHolders/CharacterIconPlaceholder.png", idle:null },
];

const PLACEHOLDER_ICON = "Sprites/PlaceHolders/CharacterIconPlaceholder.png";


// ══════════════════════════════════════════════════════════
// Animador de spritesheets en Canvas
// ══════════════════════════════════════════════════════════
const SpriteAnimator = (() => {
    let canvas, ctx;
    let currentImg = null;
    let frameData = null;
    let currentFrame = 0;
    let animId = null;
    let lastTime = 0;
    const FPS = 10;
    const frameInterval = 1000 / FPS;

    function init() {
        canvas = document.getElementById("sprite-canvas");
        ctx = canvas.getContext("2d");
    }

    function cargar(pj, callback) {
        detener();
        currentFrame = 0;

        if (!pj.idle) {
            canvas.width = 300;
            canvas.height = 400;
            ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
                const w = img.width * scale, h = img.height * scale;
                ctx.drawImage(img, (canvas.width - w) / 2, canvas.height - h, w, h);
                if (callback) callback();
            };
            img.src = pj.icon;
            return;
        }

        const img = new Image();
        img.onload = () => {
            currentImg = img;
            frameData = pj.idle;
            // Ajustar canvas al tamaño exacto del frame — CSS escala visualmente
            canvas.width = frameData.fw;
            canvas.height = frameData.fh;
            ctx = canvas.getContext("2d");
            reproducir();
            if (callback) callback();
        };
        img.onerror = () => {
            canvas.width = 300;
            canvas.height = 400;
            ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#555";
            ctx.font = "16px Outfit";
            ctx.textAlign = "center";
            ctx.fillText(pj.nombre, canvas.width / 2, canvas.height / 2);
            if (callback) callback();
        };
        img.src = pj.idle.src;
    }

    function reproducir() {
        lastTime = performance.now();
        function loop(time) {
            animId = requestAnimationFrame(loop);
            if (time - lastTime < frameInterval) return;
            lastTime = time;
            dibujarFrame();
            currentFrame = (currentFrame + 1) % frameData.total;
        }
        animId = requestAnimationFrame(loop);
    }

    function dibujarFrame() {
        if (!currentImg || !frameData) return;
        const { cols, fw, fh } = frameData;
        const col = currentFrame % cols;
        const row = Math.floor(currentFrame / cols);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Dibujar 1:1 — canvas ya tiene las dimensiones del frame
        ctx.drawImage(currentImg, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
    }

    function detener() {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        currentImg = null;
        frameData = null;
    }

    function limpiar() {
        detener();
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return { init, cargar, detener, limpiar };
})();


// ══════════════════════════════════════════════════════════
// Sistema de turnos
// ══════════════════════════════════════════════════════════
const TurnSystem = (() => {
    let equipo = [];       // Array de personajes activos del jugador
    let orden = [];        // Orden de acción esta ronda (índices en equipo)
    let posEnOrden = 0;    // Posición actual dentro de la ronda
    let ronda = 0;

    function iniciar(personajes) {
        equipo = personajes.map(p => ({ ...p, hpActual: p.hp, vivo: true }));
        ronda = 0;
        nuevaRonda();
    }

    function nuevaRonda() {
        // Generar orden aleatorio con solo los vivos
        const vivos = [];
        equipo.forEach((p, i) => { if (p.vivo) vivos.push(i); });

        // Fisher-Yates shuffle
        for (let k = vivos.length - 1; k > 0; k--) {
            const r = Math.floor(Math.random() * (k + 1));
            [vivos[k], vivos[r]] = [vivos[r], vivos[k]];
        }

        orden = vivos;
        posEnOrden = 0;
    }

    function personajeActual() {
        if (posEnOrden >= orden.length) return null;
        return equipo[orden[posEnOrden]];
    }

    function indiceActual() {
        return posEnOrden < orden.length ? orden[posEnOrden] : -1;
    }

    // Terminar turno del personaje actual, avanzar al siguiente
    // Retorna true si la ronda termina (todos actuaron)
    function avanzar() {
        posEnOrden++;
        if (posEnOrden >= orden.length) {
            // Ronda completa
            ronda++;
            nuevaRonda();
            return true; // Nueva ronda
        }
        return false; // Misma ronda, siguiente personaje
    }

    function getRonda() { return ronda; }
    function getOrden() { return orden; }
    function getPos() { return posEnOrden; }
    function getEquipo() { return equipo; }

    return { iniciar, personajeActual, indiceActual, avanzar, getRonda, getOrden, getPos, getEquipo, nuevaRonda };
})();


// ══════════════════════════════════════════════════════════
// Escena de batalla
// ══════════════════════════════════════════════════════════
const BattleScene = (() => {
    let activo = false;

    function iniciar(personajes) {
        SpriteAnimator.init();
        TurnSystem.iniciar(personajes);
        activo = true;
        renderTurnBar();
        cargarPersonajeActual();
    }

    function renderTurnBar() {
        const orden = TurnSystem.getOrden();
        const pos = TurnSystem.getPos();
        const equipo = TurnSystem.getEquipo();
        const ronda = TurnSystem.getRonda();

        document.getElementById("turno-contador").textContent = `Turno ${ronda}`;

        const lista = document.getElementById("turno-lista");
        lista.innerHTML = "";

        orden.forEach((idx, i) => {
            const pj = equipo[idx];
            const entry = document.createElement("div");
            entry.className = "turno-entry";
            if (i === pos) entry.classList.add("activo");
            if (i < pos) entry.classList.add("completado");

            const img = document.createElement("img");
            img.src = pj.icon || PLACEHOLDER_ICON;
            img.alt = pj.nombre;
            entry.appendChild(img);

            const label = document.createElement("div");
            label.className = "turno-entry-label";
            label.textContent = pj.nombre;
            entry.appendChild(label);

            lista.appendChild(entry);
        });
    }

    function cargarPersonajeActual() {
        const pj = TurnSystem.personajeActual();
        if (!pj) return;

        // Actualizar panel de acciones
        document.getElementById("pa-nombre").textContent = pj.nombre;
        document.getElementById("pa-hp").textContent = `HP: ${pj.hpActual} / ${pj.hp}`;
        document.getElementById("btn-atacar").disabled = false;
        document.getElementById("btn-defender").disabled = false;

        // Transición visual: fade out → cargar sprite → fade in
        const zona = document.getElementById("zona-aliado");
        zona.classList.add("fade-out");
        zona.classList.remove("fade-in");

        setTimeout(() => {
            SpriteAnimator.cargar(pj, () => {
                zona.classList.remove("fade-out");
                zona.classList.add("fade-in");
            });
        }, 300);

        renderTurnBar();
    }

    function ejecutarAccion(tipo) {
        if (!activo) return;

        // Deshabilitar botones mientras procesamos
        document.getElementById("btn-atacar").disabled = true;
        document.getElementById("btn-defender").disabled = true;

        const pj = TurnSystem.personajeActual();

        // Por ahora la acción no hace nada real — solo consume el turno
        // (Aquí se conectará la lógica de combate real en el futuro)

        // Avanzar al siguiente
        const nuevaRonda = TurnSystem.avanzar();

        // Pequeño delay para la transición
        setTimeout(() => {
            cargarPersonajeActual();
        }, 200);
    }

    function detener() {
        activo = false;
        SpriteAnimator.limpiar();
    }

    return { iniciar, ejecutarAccion, detener };
})();


// ══════════════════════════════════════════════════════════
// Selección de personajes (máx 3, con retratos)
// ══════════════════════════════════════════════════════════
const Seleccion = (() => {
    const MAX_EQUIPO = 3;
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

            // Retrato
            const img = document.createElement("img");
            img.className = "pj-retrato";
            img.src = pj.icon || PLACEHOLDER_ICON;
            img.alt = pj.nombre;
            img.onerror = () => { img.src = PLACEHOLDER_ICON; };
            card.appendChild(img);

            // Info
            const info = document.createElement("div");
            info.className = "pj-info";
            info.innerHTML = `
                <div class="pj-nombre">${pj.nombre}</div>
                <div class="pj-titulo">${pj.titulo}</div>
                <span class="pj-efecto efecto-${pj.efecto}">${pj.efecto}</span>
            `;
            card.appendChild(info);

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
// Menú y navegación
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
                ClassicGame.start(modo);
            },
        },
        {
            id: "lotus",
            nombre: "Lotus of the Damned",
            descripcion: "Combate por turnos contra un jefe legendario. Elige a tu equipo de guerreros.",
            tema: "tema-lotus",
            arranque: () => {
                Seleccion.init();
                mostrarPantalla(document.getElementById("pantalla-seleccion"));
            },
        },
    ];

    let indiceActual = 0;
    const pantallaTitulo = document.getElementById("pantalla-titulo");
    const pantallaModos  = document.getElementById("pantalla-modos");

    function mostrarPantalla(p) {
        document.querySelectorAll(".pantalla").forEach(el => el.classList.remove("activa"));
        p.classList.add("activa");
    }

    function aplicarTema(t) { document.body.className = t; }

    function renderizarModo() {
        const m = MODOS[indiceActual];
        document.getElementById("modo-nombre").textContent = m.nombre;
        document.getElementById("modo-descripcion").textContent = m.descripcion;
        aplicarTema(m.tema);
        document.getElementById("modos-indicadores").querySelectorAll(".indicador-dot")
            .forEach((d, i) => d.classList.toggle("activo", i === indiceActual));
    }

    function crearIndicadores() {
        const el = document.getElementById("modos-indicadores");
        el.innerHTML = "";
        MODOS.forEach((_, i) => {
            const d = document.createElement("span");
            d.className = "indicador-dot" + (i === 0 ? " activo" : "");
            d.addEventListener("click", () => { indiceActual = i; renderizarModo(); });
            el.appendChild(d);
        });
    }

    function prev() { indiceActual = (indiceActual - 1 + MODOS.length) % MODOS.length; renderizarModo(); }
    function next() { indiceActual = (indiceActual + 1) % MODOS.length; renderizarModo(); }
    function confirmar() { MODOS[indiceActual].arranque(MODOS[indiceActual]); }

    function volverAModos() {
        ClassicGame.stop();
        BattleScene.detener();
        aplicarTema(MODOS[indiceActual].tema);
        mostrarPantalla(pantallaModos);
    }

    function init() {
        crearIndicadores();
        renderizarModo();

        pantallaTitulo.addEventListener("click", () => mostrarPantalla(pantallaModos));
        document.getElementById("btn-modo-prev").addEventListener("click", prev);
        document.getElementById("btn-modo-next").addEventListener("click", next);
        document.getElementById("btn-jugar").addEventListener("click", confirmar);
        document.getElementById("btn-menu").addEventListener("click", volverAModos);
        document.getElementById("btn-combate-menu").addEventListener("click", volverAModos);
        document.getElementById("btn-volver-modos").addEventListener("click", volverAModos);

        // Confirmar equipo → iniciar combate
        document.getElementById("btn-confirmar-equipo").addEventListener("click", () => {
            const equipo = Seleccion.obtenerSeleccionados();
            if (equipo.length === 0) return;
            mostrarPantalla(document.getElementById("pantalla-combate"));
            BattleScene.iniciar(equipo);
        });

        // Botones de acción en combate
        document.getElementById("btn-atacar").addEventListener("click", () => BattleScene.ejecutarAccion("atacar"));
        document.getElementById("btn-defender").addEventListener("click", () => BattleScene.ejecutarAccion("defender"));

        // Teclado
        document.addEventListener("keydown", (e) => {
            if (pantallaModos.classList.contains("activa")) {
                if (e.key === "ArrowLeft") prev();
                if (e.key === "ArrowRight") next();
                if (e.key === "Enter") confirmar();
            }
            if (document.getElementById("pantalla-combate").classList.contains("activa")) {
                if (e.key === "1" || e.key === "a") BattleScene.ejecutarAccion("atacar");
                if (e.key === "2" || e.key === "d") BattleScene.ejecutarAccion("defender");
            }
        });
    }

    return { init, mostrarPantalla };
})();


// ══════════════════════════════════════════════════════════
// Juego Clásico (lógica original preservada)
// ══════════════════════════════════════════════════════════
const ClassicGame = (() => {
    const CONFIG = { ANCHO:30,ALTO:30,PROB_VACIO:.85,PROB_PERSONAJE:.05,RADIO_DETECCION:4,TAMANO_CELDA:20 };
    const BASE = { ...CONFIG };
    const T = { V:0,A:1,E:2,OX:3,OO:4,OZ:5 };
    let tab=[],mov=[],turno=0,intId=null,vel=100,activo=false;
    let canvas,ctx;

    function start(modo) {
        canvas = document.getElementById("tablero");
        ctx = canvas.getContext("2d");
        Object.assign(CONFIG, BASE, modo.config || {});
        turno=0; vel=parseInt(document.getElementById("rango-velocidad").value);
        document.getElementById("mensaje-final").className="oculto";
        crearTab(); ajustarCanvas(); dibujar(); contadores();
        document.getElementById("btn-iniciar").disabled=false;
        document.getElementById("btn-pausar").disabled=true;
        activo=false;
    }
    function stop(){ activo=false; if(intId){clearInterval(intId);intId=null;} }

    function crearTab(){tab=[];for(let i=0;i<CONFIG.ALTO;i++){const f=[];for(let j=0;j<CONFIG.ANCHO;j++)f.push(gen());tab.push(f)}}
    function gen(){const r=Math.random();if(r<CONFIG.PROB_VACIO)return T.V;if(r<CONFIG.PROB_VACIO+CONFIG.PROB_PERSONAJE)return Math.random()<.5?T.A:T.E;return[T.OX,T.OO,T.OZ][Math.floor(Math.random()*3)]}
    function resetMov(){mov=[];for(let i=0;i<CONFIG.ALTO;i++)mov.push(new Array(CONFIG.ANCHO).fill(false))}
    const DIRS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    function shuf(a){for(let k=a.length-1;k>0;k--){const r=Math.floor(Math.random()*(k+1));[a[k],a[r]]=[a[r],a[k]]}}
    function esP(t){return t===T.A||t===T.E}
    function esO(t){return t>=T.OX}
    function ok(i,j){return i>=0&&i<CONFIG.ALTO&&j>=0&&j<CONFIG.ANCHO}
    function cnt(t){let n=0;for(let i=0;i<CONFIG.ALTO;i++)for(let j=0;j<CONFIG.ANCHO;j++)if(tab[i][j]===t)n++;return n}

    function tick(){
        turno++;resetMov();
        // Combat
        const pl=[];for(let i=0;i<CONFIG.ALTO;i++)pl.push(new Array(CONFIG.ANCHO).fill(false));
        for(let i=0;i<CONFIG.ALTO;i++)for(let j=0;j<CONFIG.ANCHO;j++){
            const t=tab[i][j];if(!esP(t)||pl[i][j])continue;
            const en=buscar(i,j,t,1);if(en&&!pl[en.i][en.j]){
                if(Math.random()<.5)tab[i][j]=T.V;else tab[en.i][en.j]=T.V;pl[i][j]=true;pl[en.i][en.j]=true;}}
        const pos=[];for(let i=0;i<CONFIG.ALTO;i++)for(let j=0;j<CONFIG.ANCHO;j++)if(esP(tab[i][j]))pos.push({i,j});
        shuf(pos);
        for(const p of pos){const t=tab[p.i][p.j];if(!esP(t)||mov[p.i][p.j])continue;
            const en=buscar(p.i,p.j,t,CONFIG.RADIO_DETECCION);if(en)moverH(p.i,p.j,t,en);else moverR(p.i,p.j);}
        dibujar();contadores();checkFin();
    }
    function buscar(fi,fj,tipo,r){let b=Infinity,p=null;for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){if(!di&&!dj)continue;const ni=fi+di,nj=fj+dj;if(!ok(ni,nj))continue;const v=tab[ni][nj];if(esP(v)&&v!==tipo){const d=Math.abs(di)+Math.abs(dj);if(d<b){b=d;p={i:ni,j:nj}}}}return p}
    function moverR(fi,fj){const d=[...DIRS];shuf(d);for(const[di,dj]of d){const ni=fi+di,nj=fj+dj;if(ok(ni,nj)&&tab[ni][nj]===T.V){tab[ni][nj]=tab[fi][fj];tab[fi][fj]=T.V;mov[ni][nj]=true;return}}}
    function moverH(fi,fj,tipo,en){const di=Math.sign(en.i-fi),dj=Math.sign(en.j-fj);let pi,pj;if(tipo===T.A){pi=-di;pj=-dj}else{pi=di;pj=dj}const ni=fi+pi,nj=fj+pj;if(ok(ni,nj)&&tab[ni][nj]===T.V){tab[ni][nj]=tab[fi][fj];tab[fi][fj]=T.V;mov[ni][nj]=true}else moverR(fi,fj)}

    function ajustarCanvas(){const r=canvas.getBoundingClientRect();const s=Math.floor(r.width);canvas.width=s;canvas.height=s;CONFIG.TAMANO_CELDA=s/CONFIG.ANCHO}
    function dibujar(){const t=CONFIG.TAMANO_CELDA;ctx.clearRect(0,0,canvas.width,canvas.height);for(let i=0;i<CONFIG.ALTO;i++)for(let j=0;j<CONFIG.ANCHO;j++){const x=j*t,y=i*t;ctx.fillStyle=(i+j)%2===0?"#13131d":"#111119";ctx.fillRect(x,y,t,t);const tipo=tab[i][j],c=t/2;if(tipo===T.A){dpj(x,y,t,"#f5c842","#ffe066","Ö")}else if(tipo===T.E){dpj(x,y,t,"#e84545","#ff7070","Ü")}else if(esO(tipo)){ctx.fillStyle="#2a2a3a";ctx.font=`${t*.5}px 'JetBrains Mono',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(tipo===T.OX?"✕":tipo===T.OO?"◯":"▣",x+c,y+c+1)}}}
    function dpj(x,y,t,col,br,sym){const c=t/2;const g=ctx.createRadialGradient(x+c,y+c,t*.1,x+c,y+c,t*.6);g.addColorStop(0,br);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(x,y,t,t);ctx.fillStyle=col;ctx.font=`bold ${t*.65}px 'JetBrains Mono',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(sym,x+c,y+c+1)}
    function contadores(){document.getElementById("cuenta-aliados").textContent=cnt(T.A);document.getElementById("cuenta-enemigos").textContent=cnt(T.E);document.getElementById("cuenta-turno").textContent=turno}
    function checkFin(){const a=cnt(T.A),e=cnt(T.E);const mf=document.getElementById("mensaje-final");if(a===0&&e===0){stop();mf.textContent="🤝 Empate";mf.className="derrota"}else if(a===0){stop();mf.textContent="💀 Enemigos ganan";mf.className="derrota"}else if(e===0){stop();mf.textContent="🏆 Aliados ganan";mf.className="victoria"}}

    // Event bindings
    function bindEvents() {
        document.getElementById("btn-iniciar").addEventListener("click",()=>{if(activo)return;activo=true;document.getElementById("btn-iniciar").disabled=true;document.getElementById("btn-pausar").disabled=false;intId=setInterval(tick,vel)});
        document.getElementById("btn-pausar").addEventListener("click",()=>{if(!activo)return;activo=false;clearInterval(intId);intId=null;document.getElementById("btn-iniciar").disabled=false;document.getElementById("btn-pausar").disabled=true});
        document.getElementById("btn-reiniciar").addEventListener("click",()=>{stop();turno=0;document.getElementById("mensaje-final").className="oculto";crearTab();ajustarCanvas();dibujar();contadores();document.getElementById("btn-iniciar").disabled=false});
        const rv=document.getElementById("rango-velocidad");rv.addEventListener("input",()=>{vel=parseInt(rv.value);document.getElementById("texto-velocidad").textContent=vel+"ms";if(activo){clearInterval(intId);intId=setInterval(tick,vel)}});
        window.addEventListener("resize",()=>{if(document.getElementById("pantalla-juego").classList.contains("activa")&&canvas){ajustarCanvas();dibujar()}});
    }

    return { start, stop, bindEvents };
})();


// ══════════════════════════════════════════════════════════
// Arranque
// ══════════════════════════════════════════════════════════
ClassicGame.bindEvents();
Menu.init();
