// Legacy URL redirects. Single source of truth for scripts/generate-redirects.mjs,
// which materializes one themed HTML page per entry into dist/ at build time.
//
// Two families of legacy URLs live here:
//   1. pre-Astro `/blog/<slug>.html` pages that Astro replaced with `/articles/<slug>/`.
//   2. `/articles/<slug>/` URLs served before the four Chinese article filenames were
//      renamed to ASCII slugs (2026-09-15). Those URLs still resolve for anyone holding
//      a bookmark, an RSS entry or a shared link, so they must keep redirecting.

const DEFAULT_SITE_URL = 'https://calvin-xia.cn';

export const legacyRedirects = [
    // --- pre-Astro flat pages -------------------------------------------------
    { from: '/about.html', to: '/about/' },
    { from: '/Works.html', to: '/works/' },
    { from: '/statement.html', to: '/articles/' },
    { from: '/styleguide.html', to: '/styleguide/' },
    { from: '/timetable.html', to: '/works/tools/' },
    { from: '/markdown-to-html-tool.html', to: '/markdown-tool/' },
    { from: '/UpdateLog/fingerprint-app-update-log.html', to: '/updates/fingerprint-app-update-log/' },

    // --- pre-Astro blog pages -------------------------------------------------
    { from: '/blog/20251231-2025年度总结.html', to: '/articles/20251231-year-in-review/' },
    { from: '/blog/20260204-返校宣讲稿.html', to: '/articles/20260204-school-talk/' },
    { from: '/blog/20260312-返校宣讲回顾.html', to: '/articles/20260312-school-talk-review/' },
    { from: '/blog/20260315-两小时，环线，慢行.html', to: '/articles/20260315-two-hour-loop-ride/' },
    { from: '/blog/20260328-pre-reflection.html', to: '/articles/20260328-pre-reflection/' },
    { from: '/blog/20260411-ai-reliance.html', to: '/articles/20260411-ai-reliance/' },

    // --- pre-rename article URLs (Chinese slugs) ------------------------------
    { from: '/articles/20251231-2025年度总结/', to: '/articles/20251231-year-in-review/' },
    { from: '/articles/20260204-返校宣讲稿/', to: '/articles/20260204-school-talk/' },
    { from: '/articles/20260312-返校宣讲回顾/', to: '/articles/20260312-school-talk-review/' },
    { from: '/articles/20260315-两小时，环线，慢行/', to: '/articles/20260315-two-hour-loop-ride/' },
];

export function validateRedirects(entries = legacyRedirects) {
    const issues = [];
    const seen = new Set();
    const fromSet = new Set(entries.map((entry) => entry.from));

    for (const entry of entries) {
        const { from = '', to = '' } = entry;

        if (!from.startsWith('/') || !to.startsWith('/')) {
            issues.push(`${from || '(empty)'}: from/to 必须以 / 开头`);
            continue;
        }

        if (!to.endsWith('/')) {
            issues.push(`${from}: to 必须以 / 结尾，当前为 ${to}`);
        }

        if (from === to) {
            issues.push(`${from}: 指向自身`);
        }

        if (seen.has(from)) {
            issues.push(`${from}: 重复的 from`);
        }
        seen.add(from);

        // A target that is itself a redirect key would bounce the visitor twice.
        // Collapse it to the final destination instead of chaining.
        if (fromSet.has(to)) {
            issues.push(`${from}: to (${to}) 自身也是跳转项，会形成二次跳转`);
        }
    }

    return issues;
}

// `from` is a URL path; the returned value is relative to the build output dir.
export function destinationPathFor(from) {
    const pathname = String(from).split(/[?#]/)[0];
    const relative = pathname.replace(/^\/+/, '');

    return pathname.endsWith('/') ? `${relative}index.html` : relative;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// A literal `</script>` inside the serialized value would close the enclosing tag,
// so the angle brackets are escaped rather than passed through verbatim.
function serializeForScript(value) {
    return JSON.stringify(String(value))
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

// Self-contained page: it is written straight to dist/ and cannot reuse the Astro
// bundle, so the design tokens and font stack are inlined. Fonts resolve to the
// locally installed CJK families rather than the @fontsource build output.
function pageStyles() {
    return `:root {
            color-scheme: light;
            --bg: #f7f7f4;
            --surface: #ffffff;
            --surface-alt: #eef3f2;
            --surface-hover: #e7eeee;
            --border: #d8dfdd;
            --border-muted: #e6ebe8;
            --border-hover: #acbfbb;
            --text: #18201f;
            --text-secondary: #4e5c59;
            --text-tertiary: #798783;
            --text-inverse: #ffffff;
            --accent: #315d67;
            --accent-hover: #244952;
            --accent-soft: #dce8e9;
            --bg-rgb: 247, 247, 244;
            --surface-rgb: 255, 255, 255;
            --text-rgb: 24, 32, 31;
            --accent-rgb: 49, 93, 103;
            --radius-sm: 6px;
            --radius-md: 8px;
            --shadow-subtle: 0 1px 2px rgba(var(--text-rgb), 0.05), 0 12px 30px rgba(var(--text-rgb), 0.06);
            --focus-ring: 0 0 0 3px rgba(var(--accent-rgb), 0.22);
            --duration-fast: 160ms;
            --ease-standard: cubic-bezier(0.2, 0, 0, 1);
            --font-serif: "Noto Serif SC", "Songti SC", STSong, serif;
            --font-sans: "Noto Sans SC", Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
            --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        }

        [data-theme="dark"] {
            color-scheme: dark;
            --bg: #121715;
            --surface: #18201e;
            --surface-alt: #1f2926;
            --surface-hover: #26332f;
            --border: #2c3935;
            --border-muted: #23302c;
            --border-hover: #49625c;
            --text: #edf3f0;
            --text-secondary: #bfccc7;
            --text-tertiary: #889993;
            --text-inverse: #10201f;
            --accent: #8eb9c0;
            --accent-hover: #abd0d5;
            --accent-soft: rgba(142, 185, 192, 0.14);
            --bg-rgb: 18, 23, 21;
            --surface-rgb: 24, 32, 30;
            --text-rgb: 237, 243, 240;
            --accent-rgb: 142, 185, 192;
            --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.22), 0 14px 34px rgba(0, 0, 0, 0.24);
            --focus-ring: 0 0 0 3px rgba(var(--accent-rgb), 0.26);
        }

        * {
            box-sizing: border-box;
        }

        body {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: var(--font-sans);
            font-size: 1rem;
            line-height: 1.78;
            letter-spacing: 0.02em;
        }

        .shell {
            width: min(100% - 2rem, 820px);
            margin-inline: auto;
        }

        .brand-bar {
            border-bottom: 1px solid var(--border-muted);
            padding: 1rem 0;
        }

        .site-logo {
            color: var(--text);
            font-family: var(--font-serif);
            font-size: 1.25rem;
            font-weight: 600;
            text-decoration: none;
        }

        .site-logo:focus-visible {
            outline: 0;
            border-radius: var(--radius-sm);
            box-shadow: var(--focus-ring);
        }

        main {
            display: flex;
            flex: 1;
            align-items: center;
            padding-block: clamp(3rem, 7vw, 5.5rem);
        }

        .kicker {
            margin: 0;
            color: var(--text-tertiary);
            font-family: var(--font-mono);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        h1 {
            margin: 0.5rem 0 0.25rem;
            font-family: var(--font-serif);
            font-size: clamp(1.75rem, 3vw, 2.75rem);
            font-weight: 600;
            line-height: 1.18;
        }

        .moved-note {
            margin: 0;
            color: var(--text-secondary);
        }

        .target {
            display: inline-block;
            margin: 1.5rem 0;
            border: 1px solid rgba(var(--accent-rgb), 0.22);
            border-radius: var(--radius-sm);
            padding: 0.45rem 0.7rem;
            background: var(--accent-soft);
            color: var(--accent);
            font-family: var(--font-mono);
            font-size: 0.9rem;
            line-height: 1.5;
            word-break: break-all;
        }

        .status {
            margin: 0 0 1.5rem;
            color: var(--text-tertiary);
            font-size: 0.925rem;
        }

        .btn {
            display: inline-flex;
            min-height: 44px;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 0.65rem 1rem;
            background: var(--surface);
            color: var(--text);
            font-family: var(--font-sans);
            font-size: 0.95rem;
            font-weight: 700;
            line-height: 1.2;
            text-decoration: none;
            transition:
                background-color var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
        }

        .btn:hover {
            border-color: var(--border-hover);
            background: var(--surface-alt);
            box-shadow: var(--shadow-subtle);
        }

        .btn:active {
            background: var(--surface-hover);
        }

        .btn:focus-visible {
            outline: 0;
            box-shadow: var(--focus-ring);
        }

        @media (prefers-reduced-motion: reduce) {
            * {
                transition-duration: 0.01ms !important;
            }
        }`;
}

// Reads the same key as the site-wide theme toggle so a dark-mode reader does not
// get a light flash. Mirrors the boot script documented in DESIGN.md.
function themeBootScript() {
    return `(() => {
    const storageKey = "calvin-xia-theme";
    const saved = localStorage.getItem(storageKey);
    const theme = saved === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
})();`;
}

export function renderRedirectPage({ from, to, siteUrl = DEFAULT_SITE_URL }) {
    const target = String(to);
    const canonical = new URL(target, siteUrl).toString();
    const escapedTarget = escapeHtml(target);
    const jsTarget = serializeForScript(target);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0;url=${escapedTarget}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <title>页面已迁移 · Calvin Xia</title>
    <script>${themeBootScript()}</script>
    <style>
        ${pageStyles()}
    </style>
</head>
<body>
    <header class="brand-bar">
        <div class="shell">
            <a class="site-logo" href="/">Calvin Xia</a>
        </div>
    </header>
    <main>
        <div class="shell">
            <p class="kicker">Redirect</p>
            <h1>页面已迁移</h1>
            <p class="moved-note">This page has moved.</p>
            <p class="target">${escapedTarget}</p>
            <p class="status">正在跳转到新地址… · Redirecting to the new address…</p>
            <a class="btn" href="${escapedTarget}">手动前往新地址 · Go to the new address</a>
        </div>
    </main>
    <script>location.replace(${jsTarget});</script>
</body>
</html>
`;
}

// Kept for symmetry with the generator so both share one escaping/serialization path.
export function renderRedirectPages({ siteUrl = DEFAULT_SITE_URL, entries = legacyRedirects } = {}) {
    return entries.map((entry) => ({
        from: entry.from,
        to: entry.to,
        destinationPath: destinationPathFor(entry.from),
        html: renderRedirectPage({ ...entry, siteUrl }),
    }));
}

// Re-checks a rendered page against the four signals it must carry. Used to verify
// what was actually written to disk, so a broken template fails the build instead of
// silently shipping pages that do not redirect.
export function findPageIssues(html, { to, siteUrl = DEFAULT_SITE_URL } = {}) {
    const issues = [];
    const escapedTarget = escapeHtml(to);
    const canonical = new URL(to, siteUrl).toString();

    if (!html.includes(`content="0;url=${escapedTarget}"`)) {
        issues.push('meta refresh 目标缺失或不正确');
    }

    if (!html.includes(`rel="canonical" href="${canonical}"`)) {
        issues.push('canonical 缺失或不正确');
    }

    if (!html.includes(`location.replace(${serializeForScript(to)})`)) {
        issues.push('JS 跳转缺失或不正确');
    }

    if (!html.includes(`class="btn" href="${escapedTarget}"`)) {
        issues.push('无 JS 兜底链接缺失或不正确');
    }

    return issues;
}
