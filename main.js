// main.js — Game Bar
"use strict";

// ══════════════════════════════════════════════════════════
// Datos
// ══════════════════════════════════════════════════════════
const PERSONAJES = [
    { id:"aiko",   nombre:"Aiko",   titulo:"la Espada Carmesí",         efecto:"sangrado", atk:45, hp:120,
      icon:"Sprites/Aiko/AikoIcon.png",
      idle:{ src:"Sprites/Aiko/AikoIdle.png", cols:6, rows:6, total:36, fw:518, fh:584 } },
    { id:"ren",    nombre:"Ren",    titulo:"el Cazador Silencioso",     efecto:"ruptura",  atk:50, hp:100,
      icon:"Sprites/Ren/RenIcon.png",
      idle:{ src:"Sprites/Ren/RenIdle.png", cols:6, rows:6, total:36, fw:458, fh:570 } },
    { id:"meilin", nombre:"Meilin", titulo:"Sacerdotisa del Trueno",    efecto:"choque",   atk:40, hp:130,
      icon:"Sprites/Meilin/MeilinIcon.png",
      idle:{ src:"Sprites/Meilin/MeilinIdle.png", cols:6, rows:6, total:36, fw:336, fh:706 } },
];
const SLIME = { id:"slime", nombre:"Slime", atk:18, hp:300, icon:"Enemies/Domain1/Slime/SlimeIcon.png",
    idle:{ src:"Enemies/Domain1/Slime/SlimeIdle.png", cols:6, rows:6, total:36, fw:544, fh:514 }, pingPong:true };
const PLACEHOLDER_ICON = "Sprites/PlaceHolders/CharacterIconPlaceholder.png";
const BATTLE_MUSIC = ["Audio/MUSIC/Still-Move-Forward-Xenoblade-Chronicles-2-OST.mp3","Audio/MUSIC/Unfinished-Business-Xenoblade-Chronicles-Definitive-Edition-OST.mp3"];

// ══════════════════════════════════════════════════════════
// AudioMgr
// ══════════════════════════════════════════════════════════
const AudioMgr = (() => {
    let audio = null, vol = 0.5;
    function play() { stop(); const s=BATTLE_MUSIC[Math.floor(Math.random()*BATTLE_MUSIC.length)]; audio=new Audio(s); audio.loop=true; audio.volume=vol; audio.play().catch(()=>{}); }
    function stop() { if(audio){audio.pause();audio.currentTime=0;audio=null;} }
    function setVolume(v) { vol=v; if(audio) audio.volume=v; }
    function getVolume() { return vol; }
    function pause() { if(audio) audio.pause(); }
    function resume() { if(audio) audio.play().catch(()=>{}); }
    return { play, stop, setVolume, getVolume, pause, resume };
})();

// ══════════════════════════════════════════════════════════
// SpriteEngine — múltiples canvas simultáneos
// ══════════════════════════════════════════════════════════
const SpriteEngine = (() => {
    const anims = new Map();
    const FPS = 10, interval = 1000/FPS;
    function iniciar(id, canvas, data, pingPong=false) {
        detener(id);
        const ctx = canvas.getContext("2d");
        canvas.width = data.fw; canvas.height = data.fh;
        const img = new Image();
        img.onload = () => { const s={canvas,ctx,img,data,frame:0,dir:1,pingPong,animId:null,last:0}; anims.set(id,s); loop(id); };
        img.src = data.src;
    }
    function loop(id) {
        const s=anims.get(id); if(!s) return;
        function tick(t) {
            s.animId=requestAnimationFrame(tick);
            if(t-s.last<interval) return; s.last=t;
            const {ctx,img,data,canvas}=s, col=s.frame%data.cols, row=Math.floor(s.frame/data.cols);
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(img, col*data.fw, row*data.fh, data.fw, data.fh, 0, 0, data.fw, data.fh);
            if(s.pingPong){s.frame+=s.dir;if(s.frame>=data.total-1)s.dir=-1;else if(s.frame<=0)s.dir=1;}
            else s.frame=(s.frame+1)%data.total;
        }
        s.animId=requestAnimationFrame(tick);
    }
    function detener(id){const s=anims.get(id);if(s&&s.animId)cancelAnimationFrame(s.animId);anims.delete(id);}
    function detenerTodo(){anims.forEach(s=>{if(s.animId)cancelAnimationFrame(s.animId);});anims.clear();}
    function dibujarIcono(canvas, iconSrc){
        canvas.width=300;canvas.height=400;const ctx=canvas.getContext("2d");const img=new Image();
        img.onload=()=>{const sc=Math.min(canvas.width/img.width,canvas.height/img.height)*.8;const w=img.width*sc,h=img.height*sc;ctx.drawImage(img,(canvas.width-w)/2,canvas.height-h,w,h);};
        img.src=iconSrc;
    }
    return { iniciar, detener, detenerTodo, dibujarIcono };
})();

// ══════════════════════════════════════════════════════════
// Camera — zoom agresivo + posiciona ActionMenu junto al actor
// ══════════════════════════════════════════════════════════
const Camera = (() => {
    let campo=null, viewport=null;
    const ZOOM = 2.8;
    function init(){campo=document.getElementById("batalla-campo");viewport=document.getElementById("batalla-viewport");}

    function zoomTo(element) {
        if(!campo||!element||!viewport) return;
        const vpW=viewport.clientWidth, vpH=viewport.clientHeight;
        const pX=parseFloat(element.style.left)/100, pY=parseFloat(element.style.top)/100;
        let tx=(vpW/2)-(pX*vpW*ZOOM), ty=(vpH/2)-(pY*vpH*ZOOM) -50 ;
        tx=Math.min(0,Math.max(vpW-vpW*ZOOM, tx));
        ty=Math.min(0,Math.max(vpH-vpH*ZOOM, ty));
        campo.style.transformOrigin="0 0";
        campo.style.transform=`translate(${tx}px,${ty}px) scale(${ZOOM})`;
        // Todos los actores permanecen visibles durante el zoom
        // Posicionar ActionMenu al lado derecho del actor (en coordenadas de viewport)
        posicionarMenu(element, pX, pY, tx, ty, vpW, vpH);
    }

    function posicionarMenu(element, pX, pY, tx, ty, vpW, vpH) {
        // Posición del actor en pantalla después del zoom
        const actorScreenX = pX * vpW * ZOOM + tx;
        const actorScreenY = pY * vpH * ZOOM + ty;
        // El menú va a la derecha del actor, centrado verticalmente
        const menuX = actorScreenX + vpW * 0.15; // offset a la derecha
        const menuY = actorScreenY - vpH * 0.15;  // un poco arriba del centro
        // Aplicar a ambos menús
        ['action-menu','attack-menu'].forEach(id => {
            const el = document.getElementById(id);
            el.style.left = Math.max(0, Math.min(vpW * 0.65, menuX)) + 'px';
            el.style.top = Math.max(vpH * 0.05, Math.min(vpH * 0.55, menuY)) + 'px';
        });
    }

    function reset(){
        if(campo){campo.style.transformOrigin="0 0";campo.style.transform='translate(0,0) scale(1)';}
    }
    return { init, zoomTo, reset };
})();

// ══════════════════════════════════════════════════════════
// TurnSystem — aliados + enemigo
// ══════════════════════════════════════════════════════════
const TurnSystem = (() => {
    let actores=[],orden=[],pos=0,ronda=0;
    function iniciar(aliados,enemigo){
        actores=[];
        aliados.forEach((p,i)=>actores.push({...p,hpActual:p.hp,vivo:true,tipo:'aliado',slotId:`aliado-${i}`}));
        actores.push({...enemigo,hpActual:enemigo.hp,vivo:true,tipo:'enemigo',slotId:'enemigo-slot'});
        ronda=0; nuevaRonda();
    }
    function nuevaRonda(){
        const v=[];actores.forEach((a,i)=>{if(a.vivo)v.push(i);});
        for(let k=v.length-1;k>0;k--){const r=Math.floor(Math.random()*(k+1));[v[k],v[r]]=[v[r],v[k]];}
        orden=v;pos=0;
    }
    function actual(){return pos<orden.length?actores[orden[pos]]:null;}
    function avanzar(){pos++;if(pos>=orden.length){ronda++;nuevaRonda();return true;}return false;}
    function getRonda(){return ronda;}
    function getOrden(){return orden;}
    function getPos(){return pos;}
    function getActores(){return actores;}
    function getEnemigo(){return actores.find(a=>a.tipo==='enemigo');}
    function getAliados(){return actores.filter(a=>a.tipo==='aliado');}
    function danar(idx,cant){const a=actores[idx];if(!a||!a.vivo)return 0;const r=Math.min(a.hpActual,Math.max(0,Math.round(cant)));a.hpActual-=r;if(a.hpActual<=0){a.hpActual=0;a.vivo=false;}return r;}
    return {iniciar,actual,avanzar,getRonda,getOrden,getPos,getActores,getEnemigo,getAliados,danar};
})();

// ══════════════════════════════════════════════════════════
// BattleScene
// ══════════════════════════════════════════════════════════
const BattleScene = (() => {
    let activo=false, pausado=false;

    function iniciar(personajes) {
        activo=true; pausado=false;
        Camera.init();
        TurnSystem.iniciar(personajes, {...SLIME});
        // Iniciar sprites
        TurnSystem.getActores().forEach(a => {
            const slot=document.getElementById(a.slotId); if(!slot) return;
            const cv=slot.querySelector('.actor-canvas');
            if(a.idle) SpriteEngine.iniciar(a.slotId, cv, a.idle, a.pingPong||false);
            else SpriteEngine.dibujarIcono(cv, a.icon);
            const hp=slot.querySelector('.hp-bar-wrapper'); hp.classList.remove('oculto');
            actualizarHP(a,slot);
        });
        // Generar botones de ataque
        generarBotonesAtaque();
        AudioMgr.play();
        document.getElementById("vol-slider").value = AudioMgr.getVolume()*100;
        renderTurnBar();
        iniciarTurno();
    }

    function generarBotonesAtaque() {
        const grid = document.getElementById("atk-grid");
        grid.innerHTML = "";
        for(let i=1;i<=4;i++){
            const btn=document.createElement("button");
            btn.className="atk-btn";
            btn.innerHTML=`<img src="Assets/BotonVacio.png"><span>Ataque ${i}</span>`;
            btn.addEventListener("click", () => ejecutarAtaque(i));
            grid.appendChild(btn);
        }
    }

    function renderTurnBar(){
        const orden=TurnSystem.getOrden(),p=TurnSystem.getPos(),act=TurnSystem.getActores();
        document.getElementById("turnbar-counter-text").textContent=`Turno ${TurnSystem.getRonda()}`;
        const c=document.getElementById("turnbar-icons"); c.innerHTML="";
        orden.forEach((idx,i)=>{
            const a=act[idx],d=document.createElement("div");
            d.className="turnbar-icon";
            if(i===p)d.classList.add("tb-activo");if(i<p)d.classList.add("tb-done");
            const img=document.createElement("img");img.src=a.icon||PLACEHOLDER_ICON;d.appendChild(img);c.appendChild(d);
        });
    }

    function actualizarHP(actor, slot){
        if(!slot) slot=document.getElementById(actor.slotId); if(!slot) return;
        const fill=slot.querySelector('.hp-bar-fill'),txt=slot.querySelector('.hp-text');
        const pct=Math.max(0,actor.hpActual/actor.hp)*92;
        fill.style.width=pct+'%';
        fill.style.background=actor.hpActual>0?'#d91600':'#524149';
        txt.textContent=`${actor.hpActual}/${actor.hp}`;
    }

    function iniciarTurno(){
        if(!activo||pausado) return;
        const actor=TurnSystem.actual();
        if(!actor) return;
        // Skip dead actors (shouldn't happen with nuevaRonda filter, but safety)
        if(!actor.vivo){ avanzarTurno(); return; }
        document.querySelectorAll('.campo-actor').forEach(el=>el.classList.remove('activo-turno'));
        const slot=document.getElementById(actor.slotId);
        if(slot) slot.classList.add('activo-turno');
        Camera.zoomTo(slot);

        // Ocultar ambos menús primero
        document.getElementById("action-menu").classList.add("oculto");
        document.getElementById("attack-menu").classList.add("oculto");

        if(actor.tipo==='aliado'){
            // Mostrar ActionMenu tras un pequeño delay para que el zoom se complete
            setTimeout(()=>{
                const am=document.getElementById("action-menu");
                am.classList.remove("oculto");
                document.getElementById("action-menu-name").textContent=actor.nombre;
            }, 400);
        } else {
            setTimeout(()=>{if(activo&&!pausado)accionEnemigo();},1200);
        }
        renderTurnBar();
    }

    // Jugador pulsa "Atacar" → mostrar AttackMenu
    function mostrarMenuAtaque(){
        document.getElementById("action-menu").classList.add("oculto");
        document.getElementById("attack-menu").classList.remove("oculto");
    }

    // Jugador pulsa "Volver" en AttackMenu → volver a ActionMenu
    function volverActionMenu(){
        document.getElementById("attack-menu").classList.add("oculto");
        document.getElementById("action-menu").classList.remove("oculto");
    }

    // Jugador elige un ataque
    function ejecutarAtaque(num){
        if(!activo||pausado) return;
        const actor=TurnSystem.actual();
        if(!actor||actor.tipo!=='aliado') return;
        document.getElementById("attack-menu").classList.add("oculto");
        // Daño al enemigo
        const enemigo=TurnSystem.getEnemigo();
        if(enemigo&&enemigo.vivo){
            const idx=TurnSystem.getActores().indexOf(enemigo);
            TurnSystem.danar(idx, actor.atk);
            actualizarHP(enemigo);
        }
        // Comprobar victoria
        if(checkFinCombate()) return;
        setTimeout(()=>avanzarTurno(),600);
    }

    // Jugador pulsa "Defender"
    function ejecutarDefender(){
        if(!activo||pausado) return;
        document.getElementById("action-menu").classList.add("oculto");
        setTimeout(()=>avanzarTurno(),400);
    }

    function accionEnemigo(){
        if(!activo||pausado) return;
        const enemigo=TurnSystem.actual();
        if(!enemigo||enemigo.tipo!=='enemigo') return;
        const aliados=TurnSystem.getAliados().filter(a=>a.vivo);
        if(aliados.length>0){
            const obj=aliados[Math.floor(Math.random()*aliados.length)];
            const idx=TurnSystem.getActores().indexOf(obj);
            TurnSystem.danar(idx, enemigo.atk);
            actualizarHP(obj);
        }
        // Comprobar derrota
        if(checkFinCombate()) return;
        setTimeout(()=>avanzarTurno(),600);
    }

    // Comprueba si el combate ha terminado
    function checkFinCombate(){
        const enemigo=TurnSystem.getEnemigo();
        const aliadosVivos=TurnSystem.getAliados().filter(a=>a.vivo);
        if(enemigo && !enemigo.vivo){
            // Victoria
            setTimeout(()=>mostrarResultado('Assets/VictoryScreen.png'),800);
            return true;
        }
        if(aliadosVivos.length===0){
            // Derrota
            setTimeout(()=>mostrarResultado('Assets/DefeatScreen.png'),800);
            return true;
        }
        return false;
    }

    // Muestra pantalla de resultado con fade, click vuelve al menú
    function mostrarResultado(imgSrc){
        activo=false;
        AudioMgr.stop();
        // Ocultar menús de acción
        document.getElementById("action-menu").classList.add("oculto");
        document.getElementById("attack-menu").classList.add("oculto");
        // Crear overlay de resultado
        const overlay=document.createElement("div");
        overlay.id="resultado-overlay";
        overlay.style.cssText="position:absolute;inset:0;z-index:200;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .8s ease;";
        const img=document.createElement("img");
        img.src=imgSrc;
        img.style.cssText="max-width:80%;max-height:80%;opacity:0;transition:opacity 1s ease;";
        overlay.appendChild(img);
        document.getElementById("pantalla-combate").appendChild(overlay);
        // Fade in
        requestAnimationFrame(()=>{
            overlay.style.background="rgba(0,0,0,0.7)";
            img.style.opacity="1";
        });
        // Click para volver al menú
        overlay.addEventListener("click",()=>{
            overlay.remove();
            BattleScene.detener();
            Menu.volverAModos();
        });
    }

    function avanzarTurno(){
        if(!activo) return;
        TurnSystem.avanzar();
        iniciarTurno();
    }

    function pausar(){pausado=true;AudioMgr.pause();document.getElementById("pause-overlay").classList.remove("oculto");}
    function continuar(){
        pausado=false;document.getElementById("pause-overlay").classList.add("oculto");AudioMgr.resume();
        const a=TurnSystem.actual();
        if(a&&a.tipo==='enemigo')setTimeout(()=>{if(activo&&!pausado)accionEnemigo();},500);
    }
    function detener(){
        activo=false;pausado=false;SpriteEngine.detenerTodo();AudioMgr.stop();Camera.reset();
        document.getElementById("pause-overlay").classList.add("oculto");
        document.getElementById("action-menu").classList.add("oculto");
        document.getElementById("attack-menu").classList.add("oculto");
        const res=document.getElementById("resultado-overlay"); if(res) res.remove();
        document.querySelectorAll('.campo-actor').forEach(el=>el.classList.remove('activo-turno'));
        document.querySelectorAll('.hp-bar-wrapper').forEach(el=>el.classList.add('oculto'));
    }

    return { iniciar, mostrarMenuAtaque, volverActionMenu, ejecutarDefender, pausar, continuar, detener };
})();

// ══════════════════════════════════════════════════════════
// Selección de personajes
// ══════════════════════════════════════════════════════════
const Seleccion = (() => {
    const MAX=3; let sel=new Set();
    function init(){sel.clear();renderGrid();renderEquipo();document.getElementById("btn-confirmar-equipo").disabled=true;}
    function renderGrid(){
        const g=document.getElementById("grid-personajes");g.innerHTML="";
        PERSONAJES.forEach(pj=>{
            const c=document.createElement("div");c.className="tarjeta-personaje";
            if(sel.has(pj.id))c.classList.add("seleccionado");
            if(!sel.has(pj.id)&&sel.size>=MAX)c.classList.add("deshabilitado");
            const img=document.createElement("img");img.className="pj-retrato";img.src=pj.icon||PLACEHOLDER_ICON;img.onerror=()=>{img.src=PLACEHOLDER_ICON;};c.appendChild(img);
            const info=document.createElement("div");info.className="pj-info";
            info.innerHTML=`<div class="pj-nombre">${pj.nombre}</div><div class="pj-titulo">${pj.titulo}</div><span class="pj-efecto efecto-${pj.efecto}">${pj.efecto}</span>`;
            c.appendChild(info);c.addEventListener("click",()=>toggle(pj.id));g.appendChild(c);
        });
    }
    function toggle(id){if(sel.has(id))sel.delete(id);else if(sel.size<MAX)sel.add(id);renderGrid();renderEquipo();}
    function renderEquipo(){
        const s=document.getElementById("equipo-slots");s.innerHTML="";
        sel.forEach(id=>{const pj=PERSONAJES.find(p=>p.id===id);const sp=document.createElement("span");sp.className="equipo-slot";sp.textContent=pj.nombre;s.appendChild(sp);});
        document.getElementById("equipo-contador").textContent=`${sel.size} / ${MAX}`;
        document.getElementById("btn-confirmar-equipo").disabled=sel.size===0;
    }
    function obtenerSeleccionados(){return PERSONAJES.filter(p=>sel.has(p.id));}
    return {init,obtenerSeleccionados};
})();

// ══════════════════════════════════════════════════════════
// Menú
// ══════════════════════════════════════════════════════════
const Menu = (() => {
    const MODOS=[
        {id:"clasico",nombre:"Clásico",descripcion:"Dos bandos luchan en una cuadrícula 30×30.",tema:"tema-default",
         arranque:(m)=>{mostrarPantalla(document.getElementById("pantalla-juego"));ClassicGame.start(m);}},
        {id:"lotus",nombre:"Lotus of the Damned",descripcion:"Combate por turnos contra un jefe legendario.",tema:"tema-lotus",
         arranque:()=>{Seleccion.init();mostrarPantalla(document.getElementById("pantalla-seleccion"));}},
    ];
    let idx=0;
    const pT=document.getElementById("pantalla-titulo"),pM=document.getElementById("pantalla-modos");
    function mostrarPantalla(p){document.querySelectorAll(".pantalla").forEach(el=>el.classList.remove("activa"));p.classList.add("activa");}
    function tema(t){document.body.className=t;}
    function render(){const m=MODOS[idx];document.getElementById("modo-nombre").textContent=m.nombre;document.getElementById("modo-descripcion").textContent=m.descripcion;tema(m.tema);document.getElementById("modos-indicadores").querySelectorAll(".indicador-dot").forEach((d,i)=>d.classList.toggle("activo",i===idx));}
    function dots(){const el=document.getElementById("modos-indicadores");el.innerHTML="";MODOS.forEach((_,i)=>{const d=document.createElement("span");d.className="indicador-dot"+(i===0?" activo":"");d.addEventListener("click",()=>{idx=i;render();});el.appendChild(d);});}
    function prev(){idx=(idx-1+MODOS.length)%MODOS.length;render();}
    function next(){idx=(idx+1)%MODOS.length;render();}
    function confirmar(){MODOS[idx].arranque(MODOS[idx]);}
    function volverAModos(){ClassicGame.stop();BattleScene.detener();tema(MODOS[idx].tema);mostrarPantalla(pM);}
    function init(){
        dots();render();
        pT.addEventListener("click",()=>mostrarPantalla(pM));
        document.getElementById("btn-modo-prev").addEventListener("click",prev);
        document.getElementById("btn-modo-next").addEventListener("click",next);
        document.getElementById("btn-jugar").addEventListener("click",confirmar);
        document.getElementById("btn-menu").addEventListener("click",volverAModos);
        document.getElementById("btn-volver-modos").addEventListener("click",volverAModos);
        document.getElementById("btn-confirmar-equipo").addEventListener("click",()=>{
            const eq=Seleccion.obtenerSeleccionados();if(eq.length===0)return;
            mostrarPantalla(document.getElementById("pantalla-combate"));BattleScene.iniciar(eq);
        });
        // Combat buttons
        document.getElementById("am-atacar").addEventListener("click",()=>BattleScene.mostrarMenuAtaque());
        document.getElementById("am-defender").addEventListener("click",()=>BattleScene.ejecutarDefender());
        document.getElementById("atk-volver").addEventListener("click",()=>BattleScene.volverActionMenu());
        document.getElementById("hud-pause").addEventListener("click",()=>BattleScene.pausar());
        document.getElementById("btn-continue").addEventListener("click",()=>BattleScene.continuar());
        document.getElementById("btn-exit").addEventListener("click",()=>volverAModos());
        document.getElementById("vol-slider").addEventListener("input",e=>{AudioMgr.setVolume(parseInt(e.target.value)/100);});
        document.addEventListener("keydown",e=>{
            if(pM.classList.contains("activa")){if(e.key==="ArrowLeft")prev();if(e.key==="ArrowRight")next();if(e.key==="Enter")confirmar();}
            if(document.getElementById("pantalla-combate").classList.contains("activa")&&e.key==="Escape")BattleScene.pausar();
        });
    }
    return {init,mostrarPantalla,volverAModos};
})();

// ══════════════════════════════════════════════════════════
// ClassicGame (preservado)
// ══════════════════════════════════════════════════════════
const ClassicGame=(()=>{
    const C={ANCHO:30,ALTO:30,PROB_VACIO:.85,PROB_PERSONAJE:.05,RADIO_DETECCION:4,TAMANO_CELDA:20};const B={...C};const T={V:0,A:1,E:2,OX:3,OO:4,OZ:5};
    let tab=[],mov=[],turno=0,intId=null,vel=100,act=false,canvas,ctx;
    function start(m){canvas=document.getElementById("tablero");ctx=canvas.getContext("2d");Object.assign(C,B,m.config||{});turno=0;vel=parseInt(document.getElementById("rango-velocidad").value);document.getElementById("mensaje-final").className="oculto";crearTab();ajustarCanvas();dibujar();contadores();document.getElementById("btn-iniciar").disabled=false;document.getElementById("btn-pausar").disabled=true;act=false;}
    function stop(){act=false;if(intId){clearInterval(intId);intId=null;}}
    function crearTab(){tab=[];for(let i=0;i<C.ALTO;i++){const f=[];for(let j=0;j<C.ANCHO;j++)f.push(gen());tab.push(f);}}
    function gen(){const r=Math.random();if(r<C.PROB_VACIO)return T.V;if(r<C.PROB_VACIO+C.PROB_PERSONAJE)return Math.random()<.5?T.A:T.E;return[T.OX,T.OO,T.OZ][Math.floor(Math.random()*3)];}
    function resetMov(){mov=[];for(let i=0;i<C.ALTO;i++)mov.push(new Array(C.ANCHO).fill(false));}
    const DIRS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    function shuf(a){for(let k=a.length-1;k>0;k--){const r=Math.floor(Math.random()*(k+1));[a[k],a[r]]=[a[r],a[k]];}}
    function esP(t){return t===T.A||t===T.E}function ok(i,j){return i>=0&&i<C.ALTO&&j>=0&&j<C.ANCHO}
    function cnt(t){let n=0;for(let i=0;i<C.ALTO;i++)for(let j=0;j<C.ANCHO;j++)if(tab[i][j]===t)n++;return n;}
    function tick(){turno++;resetMov();const pl=[];for(let i=0;i<C.ALTO;i++)pl.push(new Array(C.ANCHO).fill(false));for(let i=0;i<C.ALTO;i++)for(let j=0;j<C.ANCHO;j++){const t=tab[i][j];if(!esP(t)||pl[i][j])continue;const en=buscar(i,j,t,1);if(en&&!pl[en.i][en.j]){if(Math.random()<.5)tab[i][j]=T.V;else tab[en.i][en.j]=T.V;pl[i][j]=true;pl[en.i][en.j]=true;}}const pos=[];for(let i=0;i<C.ALTO;i++)for(let j=0;j<C.ANCHO;j++)if(esP(tab[i][j]))pos.push({i,j});shuf(pos);for(const p of pos){const t=tab[p.i][p.j];if(!esP(t)||mov[p.i][p.j])continue;const en=buscar(p.i,p.j,t,C.RADIO_DETECCION);if(en)moverH(p.i,p.j,t,en);else moverR(p.i,p.j);}dibujar();contadores();checkFin();}
    function buscar(fi,fj,tipo,r){let b=Infinity,p=null;for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){if(!di&&!dj)continue;const ni=fi+di,nj=fj+dj;if(!ok(ni,nj))continue;const v=tab[ni][nj];if(esP(v)&&v!==tipo){const d=Math.abs(di)+Math.abs(dj);if(d<b){b=d;p={i:ni,j:nj};}}}return p;}
    function moverR(fi,fj){const d=[...DIRS];shuf(d);for(const[di,dj]of d){const ni=fi+di,nj=fj+dj;if(ok(ni,nj)&&tab[ni][nj]===T.V){tab[ni][nj]=tab[fi][fj];tab[fi][fj]=T.V;mov[ni][nj]=true;return;}}}
    function moverH(fi,fj,tipo,en){const di=Math.sign(en.i-fi),dj=Math.sign(en.j-fj);let pi,pj;if(tipo===T.A){pi=-di;pj=-dj;}else{pi=di;pj=dj;}const ni=fi+pi,nj=fj+pj;if(ok(ni,nj)&&tab[ni][nj]===T.V){tab[ni][nj]=tab[fi][fj];tab[fi][fj]=T.V;mov[ni][nj]=true;}else moverR(fi,fj);}
    function ajustarCanvas(){const r=canvas.getBoundingClientRect();const s=Math.floor(r.width);canvas.width=s;canvas.height=s;C.TAMANO_CELDA=s/C.ANCHO;}
    function dibujar(){const t=C.TAMANO_CELDA;ctx.clearRect(0,0,canvas.width,canvas.height);for(let i=0;i<C.ALTO;i++)for(let j=0;j<C.ANCHO;j++){const x=j*t,y=i*t;ctx.fillStyle=(i+j)%2===0?"#13131d":"#111119";ctx.fillRect(x,y,t,t);const tipo=tab[i][j],c=t/2;if(tipo===T.A)dpj(x,y,t,"#f5c842","#ffe066","Ö");else if(tipo===T.E)dpj(x,y,t,"#e84545","#ff7070","Ü");else if(tipo>=T.OX){ctx.fillStyle="#2a2a3a";ctx.font=`${t*.5}px 'JetBrains Mono',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(tipo===T.OX?"✕":tipo===T.OO?"◯":"▣",x+c,y+c+1);}}}
    function dpj(x,y,t,col,br,sym){const c=t/2;const g=ctx.createRadialGradient(x+c,y+c,t*.1,x+c,y+c,t*.6);g.addColorStop(0,br);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(x,y,t,t);ctx.fillStyle=col;ctx.font=`bold ${t*.65}px 'JetBrains Mono',monospace`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(sym,x+c,y+c+1);}
    function contadores(){document.getElementById("cuenta-aliados").textContent=cnt(T.A);document.getElementById("cuenta-enemigos").textContent=cnt(T.E);document.getElementById("cuenta-turno").textContent=turno;}
    function checkFin(){const a=cnt(T.A),e=cnt(T.E);const mf=document.getElementById("mensaje-final");if(a===0&&e===0){stop();mf.textContent="🤝 Empate";mf.className="derrota";}else if(a===0){stop();mf.textContent="💀 Enemigos ganan";mf.className="derrota";}else if(e===0){stop();mf.textContent="🏆 Aliados ganan";mf.className="victoria";}}
    function bindEvents(){
        document.getElementById("btn-iniciar").addEventListener("click",()=>{if(act)return;act=true;document.getElementById("btn-iniciar").disabled=true;document.getElementById("btn-pausar").disabled=false;intId=setInterval(tick,vel);});
        document.getElementById("btn-pausar").addEventListener("click",()=>{if(!act)return;act=false;clearInterval(intId);intId=null;document.getElementById("btn-iniciar").disabled=false;document.getElementById("btn-pausar").disabled=true;});
        document.getElementById("btn-reiniciar").addEventListener("click",()=>{stop();turno=0;document.getElementById("mensaje-final").className="oculto";crearTab();ajustarCanvas();dibujar();contadores();document.getElementById("btn-iniciar").disabled=false;});
        const rv=document.getElementById("rango-velocidad");rv.addEventListener("input",()=>{vel=parseInt(rv.value);document.getElementById("texto-velocidad").textContent=vel+"ms";if(act){clearInterval(intId);intId=setInterval(tick,vel);}});
        window.addEventListener("resize",()=>{if(document.getElementById("pantalla-juego").classList.contains("activa")&&canvas){ajustarCanvas();dibujar();}});
    }
    return {start,stop,bindEvents};
})();

// ══════════════════════════════════════════════════════════
// Arranque
// ══════════════════════════════════════════════════════════
ClassicGame.bindEvents();
Menu.init();