# Game Bar

Juego web por turnos con múltiples modos de juego.

## Cómo ejecutar

Simplemente abre `index.html` en un navegador moderno. No necesita servidor, build tools ni dependencias.

Para desarrollo con live-reload, puedes usar cualquier servidor estático:
```bash
# Con Python
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con VS Code: instalar extensión "Live Server" y clic derecho → Open with Live Server
```

## Estructura de archivos

```
├── index.html          # Estructura HTML con todas las pantallas
├── styles.css          # Estilos y temas (Clásico / Lotus)
├── main.js             # Lógica: Menú, Selección, Turnos, Sprites, Combate
├── Backgrounds/        # Fondos de batalla
│   └── summer5/
│       └── Summer5.png # Fondo del combate Lotus
├── Sprites/            # Sprites de personajes
│   ├── Aiko/           # AikoIcon.png, AikoIdle.png (spritesheet)
│   ├── Ren/            # RenIcon.png, RenIdle.png
│   ├── Meilin/         # MeilinIdle.png
│   └── PlaceHolders/   # CharacterIconPlaceholder.png
└── README.md
```

## Añadir nuevos personajes

1. Crea una carpeta en `Sprites/NombrePersonaje/`
2. Añade `NombrePersonajeIcon.png` (retrato) y `NombrePersonajeIdle.png` (spritesheet)
3. En `main.js`, añade la entrada en el array `PERSONAJES` con las dimensiones del spritesheet
