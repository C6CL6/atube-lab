# Sudoku Cloud Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move finished Sudoku scores from browser-only storage to a shared Netlify-backed cloud leaderboard while keeping unfinished games local.

**Architecture:** Add one Netlify Function at `/api/sudoku/records` backed by Netlify Blobs. The React app keeps local users/current games in `localStorage`, posts finished records to the API, and reads the leaderboard from the API with a local fallback.

**Tech Stack:** React, Vite, TypeScript, Vitest, Netlify Functions, Netlify Blobs.

---

### Task 1: Cloud API

**Files:**
- Create: `netlify/functions/sudoku-records.ts`
- Create: `netlify/functions/sudoku-records.test.ts`
- Modify: `package.json`

- [ ] Write tests for GET sorting/limit and POST validation.
- [ ] Add `@netlify/blobs` and `@netlify/functions`.
- [ ] Implement `/api/sudoku/records` with GET and POST.
- [ ] Verify the API tests pass.

### Task 2: Frontend API client

**Files:**
- Create: `src/sudoku/api/cloudRecords.ts`
- Create: `src/sudoku/api/cloudRecords.test.ts`

- [ ] Write tests that prove records are fetched and submitted through `/api/sudoku/records`.
- [ ] Implement a small fetch wrapper returning sorted records on success and safe fallbacks on failure.

### Task 3: App integration

**Files:**
- Modify: `src/sudoku/SudokuApp.tsx`
- Modify: `src/sudoku/components/RankingModal.tsx`
- Modify: existing Sudoku tests

- [ ] Load cloud leaderboard when the Sudoku app opens and after each completed/ended game.
- [ ] Submit the final record to cloud storage without blocking local gameplay.
- [ ] Show a clear “云端排行榜暂时不可用” note if cloud loading fails.
- [ ] Keep unfinished games and active user local.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `pnpm test`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Run a local browser smoke test for leaderboard behavior.
