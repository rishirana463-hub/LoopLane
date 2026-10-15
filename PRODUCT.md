# Looplane

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Looplane teaches JavaScript, Python, Java, and C++ through short, interactive lessons, from foundations to expert DSA, with scoped mistake review. The user describes the product as a coding learning app with a sequential, game-like learning path.

## Operating Context

Mobile-first React PWA, also used on desktop. Guest learning works locally and offline after the first online visit. Optional accounts synchronize progress. Existing iPhone installation, sound, and offline checks were completed with the user.

Production public-page traffic uses aggregate Vercel Web Analytics. Browser Do Not Track and Global Privacy Control signals disable analytics; learner code, answers, account details, and progress are excluded. New changes still need physical-device regression checks.

## Capabilities and Constraints

- Vite, React, Tailwind CSS, Framer Motion; JavaScript and JSX.
- Curriculum lives in src/data/*.json: four languages, twenty-six units, 125 lessons, 627 questions.
- Each language unlocks independently; XP, hearts, streaks, daily goals, and levels are shared.
- A saved language picker and concept/example reference expose the language-specific curricula.
- Multiple choice, fill, reorder, predict, and local coding exercises.
- Hearts, XP, levels, local-calendar streaks, goals, mistake review, and freezes already exist.
- Learner code only runs in the isolated browser worker. Never send it to a server.
- Executable learner-code exercises remain JavaScript-only. Other languages use guided reading, prediction, fill, and reorder questions.
- Original Open Graph and Twitter sharing previews describe the shipped four-language curriculum.
- Each question offers a mailto report containing its prompt and identifiers. The learner reviews the draft and sends it through their email app; Looplane never sends it automatically.
- Analytics is limited to production public page views, with URL query strings/fragments removed and no custom lesson-interaction events.
- Preserve existing progress IDs, scoring rules, auth, and synchronization when extending courses.

## Brand Commitments

Looplane uses original branding and a coding robot, with a midnight-plum canvas (`#19172e`) and cyan/violet accents. No Duolingo branding, owl, or green brand palette. The user's six October 15 references establish a dark, colorful learning-game direction across every screen, including Account and onboarding. Name suggestions are under consideration; the current Looplane name remains until the user chooses a replacement.

## Evidence on Hand

Runnable source and automated tests; original logo and feedback sounds; user-supplied dark learning-app reference screenshots. Do not fabricate lesson formats, rewards, chat, or statistics that the app does not provide.

## Accessibility & Inclusion

Keep readable contrast, keyboard focus, reduced-motion support, text at least 12px, 44px tap targets, and a layout that works at 360px width.
