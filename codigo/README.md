# Profe — PWA de inglés

React + TypeScript + Tailwind (Vite). Sin backend: todo se guarda en localStorage.

## Usar
```
npm install
npm run dev        # desarrollo
npm run build      # genera dist/ (PWA lista para subir)
```

## Instalar en el celular
Sube la carpeta `dist/` a cualquier hosting HTTPS (Netlify Drop, Vercel, GitHub Pages).
- iPhone: Safari → Compartir → "Agregar a pantalla de inicio".
- Android: Chrome → menú → "Instalar app".

## Estructura
- `src/lib/content.ts` — banco de unidades, palabras, gramática y situaciones (agrega contenido aquí).
- `src/lib/engine.ts` — motor adaptativo (mastery 0–100, repetición espaciada, selección de lecciones/quizzes/examen), racha, estadísticas y persistencia.
- `src/components/Session.tsx` — ejecuta lecciones, quizzes, examen y test de nivel.
- `src/screens/*` — Onboarding, Hoy, Lecciones, Speaking, Exámenes, Vocabulario, Progreso.
- `src/lib/speaking.ts` — Speaking: voz (Web Speech API), tutor demo local o Claude (API de Anthropic), detección de errores, Speaking Review y conexión con el motor adaptativo.

## Speaking
- Micrófono y voz usan las funciones del navegador: funciona en Chrome (Android/PC) y Safari (iPhone) con la app servida por HTTPS. Firefox no reconoce voz; ahí se escribe.
- Tutor demo: sin internet ni cuenta, respuestas por reglas (no es IA real).
- Tutor Claude: en Speaking → Tutor → Claude (API), pega tu API key de console.anthropic.com. Se guarda solo en el dispositivo.
- `public/manifest.webmanifest`, `public/sw.js` — PWA.
