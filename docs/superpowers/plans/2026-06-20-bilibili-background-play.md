# Bilibili App Background Playback Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clear Bilibili App background-play entry for audio-story episodes while preserving the existing embedded player.

**Architecture:** Keep `PlayerModal` as the shared player. Detect `audio-story` works and render a conditional callout that links the current episode to Bilibili; music works retain the existing compact footer.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Define conditional player behavior

**Files:**
- Modify: `src/components/PlayerModal.test.tsx`

- [x] **Step 1: Add the failing audio-story test**

Render an `audio-story` work and assert that:

- “前往 B站观看（可在 App 内开启后台播放）” is visible.
- The link points to the current episode video.
- The separate instruction “进入 B站 App 后，请在播放器中开启后台播放” is absent.

- [x] **Step 2: Protect music-player behavior**

Keep the existing music test and assert that the background-play callout is absent.

- [x] **Step 3: Run the focused test**

```bash
./node_modules/.bin/vitest run src/components/PlayerModal.test.tsx
```

Expected: the audio-story test fails because the new callout does not exist.

### Task 2: Implement the Bilibili App entry

**Files:**
- Modify: `src/components/PlayerModal.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Detect audio-story playback**

Derive `isAudioStory` from `work.category === "audio-story"`.

- [x] **Step 2: Render the conditional callout**

For audio stories, display one prominent external link to `getBilibiliVideoUrl(work.bvid)` with the combined viewing and background-play wording. Do not render a separate instruction or duplicate viewing link.

- [x] **Step 3: Style desktop and mobile layouts**

Add a bounded callout layout that stacks cleanly on narrow screens and keeps the action button prominent.

- [x] **Step 4: Run the focused test**

Expected: both audio-story and music-player tests pass.

### Task 3: Verify the project

**Files:**
- Verify all modified files.

- [x] **Step 1: Run all tests**

```bash
./node_modules/.bin/vitest run
```

- [x] **Step 2: Run the production build**

```bash
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build
```

- [x] **Step 3: Render-check the player**

Open an audio-story episode at desktop and mobile widths. Confirm the embedded player remains visible, the new button is prominent, the current Bilibili URL is correct, and music-player behavior is unchanged.

- [x] **Step 4: Review scope**

Confirm the user's existing VS Code changes remain untouched, and no GitHub push or Netlify deployment occurred.
