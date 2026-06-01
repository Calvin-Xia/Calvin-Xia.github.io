# DESIGN.md

> Calvin Xia 是一个中性、直接、轻装饰的中文个人主页：阅读安静，入口清楚，工具可用，视觉不抢内容。

## 1. Visual Theme & Atmosphere

**Style**: Minimal Chinese Editorial / 极简克制 × 中文优雅  
**Keywords**: 中性、直接、中文阅读、轻边框、小圆角、低阴影、内容优先、轻技术感  
**Tone**: 清爽、稳定、个人化、克制；NOT 通用 SaaS、暖色玻璃拟态、赛博朋克、二次元、营销落地页、重型 dashboard  
**Feel**: 像一份整理得很干净的中文索引页，安静地把文章、作品和工具放到读者眼前。

**Interaction Tier**: L2 轻量流畅  
**Dependencies**: CSS + vanilla JavaScript + IntersectionObserver。不要引入 GSAP、ScrollTrigger、Lenis、Three.js 或全局 custom cursor。  
**Brand Name**: 全站统一使用 `Calvin Xia`。Header logo 回首页；主导航只放 `文章 / 作品 / 关于`（英文 UI 中为 `Articles / Works / About`）；语言切换和主题切换放在 Header actions；工具继续归入作品体系。
**Scope**: 本规范覆盖首页、文章列表、文章正文、作品页、工具页、关于页、更新日志、`/new-post` 本地页、评论、灯箱、基础表单与导航。它不修改 Worker、RSS、SEO、content schema、发布流程或 legacy 跳转策略。

## 2. Color Palette & Roles

```css
:root {
    color-scheme: light;

    /* Backgrounds */
    --bg: #f7f7f4;
    --surface: #ffffff;
    --surface-alt: #eef3f2;
    --surface-muted: #f2f4f1;
    --surface-hover: #e7eeee;
    --surface-inset: #f9faf8;

    /* Borders */
    --border: #d8dfdd;
    --border-muted: #e6ebe8;
    --border-hover: #acbfbb;
    --border-strong: #879c97;

    /* Text */
    --text: #18201f;
    --text-secondary: #4e5c59;
    --text-tertiary: #798783;
    --text-inverse: #ffffff;

    /* Accent: ink blue-gray */
    --accent: #315d67;
    --accent-hover: #244952;
    --accent-active: #1c3c43;
    --accent-soft: #dce8e9;
    --accent-muted: #edf4f4;

    /* Semantic */
    --success: #2f6f57;
    --success-soft: #e2f0e9;
    --warning: #9a6a24;
    --warning-soft: #f4ead7;
    --error: #9d4e4b;
    --error-soft: #f1dddd;
    --info: #315d67;
    --info-soft: #dce8e9;

    /* Code and article surfaces */
    --code-bg: #f1f4f3;
    --code-text: #1f2b29;
    --quote-bg: #f3f6f4;
    --mark-bg: #e5eeee;

    /* RGB helpers for rgba() */
    --bg-rgb: 247, 247, 244;
    --surface-rgb: 255, 255, 255;
    --text-rgb: 24, 32, 31;
    --accent-rgb: 49, 93, 103;
    --border-rgb: 216, 223, 221;
    --success-rgb: 47, 111, 87;
    --warning-rgb: 154, 106, 36;
    --error-rgb: 157, 78, 75;

    /* Shape, depth, motion */
    --radius-xs: 4px;
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-pill: 999px;
    --shadow-subtle: 0 1px 2px rgba(var(--text-rgb), 0.05), 0 12px 30px rgba(var(--text-rgb), 0.06);
    --shadow-raised: 0 18px 44px rgba(var(--text-rgb), 0.09);
    --focus-ring: 0 0 0 3px rgba(var(--accent-rgb), 0.22);
    --duration-fast: 160ms;
    --duration-base: 240ms;
    --duration-slow: 520ms;
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}

[data-theme="dark"] {
    color-scheme: dark;

    /* Graphite green dark mode */
    --bg: #121715;
    --surface: #18201e;
    --surface-alt: #1f2926;
    --surface-muted: #17211e;
    --surface-hover: #26332f;
    --surface-inset: #101412;

    --border: #2c3935;
    --border-muted: #23302c;
    --border-hover: #49625c;
    --border-strong: #6b827c;

    --text: #edf3f0;
    --text-secondary: #bfccc7;
    --text-tertiary: #889993;
    --text-inverse: #10201f;

    --accent: #8eb9c0;
    --accent-hover: #abd0d5;
    --accent-active: #c4e0e4;
    --accent-soft: rgba(142, 185, 192, 0.14);
    --accent-muted: rgba(142, 185, 192, 0.08);

    --success: #8dc8a8;
    --success-soft: rgba(141, 200, 168, 0.14);
    --warning: #d3b06d;
    --warning-soft: rgba(211, 176, 109, 0.14);
    --error: #d58f8d;
    --error-soft: rgba(213, 143, 141, 0.14);
    --info: #8eb9c0;
    --info-soft: rgba(142, 185, 192, 0.14);

    --code-bg: #111816;
    --code-text: #dce7e3;
    --quote-bg: #17201d;
    --mark-bg: rgba(142, 185, 192, 0.18);

    --bg-rgb: 18, 23, 21;
    --surface-rgb: 24, 32, 30;
    --text-rgb: 237, 243, 240;
    --accent-rgb: 142, 185, 192;
    --border-rgb: 44, 57, 53;
    --success-rgb: 141, 200, 168;
    --warning-rgb: 211, 176, 109;
    --error-rgb: 213, 143, 141;

    --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.22), 0 14px 34px rgba(0, 0, 0, 0.24);
    --shadow-raised: 0 20px 50px rgba(0, 0, 0, 0.32);
    --focus-ring: 0 0 0 3px rgba(var(--accent-rgb), 0.26);
}
```

**Color Rules:**
- 所有实现颜色必须通过 CSS 变量引用。除 token 定义本身外，不在组件 CSS 中硬编码 hex。
- 单个 section 内只允许一个强调色：墨蓝灰。状态色只用于错误、成功、警告和信息提示。
- 不继承旧视觉里的橙、粉、青绿三色系统；如果历史内容标签需要区分，使用低饱和语义色并保持辅助层级。
- Dark mode 必须单独校准正文、链接、按钮、代码块、表格、Giscus、灯箱和表单，不做简单反色。
- 背景只能使用低对比线纹、轻颗粒或极淡面层，不使用大面积渐变球、毛玻璃堆叠或高饱和光效。

## 3. Typography Rules

**Font Stack:**

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap");

:root {
    --font-serif: "Noto Serif SC", "Songti SC", STSong, serif;
    --font-sans: "Noto Sans SC", Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
    --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | `var(--font-serif)` | `clamp(3.25rem, 8vw, 6.25rem)` | 600 | 1.02 | 0 |
| Page H1 | `var(--font-serif)` | `clamp(2.25rem, 5vw, 4rem)` | 600 | 1.12 | 0 |
| Section H2 | `var(--font-serif)` | `clamp(1.75rem, 3vw, 2.75rem)` | 600 | 1.18 | 0 |
| H3 | `var(--font-serif)` | `1.25rem` to `1.5rem` | 600 | 1.35 | 0 |
| Body | `var(--font-sans)` | `1rem` to `1.0625rem` | 400 | 1.78 | 0.02em |
| Small Body | `var(--font-sans)` | `0.925rem` | 400 to 500 | 1.68 | 0.02em |
| Label / Kicker | `var(--font-mono)` or `var(--font-sans)` | `0.75rem` to `0.8125rem` | 600 to 700 | 1.2 | 0.08em max |
| Nav | `var(--font-sans)` | `0.925rem` | 600 | 1.2 | 0.02em |
| Mono / Code | `var(--font-mono)` | `0.9rem` to `0.95rem` | 400 to 500 | 1.7 | 0 |

**Typography Rules:**
- 标题使用中文衬线建立个人站识别，但不要做杂志化巨幅排版；正文始终以中文博客阅读为第一目标。
- 正文行宽建议 `68ch` 到 `76ch`；长文正文容器不超过 `820px`。
- 中文正文行高不低于 `1.7`，正文默认 `letter-spacing: 0.02em`；标题和数字不加负字距。
- 英文、数字、时间组件、代码使用 Inter 或 JetBrains Mono 作辅助，但中文字族必须排在 font-family 前部。
- **NEVER use**: Orbitron、Caveat、Playfair Display、纯英文字体栈、emoji 装饰、过度手写字体、负字距标题。

**Text Decoration:**
- Hero H1: 无渐变、无投影。通过字体、留白和布局建立识别。
- Section H2: 无渐变、无投影。可以配合极细分隔线或小号 kicker。
- Links: 默认不加装饰；hover 使用 `text-decoration-thickness`、`underline-offset` 和颜色变化。
- Labels: 可使用细边框、浅背景或小写/大写英文，但不要做发光、高亮笔刷或复杂文字特效。

## 4. Component Stylings

### Buttons

```css
.btn,
button,
[role="button"] {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 0.65rem 1rem;
    background: var(--accent);
    color: var(--text-inverse);
    font-family: var(--font-sans);
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.2;
    text-decoration: none;
    cursor: pointer;
    transition:
        background-color var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard),
        color var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard),
        transform var(--duration-fast) var(--ease-standard);
}

.btn:hover,
button:hover,
[role="button"]:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

.btn:active,
button:active,
[role="button"]:active {
    background: var(--accent-active);
    transform: translateY(0);
}

.btn:focus-visible,
button:focus-visible,
[role="button"]:focus-visible {
    outline: 0;
    box-shadow: var(--focus-ring);
}

.btn:disabled,
button:disabled,
[aria-disabled="true"] {
    opacity: 0.52;
    cursor: not-allowed;
    transform: none;
}

.btn-secondary {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text);
}

.btn-secondary:hover {
    background: var(--surface-alt);
    border-color: var(--border-hover);
    color: var(--text);
}

.btn-secondary:active {
    background: var(--surface-hover);
}

.btn-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--text-secondary);
}

.btn-ghost:hover {
    background: var(--surface-alt);
    color: var(--text);
}
```

### Cards / Panels

```css
.panel,
.card,
.blog-card,
.tool-panel {
    position: relative;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: rgba(var(--surface-rgb), 0.78);
    color: var(--text);
    box-shadow: none;
    transition:
        border-color var(--duration-fast) var(--ease-standard),
        background-color var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard),
        transform var(--duration-fast) var(--ease-standard);
}

.panel:hover,
.card:hover,
.blog-card:hover {
    border-color: var(--border-hover);
    background: var(--surface);
    box-shadow: var(--shadow-subtle);
    transform: translateY(-2px);
}

.panel:focus-within,
.card:focus-within,
.blog-card:focus-within,
.tool-panel:focus-within {
    border-color: var(--border-hover);
    box-shadow: var(--focus-ring);
}

.panel[aria-disabled="true"],
.card[aria-disabled="true"] {
    opacity: 0.58;
    pointer-events: none;
}
```

### Navigation

```css
.site-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(var(--bg-rgb), 0.88);
    border-bottom: 1px solid var(--border-muted);
    backdrop-filter: blur(10px) saturate(130%);
    -webkit-backdrop-filter: blur(10px) saturate(130%);
    transition:
        background-color var(--duration-base) var(--ease-standard),
        border-color var(--duration-base) var(--ease-standard),
        box-shadow var(--duration-base) var(--ease-standard);
}

.site-header.is-scrolled {
    background: rgba(var(--bg-rgb), 0.94);
    border-bottom-color: var(--border);
    box-shadow: 0 1px 0 rgba(var(--border-rgb), 0.7);
}

.site-logo {
    color: var(--text);
    font-family: var(--font-serif);
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0;
    text-decoration: none;
}

.nav-link {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    padding: 0 0.85rem;
    color: var(--text-secondary);
    font-size: 0.925rem;
    font-weight: 600;
    text-decoration: none;
    transition:
        background-color var(--duration-fast) var(--ease-standard),
        color var(--duration-fast) var(--ease-standard);
}

.nav-link:hover,
.nav-link[aria-current="page"] {
    background: var(--surface-alt);
    color: var(--text);
}

.nav-link:active {
    background: var(--surface-hover);
}

.nav-link:focus-visible {
    outline: 0;
    box-shadow: var(--focus-ring);
}
```

### Links

```css
a {
    color: var(--accent);
    text-decoration: none;
    text-underline-offset: 0.18em;
    transition:
        color var(--duration-fast) var(--ease-standard),
        text-decoration-color var(--duration-fast) var(--ease-standard),
        background-color var(--duration-fast) var(--ease-standard);
}

a:hover {
    color: var(--accent-hover);
    text-decoration-line: underline;
    text-decoration-thickness: 1px;
    text-decoration-color: currentColor;
}

a:active {
    color: var(--accent-active);
}

a:focus-visible {
    outline: 0;
    border-radius: var(--radius-xs);
    box-shadow: var(--focus-ring);
}
```

### Tags / Badges

```css
.tag,
.badge,
.content-type-badge {
    display: inline-flex;
    min-height: 28px;
    align-items: center;
    width: fit-content;
    border: 1px solid rgba(var(--accent-rgb), 0.22);
    border-radius: var(--radius-sm);
    padding: 0 0.6rem;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
}

.tag:hover,
.badge:hover,
.content-type-badge:hover {
    border-color: rgba(var(--accent-rgb), 0.38);
    background: var(--accent-muted);
}

.tag:focus-visible,
.badge:focus-visible,
.content-type-badge:focus-visible {
    outline: 0;
    box-shadow: var(--focus-ring);
}

.tag[aria-disabled="true"],
.badge[aria-disabled="true"] {
    opacity: 0.55;
}
```

### Forms / Inputs

```css
input,
textarea,
select {
    width: 100%;
    min-height: 44px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0.72rem 0.85rem;
    background: var(--surface-inset);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.5;
    transition:
        border-color var(--duration-fast) var(--ease-standard),
        background-color var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard);
}

textarea {
    min-height: 12rem;
    resize: vertical;
}

input:hover,
textarea:hover,
select:hover {
    border-color: var(--border-hover);
}

input:focus,
textarea:focus,
select:focus {
    outline: 0;
    border-color: var(--accent);
    box-shadow: var(--focus-ring);
}

input:disabled,
textarea:disabled,
select:disabled {
    opacity: 0.58;
    cursor: not-allowed;
}
```

### Tabs / Tool Controls

```css
.tab-list {
    display: flex;
    gap: 0.375rem;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
}

.tab-btn {
    flex: 0 0 auto;
    min-height: 44px;
    border: 1px solid transparent;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    padding: 0 0.9rem;
    background: transparent;
    color: var(--text-secondary);
    font-weight: 700;
}

.tab-btn:hover {
    background: var(--surface-alt);
    color: var(--text);
}

.tab-btn[aria-selected="true"],
.tab-btn.active {
    border-color: var(--border);
    border-bottom-color: var(--surface);
    background: var(--surface);
    color: var(--text);
}

.tab-btn:active {
    background: var(--surface-hover);
}

.tab-btn:focus-visible {
    outline: 0;
    box-shadow: var(--focus-ring);
}

.tab-btn:disabled {
    opacity: 0.52;
    cursor: not-allowed;
}
```

## 5. Layout Principles

**Container:**
- Site shell max width: `1120px`
- Wide article/tool layout max width: `1180px`
- Text-heavy article width: `760px` to `820px`
- Page padding: `clamp(1rem, 4vw, 2rem)`
- Header height budget: desktop `64px` to `72px`; mobile may use a two-row shell around `96px` to `112px` so logo/actions and translated nav labels never overlap

**Spacing Scale:**
- Section padding desktop: `clamp(3rem, 7vw, 5.5rem)`
- Section padding mobile: `2.25rem` to `3rem`
- Component gap: `0.75rem`, `1rem`, `1.5rem`, `2rem`
- Card internal padding: desktop `1.25rem` to `1.5rem`, mobile `1rem`
- Article block rhythm: paragraph margin `1.1rem`, heading margin top `2rem` to `2.6rem`

**Grid:**

```css
.container {
    width: min(100% - 2rem, 1120px);
    margin-inline: auto;
}

.container-narrow {
    width: min(100% - 2rem, 820px);
    margin-inline: auto;
}

.layout-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(0.875rem, 2vw, 1.25rem);
}

.auto-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 1rem;
}

.article-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(13rem, 17rem);
    gap: 2rem;
    align-items: start;
}

.list-index {
    display: grid;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: rgba(var(--surface-rgb), 0.74);
    overflow: hidden;
}
```

**Page Family Rules:**
- 首页是入口页，不是营销页。保留时间组件，主标题为 `Calvin Xia`，搜索降为辅助入口，最近更新作为索引。
- 文章列表是博客流。使用标题、日期、标签和摘要建立扫描效率，不做封面卡片瀑布流。
- 文章正文保持博客阅读体验。桌面目录右侧 sticky，移动端目录顶部折叠；阅读进度、阅读量、返回入口、Giscus 保留。
- 作品页是轻量项目档案。不要主推单个作品，不需要截图、封面、时间线、状态字段或复杂过滤。
- 工具页是作品体系的一部分。Timer、Random Selector、Markdown Tool 并列；Markdown 工具可以更像编辑器，但不共享文章正文样式。
- `/new-post` 是开发环境隐藏辅助页，只做视觉统一和可用性，不增加草稿保存、secret 保存、slug 预览或发布说明。

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 无阴影，只有背景和留白 | 正文、列表行、归档、关于页法律信息 |
| Bordered | `1px solid var(--border)` | Header、筛选、输入框、工具 tab、轻量面板 |
| Subtle | `var(--shadow-subtle)` | hover 状态、时间组件、浮层导航 |
| Raised | `var(--shadow-raised)` | 搜索建议、移动端菜单、灯箱工具条、确认类提示 |
| Overlay | 半透明 surface + 边框 + 可控 blur | Giscus 包裹、灯箱背景、全局 transition indicator |

```css
.surface-flat {
    background: transparent;
    box-shadow: none;
}

.surface-bordered {
    border: 1px solid var(--border);
    background: rgba(var(--surface-rgb), 0.72);
}

.surface-subtle {
    border: 1px solid var(--border);
    background: rgba(var(--surface-rgb), 0.84);
    box-shadow: var(--shadow-subtle);
}

.surface-raised {
    border: 1px solid var(--border-hover);
    background: var(--surface);
    box-shadow: var(--shadow-raised);
}
```

**Depth Rules:**
- 默认不使用阴影；先用留白、边框和排版层级解决。
- `backdrop-filter` 仅用于 sticky header、移动菜单或必要浮层，blur 不超过 `10px`。
- 禁止卡片套卡片。需要分组时使用列表、分隔线、标题和留白。
- 不使用 moving blur，不对滚动区做大面积毛玻璃。

## 7. Animation & Interaction

**Motion Philosophy**: 动效只服务识别、状态和层级。所有运动都用 opacity、transform、border-color 和 background-color 完成；文章正文保持安静。  
**Tier**: L2 轻量流畅  
**Dependencies**: 无外部动效依赖。使用 CSS、`IntersectionObserver`、`requestAnimationFrame` 和现有 Astro 客户端脚本即可。

### Theme Boot Script

主题初始化必须在首屏渲染前完成，避免闪烁。默认固定浅色，不读取系统主题作为默认值。

```html
<script>
(() => {
    const storageKey = "calvin-xia-theme";
    const saved = localStorage.getItem(storageKey);
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
})();
</script>
```

### Base Setup

```js
function initThemeToggle() {
    const storageKey = "calvin-xia-theme";
    const root = document.documentElement;
    const buttons = document.querySelectorAll("[data-theme-toggle]");

    function setTheme(theme) {
        root.dataset.theme = theme;
        try {
            localStorage.setItem(storageKey, theme);
        } catch {}
        buttons.forEach((button) => {
            button.setAttribute("aria-pressed", String(theme === "dark"));
            button.setAttribute("aria-label", theme === "dark" ? "切换到浅色主题" : "切换到深色主题");
        });
        window.dispatchEvent(new CustomEvent("calvin-theme-change", { detail: { theme } }));
    }

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            setTheme(root.dataset.theme === "dark" ? "light" : "dark");
        });
    });

    setTheme(root.dataset.theme === "dark" ? "dark" : "light");
}
```

### Entrance Animation

```css
@keyframes cxFadeUp {
    from {
        opacity: 0;
        transform: translateY(18px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes cxTitleReveal {
    from {
        opacity: 0;
        transform: translateY(0.28em);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.reveal {
    opacity: 0;
    transform: translateY(18px);
    transition:
        opacity var(--duration-slow) var(--ease-out),
        transform var(--duration-slow) var(--ease-out);
}

.reveal.in-view {
    opacity: 1;
    transform: translateY(0);
}

.hero-title {
    animation: cxTitleReveal 680ms var(--ease-out) both;
}

.stagger-reveal > * {
    opacity: 0;
    transform: translateY(14px);
    transition:
        opacity var(--duration-slow) var(--ease-out),
        transform var(--duration-slow) var(--ease-out);
}

.stagger-reveal.in-view > * {
    opacity: 1;
    transform: translateY(0);
}
```

### Scroll Behavior

```js
function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal, .stagger-reveal, .section-heading");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            if (entry.target.classList.contains("stagger-reveal")) {
                Array.from(entry.target.children).forEach((child, index) => {
                    child.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
                });
            }

            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    targets.forEach((target) => observer.observe(target));
}

function initHeaderState() {
    if (document.documentElement.dataset.headerReady === "true") {
        return;
    }

    document.documentElement.dataset.headerReady = "true";

    const header = document.querySelector(".site-header");
    if (!header) return;

    let ticking = false;
    const update = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 24);
        ticking = false;
    };

    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });

    update();
}
```

### Hover & Focus States

```css
@media (hover: hover) and (pointer: fine) {
    .interactive-lift:hover {
        transform: translateY(-2px);
    }

    .spotlight-card {
        background:
            radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(var(--accent-rgb), 0.12), transparent 36%),
            rgba(var(--surface-rgb), 0.78);
    }
}

:focus-visible {
    outline: 0;
    box-shadow: var(--focus-ring);
}
```

```js
function initSpotlightCards() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const cards = document.querySelectorAll(".spotlight-card");
    cards.forEach((card) => {
        let frame = 0;
        card.addEventListener("pointermove", (event) => {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
                card.style.setProperty("--my", `${event.clientY - rect.top}px`);
                frame = 0;
            });
        });
    });
}
```

### Special Effects

- Hero H1: `cxTitleReveal`，只在加载时轻微上浮，不拆成逐字强动画。
- Section H2: `.section-heading.reveal`，滚动进入时轻淡入。
- Body / labels: `.stagger-reveal` 用于首页入口、最近更新、文章列表，不用于长文每段。
- Component interaction: 桌面端卡片使用 `interactive-lift` 或 `spotlight-card`，移动端关闭位置追踪。
- Background atmosphere: 使用低对比线纹、轻颗粒或静态纹理；不使用 WebGL、动态 orb、重 blur。
- Page transition: 保留现有 Astro transition，统一 duration 到 `240ms` 到 `320ms`。

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
    }

    .reveal,
    .stagger-reveal > *,
    .hero-title {
        opacity: 1 !important;
        transform: none !important;
    }

    .spotlight-card {
        background: rgba(var(--surface-rgb), 0.78) !important;
    }
}
```

## 8. Do's and Don'ts

### Do

- Use `Calvin Xia` consistently for visible brand identity, document title examples, Header logo and homepage H1.
- Keep page copy short, direct and necessary: navigation, labels, state, constraints and actions.
- Use border, spacing, typography and list rhythm before adding cards or shadows.
- Validate light and dark themes together for every page family.
- Keep article reading quiet: stable line width, clear headings, readable code blocks, restrained meta information.
- Keep tools stable: fixed control dimensions, clear states, no layout jumps during interaction.
- Preserve existing functional behavior for publishing, Worker, RSS, SEO, content schema, comments and legacy redirects.
- Prefer existing Astro structure and vanilla scripts; add dependencies only when a later implementation plan proves they are necessary.

### Don't

- Do not reintroduce warm orange, pink and teal glassmorphism as the primary visual language.
- Do not use full-bleed marketing hero sections, oversized slogans or sales-style CTA stacks.
- Do not put tools in the main navigation; tools stay under works.
- Do not use card-inside-card layouts, large floating panels or decorative glass layers.
- Do not make article pages look like dashboards, magazines, papers or note systems.
- Do not add screenshots, covers, timelines, project priority tiers or filters to works unless a later content decision requires them.
- Do not merge Markdown tool preview styles with article body styles; they serve different contexts.
- Do not use GSAP, Lenis, scroll-jacking, pin sections, WebGL or custom cursors for this redesign.
- Do not hide focus rings, rely on hover for essential information or create mobile touch targets below `44px`.
- Do not add explanatory frontend copy that describes how the design works.
- Do not store secrets or draft content in `/new-post`; keep it a development-only helper.
- Do not change the site-wide referrer policy or local CDN proxy referer behavior.

## 9. Responsive Behavior

**Breakpoints:**

| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | `> 1024px` | Sticky header, horizontal nav, article TOC right sticky, multi-column entry grids |
| Tablet | `700px - 1024px` | Keep nav horizontal when space allows, reduce hero scale, collapse dense grids to 2 columns |
| Mobile | `< 700px` | Logo/actions row + nav row, single-column layout, TOC collapses above article, tools stack vertically |
| Small Mobile | `< 420px` | Shorter labels, full-width buttons where needed, no single-character title lines |

**Touch Targets:** minimum `44px × 44px`  
**Collapsing Strategy:** Header logo remains home link. Main nav contains only `文章 / 作品 / 关于` or `Articles / Works / About`; if width is constrained, nav uses its own row with horizontal scroll before any menu abstraction. Language and theme toggles remain reachable in both desktop and mobile layouts. Legal filing text remains Chinese in every language mode.

```css
@media (max-width: 1024px) {
    .article-layout {
        grid-template-columns: minmax(0, 1fr);
    }

    .article-toc {
        position: static;
        max-width: none;
    }
}

@media (max-width: 700px) {
    .container,
    .container-narrow {
        width: min(100% - 1.5rem, 1120px);
    }

    .site-header-inner {
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
            "brand actions"
            "nav nav";
        min-height: 96px;
        gap: 0.35rem 0.5rem;
    }

    .site-logo {
        grid-area: brand;
    }

    .site-nav {
        grid-area: nav;
        width: 100%;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .site-nav::-webkit-scrollbar {
        display: none;
    }

    .nav-link,
    .lang-toggle,
    .theme-toggle,
    .btn,
    button,
    input,
    select {
        min-height: 44px;
    }

    .hero-title {
        max-width: 8ch;
        font-size: clamp(3rem, 17vw, 4.75rem);
        line-height: 1.02;
    }

    .auto-grid,
    .layout-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .section {
        padding-block: 2.5rem;
    }

    .panel,
    .card,
    .tool-panel {
        border-radius: var(--radius-md);
        padding: 1rem;
    }
}

@media (max-width: 420px) {
    .hero-title {
        max-width: 7ch;
    }

    .btn-row,
    .action-row {
        align-items: stretch;
        flex-direction: column;
    }

    .btn-row .btn,
    .action-row .btn {
        width: 100%;
    }
}
```

**Responsive Acceptance:**
- No horizontal overflow at `375px`, `480px`, `768px`, `1024px` or desktop widths.
- Homepage H1 `Calvin Xia` must not produce awkward single-character or squeezed line breaks.
- Article body, code blocks, tables, KaTeX, images, TOC, Giscus and lightbox must be checked in both themes.
- Tool controls must keep stable dimensions during tab switches, timer changes, markdown preview updates and localStorage restoration.
- Reduced-motion users must still get complete content and visible state changes without large motion.
