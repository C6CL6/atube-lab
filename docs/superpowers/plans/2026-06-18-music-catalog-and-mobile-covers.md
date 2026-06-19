# Music Catalog And Mobile Covers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 合并三项新的 B 站音乐作品，建立易追加的独立音乐清单，并确保五张既有水墨封面及三张新增封面在手机公网端稳定显示。

**Architecture:** 将音乐作品从包含长篇有声书分集的 `works.ts` 拆到 `music.ts`，首页继续只消费统一的 `musicWorks` 数组。所有网页封面使用项目内 PNG，避免移动端 SVG 渲染差异；数据校验负责检查 BV 号、分类、版权属性与 PNG 路径。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Netlify、PNG 静态图片。

---

### Task 1: 建立音乐清单回归测试

**Files:**
- Create: `src/data/music.test.ts`
- Modify: `src/data/works.test.ts`

- [ ] 新增测试，确认《外卖骑手》、提利昂和詹姆三项作品的 BV 号、分类与版权状态。
- [ ] 新增测试，确认所有音乐封面均为 `/covers/*.png`，并且音乐 BV 号不重复。
- [ ] 运行 `pnpm test src/data/music.test.ts`，确认测试因 `music.ts` 尚不存在而失败。

### Task 2: 拆分并扩充音乐数据

**Files:**
- Create: `src/data/music.ts`
- Modify: `src/data/works.ts`

- [ ] 将现有三项音乐作品迁移至 `music.ts`。
- [ ] 加入《外卖骑手》为 `original-music`、`original`。
- [ ] 加入两项《权力的游戏》人物 MV 为 `music-experiment`、`adaptation`，清楚注明 IP 衍生实验。
- [ ] 从 `works.ts` 重导出 `musicWorks`，保持现有页面导入兼容。
- [ ] 运行音乐测试与全部数据测试，确认通过。

### Task 3: 制作并接入三张水墨封面

**Files:**
- Create: `public/covers/delivery-rider-editorial.png`
- Create: `public/covers/tyrion-editorial.png`
- Create: `public/covers/jaime-editorial.png`

- [ ] 以《归真》封面为视觉参考，分别生成骑手、提利昂、詹姆主题的 16:9 东方水墨封面。
- [ ] 保留暖灰纸色、黑墨层次、暗金月轮、暗红印章与抽象实验器皿符号；不直接复制影视人物肖像。
- [ ] 检查三张图片尺寸、构图、无水印和无乱码文字。
- [ ] 将 PNG 路径写入音乐清单。

### Task 4: 校验和构建

**Files:**
- Verify: `src/data/music.ts`
- Verify: `public/covers/*.png`

- [ ] 运行 `pnpm test`，预期所有测试通过。
- [ ] 运行 `pnpm lint`，预期无错误。
- [ ] 运行 `pnpm build`，预期生成 `dist` 且八张水墨 PNG 均存在。

### Task 5: 发布与手机公网验收

**Files:**
- Deploy: `dist/`

- [ ] 将 `dist` 发布到现有 Netlify 生产站点。
- [ ] 使用 390×844 手机视口访问公网首页。
- [ ] 检查页面标题、非空页面、无框架错误、控制台无相关错误。
- [ ] 检查五张既有封面和三张新增封面的 `naturalWidth` 大于 0，实际请求路径均为 PNG。
- [ ] 点击一张新增音乐卡片，确认站内 B 站播放器弹窗打开且“前往B站”链接正确。
- [ ] 截图验证首页手机布局与水墨封面显示。
