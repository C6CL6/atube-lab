# Mac OS软路由模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace creative notes with a Mac OS软路由 product module and direct verified DMG download.

**Architecture:** A focused `RouterPage` owns product and download copy at `/router`. The homepage and site header link to that route; legacy note URLs redirect home. The notarized DMG is a Vite public asset at `/downloads/Mac-OS软路由.dmg`.

**Tech Stack:** React 19, React Router, TypeScript, Vite, Vitest, Testing Library, lucide-react.

## Global Constraints

- Product name: `Mac OS软路由`.
- Source artifact: `/Volumes/长城/codex练习/mac-os-soft-router-paid/dist/Mac OS软路由.dmg`.
- Published path: `/downloads/Mac-OS软路由.dmg`.
- SHA-256: `c73338010ba9cbd1d0d3dd60c074365598fb61458a651c3ea0139cc66d4f81fd`.
- State Developer ID signing and Apple notarization. Do not instruct Gatekeeper bypass.
- Do not push to GitHub or deploy to Netlify.

---

### Task 1: Product page and downloadable artifact

**Files:**
- Create: `src/pages/RouterPage.tsx`
- Create: `src/pages/RouterPage.test.tsx`
- Create: `public/downloads/Mac-OS软路由.dmg`

**Interfaces:** Produces `RouterPage` for the `/router` route and a static download file.

- [ ] **Step 1: Write the failing test**

```tsx
render(<MemoryRouter><RouterPage /></MemoryRouter>);
expect(screen.getByRole("heading", { name: "Mac OS软路由" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /下载 macOS 版/ })).toHaveAttribute("href", "/downloads/Mac-OS软路由.dmg");
expect(screen.getByText("c73338010ba9cbd1d0d3dd60c074365598fb61458a651c3ea0139cc66d4f81fd")).toBeInTheDocument();
```

- [ ] **Step 2: Verify it fails**

Run: `vitest run src/pages/RouterPage.test.tsx`

Expected: FAIL because `RouterPage` is absent.

- [ ] **Step 3: Implement `RouterPage`**

```tsx
<a className="button button--primary" href="/downloads/Mac-OS软路由.dmg" download>
  下载 macOS 版
</a>
```

Use existing `SiteHeader`, `SiteFooter`, `button`, `page-shell`, and `eyeline` patterns. Add product purpose, core capabilities, macOS requirement, administrator authorization for network changes, Developer ID signing, Apple notarization, and the exact SHA-256 checksum.

- [ ] **Step 4: Copy and checksum the artifact**

Run:

```bash
mkdir -p public/downloads
cp '/Volumes/长城/codex练习/mac-os-soft-router-paid/dist/Mac OS软路由.dmg' public/downloads/Mac-OS软路由.dmg
shasum -a 256 public/downloads/Mac-OS软路由.dmg
```

Expected: `c73338010ba9cbd1d0d3dd60c074365598fb61458a651c3ea0139cc66d4f81fd`.

- [ ] **Step 5: Verify and commit**

Run: `vitest run src/pages/RouterPage.test.tsx`

Expected: PASS.

```bash
git add src/pages/RouterPage.tsx src/pages/RouterPage.test.tsx public/downloads/Mac-OS软路由.dmg
git commit -m "Add Mac OS soft router download page"
```

### Task 2: Replace homepage and navigation entries

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/components/SiteHeader.test.tsx`
- Modify: `src/styles.css`

**Interfaces:** Consumes `/router`; produces the homepage module and a header link labeled `软路由`.

- [ ] **Step 1: Write failing assertions**

```tsx
expect(screen.getByRole("link", { name: "软路由" })).toHaveAttribute("href", "/router");
expect(screen.queryByRole("link", { name: "创作手记" })).not.toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Mac OS软路由" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /查看软路由详情/ })).toHaveAttribute("href", "/router");
```

- [ ] **Step 2: Verify failure**

Run: `vitest run src/pages/HomePage.test.tsx src/components/SiteHeader.test.tsx`

Expected: FAIL because notes UI remains.

- [ ] **Step 3: Implement replacement UI**

Replace the notes section with a `router-entry` containing the existing visual primitives and this content:

```tsx
<p className="eyeline">HOME NETWORK · MACOS</p>
<h2>Mac OS软路由</h2>
<p>将 Mac 作为家庭网络的软路由管理终端，集中查看状态并控制既有运行时。</p>
<Link className="button button--primary" to="/router">查看软路由详情</Link>
```

Replace `["创作手记", "/#notes"]` with `["软路由", "/router"]`. Remove the notes data import. Add responsive CSS for the router page and entry with existing palette and spacing.

- [ ] **Step 4: Verify and commit**

Run: `vitest run src/pages/HomePage.test.tsx src/components/SiteHeader.test.tsx src/pages/RouterPage.test.tsx`

Expected: PASS.

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/components/SiteHeader.tsx src/components/SiteHeader.test.tsx src/styles.css
git commit -m "Replace notes with soft router module"
```

### Task 3: Route module and retire note pages

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Delete: `src/pages/NotePage.tsx`
- Delete: `src/data/notes.ts`

**Interfaces:** Consumes `RouterPage`; produces `/router` and safe redirects from `/notes/:slug`.

- [ ] **Step 1: Write failing route assertions**

```tsx
render(<MemoryRouter initialEntries={["/router"]}><App /></MemoryRouter>);
expect(screen.getByRole("heading", { name: "Mac OS软路由" })).toBeInTheDocument();
render(<MemoryRouter initialEntries={["/notes/anything"]}><App /></MemoryRouter>);
expect(screen.getByRole("heading", { name: /让算法参与创作/ })).toBeInTheDocument();
```

- [ ] **Step 2: Verify failure**

Run: `vitest run src/App.test.tsx`

Expected: FAIL because `/router` is not registered.

- [ ] **Step 3: Implement routes and remove note ownership**

```tsx
<Route path="/router" element={<RouterPage />} />
<Route path="/notes/:slug" element={<Navigate to="/" replace />} />
```

Remove the `NotePage` import and delete `NotePage.tsx` and `notes.ts`.

- [ ] **Step 4: Verify and commit**

Run: `vitest run && tsc -b && vite build`

Expected: all tests pass, TypeScript exits 0, and `dist/downloads/Mac-OS软路由.dmg` exists.

```bash
git add src/App.tsx src/App.test.tsx src/pages/NotePage.tsx src/data/notes.ts
git commit -m "Route soft router module and retire notes"
```
