---
name: Looplane
description: A colorful night-time coding journey with tactile controls and an original robot.
colors:
  canvas: "#131f24"
  surface: "#1b2b33"
  ink: "#eff5f7"
  muted: "#a5b6bf"
  line: "#34454e"
  cyan: "#53cff3"
  cyan-hover: "#79ddf7"
  cyan-edge: "#2489ac"
  action-ink: "#102f3b"
  purple: "#bd8aff"
  pink: "#f28bd5"
  amber: "#ffcb55"
  current-node: "#bc8af5"
  current-edge: "#7951ad"
  result-xp: "#ca97ff"
  result-cyan: "#55d7f1"
typography:
  display:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 850
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 850
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 850
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "0"
  button:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 900
  code:
    fontFamily: "Cascadia Code, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
rounded:
  small: "12px"
  control: "14px"
  answer: "16px"
  card: "18px"
  panel: "20px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
  4xl: "40px"
  5xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.cyan-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.cyan}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.cyan}"
    padding: "8px 4px"
  account-input:
    backgroundColor: "#101f26"
    textColor: "{colors.ink}"
    rounded: "{rounded.small}"
    padding: "14px"
  progress-card:
    backgroundColor: "transparent"
    rounded: "{rounded.card}"
    padding: "20px"
  mobile-nav-item:
    backgroundColor: "transparent"
    textColor: "#b1c6d2"
    rounded: "{rounded.control}"
    padding: "8px 6px"
  code-chip:
    backgroundColor: "#1e333e"
    textColor: "#d9edf6"
    rounded: "{rounded.small}"
    padding: "10px 12px"
  current-lesson-node:
    backgroundColor: "{colors.current-node}"
    textColor: "#35214b"
    rounded: "{rounded.circle}"
    width: "72px"
    height: "66px"
  answer-tile:
    backgroundColor: "transparent"
    textColor: "#e4eef4"
    rounded: "{rounded.answer}"
    padding: "14px"
  result-stat:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.result-xp}"
    rounded: "{rounded.card}"
---

# Design System: Looplane

## Overview

**Creative North Star: "A colorful night-time coding journey"**

Looplane is a compact, playful learning app. Blue charcoal fills every screen; rounded off-white type, colorful state cues, and an original violet robot make short coding sessions feel welcoming. The user's six dark learning-game references establish the visual direction; Looplane keeps its own identity.

Raised controls make choices feel tangible. Progress, lesson states, and immediate feedback supply the visual hierarchy. Implement screens directly in React and CSS, with the same dark world extending through onboarding, Account, results, and ancillary pages.

**Key Characteristics:**

- Dark charcoal canvas with cyan actions and violet, pink, and amber accents.
- Heavy rounded lettering, outlined containers, and pronounced lower edges.
- A winding lesson path and an original coding robot.
- Compact mobile layouts, readable labels, and clear interactive states.

## Colors

The frontmatter is the normative core palette; state and unit variants are preserved in the component styles.

### Primary

- **Bright Cyan** (`cyan`): primary actions, progress, caret, and keyboard focus. Pair filled actions with `action-ink`; use `cyan-edge` for their lower edge and `cyan-hover` on hover.

### Secondary

- **Soft Violet** (`purple`): progress and learning emphasis. The current lesson uses the distinct `current-node` and `current-edge` pair; result XP uses `result-xp`.

### Tertiary

- **Candy Pink** (`pink`) and **Warm Amber** (`amber`): cheerful accents around learning progress. Unit banners have their own pink, amber, cyan, and violet fills with coordinated dark edges and text. Locked units use subdued charcoal instead.
- **Result Cyan** (`result-cyan`): completion heading and accuracy card. Correct feedback uses deep teal; errors and lost-heart states use muted berry, with explicit messages and icons.

### Neutral

- **Blue Charcoal** (`canvas`): the universal page background.
- **Inset Charcoal** (`surface`): code and supporting surface depth.
- **Off-White** (`ink`), **Mist Blue** (`muted`), and **Slate Outline** (`line`): primary copy, supporting copy, and structural edges.

**The One Dark World Rule.** Carry the charcoal canvas and dark controls into every route, dialog, and onboarding step.

## Typography

Nunito is the display and body family, self-hosted as `public/fonts/nunito-variable.ttf` with weights (200–1000), `font-display: swap`, and the bundled SIL Open Font License (`public/fonts/OFL.txt`). The fallback stack is recorded in frontmatter. Code uses Cascadia Code, Consolas, then monospace.

- **Display:** completion headings; the frontmatter value is the mobile default. Results adjust to (32px) at widths up to (380px), and (40px) from (701px).
- **Headline:** lesson questions, reducing to (24px) on mobile. Onboarding uses (28px) mobile and (32px) desktop.
- **Title:** unit and section headings, with heavy weights (850–950); supporting card headings use (18–20px).
- **Body:** explanations and forms; use (14px) for compact supporting copy. Keep line spacing generous for prose and code.
- **Label:** metadata, navigation, and supplementary text. Numeric stats use tabular figures. Buttons use the separate bold button role.

**The Readable Floor Rule.** Keep visible text at (12px) or larger; retain meaningful accessible names when compact layouts hide visible units.

## Layout

Build mobile first. At widths up to (700px), use a single content column, compact course/stats header, level progress, and fixed bottom navigation. Side gutters are (20px), reducing to (16px) up to (380px); dashboard bottom padding is (120px) to clear navigation. Respect the bottom safe area. The compact path uses (114px) rows and (72 × 66px) nodes, keeping the first three nodes above navigation in the reviewed mobile viewport.

From (701px), use a fixed left navigation rail: (180px) through (1190px), then (220px). Above (1000px), the dashboard has a journey column and a (240–280px) progress rail; below that threshold, supporting cards flow beneath the path. The dashboard maximum width is (1200px). Lesson content is centered at a maximum (690px), results at (620px), Account dialogs at (460px), and onboarding at (480px).

Use the frontmatter spacing scale for recurring gaps and padding. Keep the journey visually primary and preserve room for focus outlines and floating current-lesson labels.

## Elevation & Depth

Depth comes from tonal layers, outlines, and darker bottom borders rather than drop shadows. Primary actions have a lower edge (5px); secondary actions and code chips use (4px); answer tiles use (5px); unit banners use (6px); lesson nodes use (7px) mobile and (8px) desktop. The current lesson gains an outer ring, and the robot supplies illustrated dimensionality.

**The Tactile Edge Rule.** Preserve the darker lower edge when adding controls to these families; do not replace it with a diffuse shadow.

## Shapes

Use soft, sturdy forms: small fields and chips, rounded rectangular actions, broader answer tiles and cards, and circular lesson nodes. The frontmatter radius scale records their shared values. Outlined containers typically use a (2px) stroke; result stats use (3px). A lesson node's circle is slightly compressed vertically to expose its lower edge. Keep icon silhouettes simple and stroke-based.

## Components

- **Buttons:** cyan filled primary, outlined cyan secondary, and quiet text variants. Primary actions are at least (52px) high; result Continue is (56px). Hover brightens the fill; press translates the primary control downward (3px). Disabled actions use a muted slate treatment.
- **Cards and unit banners:** supporting progress cards have transparent dark interiors, rounded outlines, and (20px) padding. Unit banners use colored fills with matching dark text and lower edges; locked banners retain text and lock icons.
- **Course selection:** use a labeled native select in the header, at least (44px) high, with a dark inset surface and a tactile lower edge. The mobile control fits beside the shared stats at (360px). Unit metadata includes its difficulty; lesson examples sit in an optional details panel using existing code styles.
- **Inputs and code:** account fields are dark inset surfaces with (16px) text and at least (52px) height. Coding areas remain monospace, bordered, scrollable, and resizable where implemented. Reorder chips preserve their outlined, raised form.
- **Navigation:** desktop uses labeled rail buttons; mobile uses icon-and-label targets with a minimum (60px) height. The active destination has a violet-tinted fill and outline. Preserve `aria-current` and meaningful labels for icon actions.
- **Lesson path:** current nodes are violet with a ring and “Start here” marker; completed nodes take their unit color and a check; locked nodes are subdued and show a lock. Retain lesson titles, question counts, and state labels. Enabled nodes compress on tap (scale 0.94).
- **Answer tiles and feedback:** large outlined answer buttons gain cyan fill and border when selected. Correct and incorrect feedback use distinct surface colors, icons, and text in a fixed footer; the action remains full width on mobile.
- **Results:** the original robot sits above a cyan heading and two outlined stats with filled label bands. Show actual earned XP and accuracy; show bonus and level-up messages only when earned.
- **Focus and motion:** default keyboard focus is a cyan outline (3px) offset (4px); lesson nodes use a white focus outline. Primary transitions last (0.15s). Continue, goal choices, Run code, and reorder blocks use (0.16s) ease-out transitions and move down (2px) on press. Hover styling applies to hover-capable pointers and preserves selected goals. Honor global `MotionConfig reducedMotion="user"` and the CSS reduced-motion rule that removes animations and transitions.

## Do's and Don'ts

### Do:

- **Do** keep every screen dark and use the original Looplane robot and branding.
- **Do** retain lower-edge depth, visible states, keyboard focus, and at least 44px interactive targets.
- **Do** preserve the 12px text floor and explicit accessible units for streak, XP, and hearts.
- **Do** check compact layouts at 360px width and honor safe areas and reduced motion.
- **Do** display actual learning progress and earned results.

### Don't:

- **Don't** introduce Duolingo branding, an owl, a green brand palette, or copied reference assets.
- **Don't** add light-themed routes, dialogs, or theme controls to this dark-only world.
- **Don't** communicate lesson, selection, or feedback states through color alone.
- **Don't** invent rewards or statistics, alter learning logic, or hardcode curriculum in UI components.
