# Homepage Responsive Cards Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent homepage story and music cards from overflowing or visually overlapping at sidebar, tablet, and mobile widths.

**Architecture:** Keep the existing markup and editorial overlay design. Fix the responsive grid constraints in CSS so cards can shrink normally and switch to a single column before their content becomes crowded.

**Tech Stack:** React 19, TypeScript, CSS Grid, Vite, Vitest, in-app browser.

---

### Task 1: Preserve the failing responsive reproduction

**Files:**
- Inspect: `src/styles.css`
- Inspect: `src/pages/HomePage.tsx`

- [x] **Step 1: Reproduce the overflow before editing**

Use the in-app browser at 900, 820, 720, and 621px. Record `documentElement.scrollWidth > clientWidth` and card bounding boxes.

Expected: widths from 900px through 621px overflow horizontally because story cards are wider than their grid tracks.

### Task 2: Apply the minimal responsive CSS fix

**Files:**
- Modify: `src/styles.css`

- [x] **Step 1: Make grid items shrinkable**

Set `min-width: 0` on `.story-panel`, `.music-topic-panel`, and `.favorite-music-panel`.

- [x] **Step 2: Use shrinkable desktop grid tracks**

Change `.story-grid` to `repeat(2, minmax(0, 1fr))` and `.home-music-grid` to two `minmax(0, ...)` tracks without a fixed 320px minimum.

- [x] **Step 2a: Prevent aspect-ratio expansion across columns**

Top-align the music grid and constrain `.music-topic-panel` to `width: 100%` and `max-width: 100%`, so the right text panel cannot stretch the image card and make it overflow its column.

- [x] **Step 3: Switch story cards to one column at 900px**

Inside `@media (max-width: 900px)`, set `.story-grid` to one column and remove the `.story-panel { min-height: 380px; }` rule.

- [x] **Step 4: Harden overlay text**

Use responsive inset spacing, a bounded heading size, and safe wrapping so long text remains inside its card.

### Task 3: Verify responsive behavior

**Files:**
- Verify: `src/styles.css`
- Verify: `src/pages/HomePage.tsx`

- [x] **Step 1: Reload and verify all target widths**

Check 1024, 900, 820, 720, 620, 480, and 320px.

Expected: no horizontal overflow; all story and music card bounds remain inside their parent grid; text remains readable.

- [x] **Step 2: Check screenshots and console**

Capture desktop/sidebar and mobile screenshots. Confirm no Vite overlay and no relevant console warning or error.

### Task 4: Verify the project

**Files:**
- Verify all modified files.

- [x] **Step 1: Run all tests**

```bash
./node_modules/.bin/vitest run
```

Expected: all tests pass.

- [x] **Step 2: Run the production build**

```bash
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build
```

Expected: build succeeds.

- [x] **Step 3: Review scope**

Confirm the existing `ai-songs-editorial.png` homepage image choice remains unchanged, no Netlify deployment occurred, and no GitHub push occurred.
