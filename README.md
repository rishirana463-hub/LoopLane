# LoopLane

A mobile-first JavaScript learning app with bite-sized lessons, instant feedback, and progress that stays with you offline.

**[Open the live app](https://looplane-jogger.vercel.app/)** · **[Privacy policy](https://looplane-jogger.vercel.app/privacy)**

![LoopLane dashboard with a JavaScript learning path and progress panels](docs/screenshots/home-desktop.jpg)

## Overview

LoopLane turns JavaScript fundamentals into short, interactive practice sessions. Follow a sequential learning path, answer questions, write small functions, and revisit mistakes. Start as a guest or connect an account to sync progress across devices.

The app includes **4 units, 15 lessons, and 77 questions**, including two coding exercises.

## Features

- **Interactive lessons:** multiple choice, fill-in-the-blank, code reordering, output prediction, and in-browser coding exercises.
- **Learning progress:** sequential lesson unlocking, XP, levels, local-calendar-day streaks, and daily goals of 10, 20, or 30 XP.
- **Practice and recovery:** five hearts with timed regeneration, perfect-run bonuses, mistake review, and streak freezes.
- **Local-first learning:** guest progress is saved on the device; optional Supabase accounts add email/Google sign-in and cloud sync with retry behavior.
- **Offline support:** installable PWA with cached app files, curriculum, and feedback sounds after an initial online load.
- **Original interface:** a responsive lavender design, custom coding mascot, keyboard focus states, and reduced-motion support.

## Curriculum

| Unit | Lessons | Topics |
| --- | ---: | --- |
| Basics | 3 | Variables, data types, operators |
| Logic | 2 | Conditionals, functions |
| Loops & Arrays | 5 | For loops, while loops, indexing, push/pop, array length |
| Objects & Methods | 5 | Objects, properties, map, filter, template literals |

Most lessons contain five questions. The Functions lesson contains seven, including two coding exercises. Curriculum content lives in [src/data/lessons.json](src/data/lessons.json).

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, JavaScript / JSX |
| Build tooling | Vite |
| Styling | Tailwind CSS and custom CSS |
| Animation | Framer Motion |
| Optional authentication and database | Supabase |
| Offline support | vite-plugin-pwa / Workbox |
| Hosting | Vercel |
| Tests | Node.js test runner |

## Getting started

### Requirements

- Node.js **22.12 or later**
- npm
- Git

### Run locally

```bash
git clone https://github.com/rishirana463-hub/LoopLane.git
cd LoopLane
npm ci
npm run dev
```

Open the local URL printed by Vite. **Guest mode works without Supabase credentials.**

### Available commands

| Command | Purpose |
| --- | --- |
| npm run dev | Start the development server |
| npm test | Run the automated tests |
| npm run build | Generate the production app in dist |
| npm run preview | Preview the production build locally |

To test installability and offline caching, use a production build. The service worker is disabled in the development server.

## Optional accounts and cloud sync

1. Create your own Supabase project.
2. Apply [supabase/schema.sql](supabase/schema.sql) in its SQL editor.
3. Copy [.env.example](.env.example) to .env.local.
4. Configure these two public client values:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

VITE_SUPABASE_ANON_KEY accepts the project's publishable key or legacy anon key. Never use a service-role key, secret key, database password, or OAuth client secret in the frontend.

5. Configure the desired authentication providers and email delivery in Supabase.
6. Set the Auth Site URL to your deployed app and allow its exact redirect URL. For local development, allow http://127.0.0.1:5173/ and http://localhost:5173/.
7. For Google sign-in, add your project's Supabase callback URL to the Google OAuth client's authorized redirect URIs:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Keep the Google client secret in Supabase's provider settings. Restart Vite after changing local environment values, or rebuild the production app.

The progress table uses Row Level Security to limit authenticated users to their own row. Without account configuration, the app continues to work in guest mode.

## Coding exercises

Learner code runs locally in a short-lived Web Worker inside an isolated browser frame. Each run has a two-second timeout, reports test results, and captures console output.

Learner code is not sent to Supabase or executed on an application server.

## Project structure

```text
src/
  components/          Reusable screens and UI components
  data/lessons.json    Curriculum source
  lib/
    progress.js        Pure game and progress rules
    useProgress.js     Local persistence and account sync
    codeRunner.js      Isolated browser code runner
public/                Icons and local feedback sounds
supabase/schema.sql    Progress table and access policies
tests/                 Automated regression tests
docs/screenshots/      README screenshots
vite.config.js         Build and PWA configuration
vercel.json            SPA routing configuration
```

## Testing

The project includes **33 automated tests** covering progress rules, streak boundaries, lesson unlocking, curriculum answers, code-runner lifecycle, sandbox policy and timeouts, and feedback audio.

```bash
npm test
npm run build
```

Keep browser and physical-device checks alongside automated testing, especially for installation, offline reopening, sound, and authentication redirects.

## Deploy to Vercel

Import the repository into Vercel and use:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Build command | npm run build |
| Output directory | dist |

Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY only if accounts and cloud sync are required. Configure the corresponding production Auth URLs in Supabase. The included vercel.json rewrites application routes to index.html so direct links and refreshes work.

## Contributing

Open an issue to discuss a proposed change, or submit a focused pull request. Keep lesson content in the JSON curriculum, preserve the browser-only code runner, and run the tests and production build before submitting.

## Support

For support or account-deletion requests, contact **[rishirana463@gmail.com](mailto:rishirana463@gmail.com)**. See the [privacy policy](https://looplane-jogger.vercel.app/privacy) for details about local and synced progress.
