# Favorite Music Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two favorite Bilibili music links beside the existing AI music entry on the homepage.

**Architecture:** Keep favorite links as static homepage presentation data, separate from the laboratory-owned `musicWorks` catalog. Render the existing AI music panel and a new favorite-links panel in one responsive grid.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, CSS.

---

### Task 1: Define the homepage behavior with a failing test

**Files:**
- Modify: `src/pages/HomePage.test.tsx`

- [x] **Step 1: Add assertions for the favorite music panel**

Add assertions that “喜欢的音乐作品” and both named links are present, use the supplied Bilibili URLs, and open in a new window.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test -- src/pages/HomePage.test.tsx
```

Expected: FAIL because the favorite music heading and links do not exist.

### Task 2: Implement the favorite music panel

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Add static favorite music link data**

Define two items with the supplied titles and canonical Bilibili URLs.

- [x] **Step 2: Render the panel beside the existing AI music entry**

Wrap both homepage music columns in a responsive grid. Preserve the existing `/music` link and render the favorite items as external links with `target="_blank"` and `rel="noreferrer"`.

- [x] **Step 3: Add responsive styles**

Use a two-column desktop layout and one-column mobile layout. Style the external links consistently with the existing editorial design.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm test -- src/pages/HomePage.test.tsx
```

Expected: PASS.

### Task 3: Verify the project

**Files:**
- Verify all modified files.

- [x] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [x] **Step 2: Run the production build**

```bash
pnpm build
```

Expected: build exits successfully.

- [x] **Step 3: Review the diff and local-only state**

Confirm the two URLs are correct, no Netlify deployment command was run, and no GitHub push was performed.
