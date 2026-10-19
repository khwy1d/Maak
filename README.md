# MAAK | معك — Website

Bilingual (Arabic default / English), RTL/LTR, light/dark travel-services website.
React + Vite + TypeScript, plain CSS, `lucide-react` icons. No backend, no tracking.

## Run
```bash
npm install
npm run dev        # development server
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```
Requires Node.js 18+.

## Configure
- **WhatsApp number & contact details:** `src/config/site.ts`. The number is a **placeholder** (`+000 000 000 0000`);
  replace it with the real one. Digits are extracted automatically for the `wa.me` link. Set `email` / `address`
  to show them in the Contact section (hidden while empty).
- **Copy / translations:** `src/i18n/translations.ts` (all user-facing text, including prefilled WhatsApp messages).
- **Colours:** CSS variables at the top of `src/styles/global.css`.
- **Logo:** `src/assets/logo.png` and `public/favicon.png` (the supplied logo; only surrounding whitespace trimmed).
  If you have a transparent PNG/SVG version, replace these files directly.

## Structure
`src/components` (UI + sections), `src/context` (language/theme state, persisted in localStorage),
`src/i18n`, `src/config`, `src/utils/whatsapp.ts`, `src/hooks`, `src/styles`.
