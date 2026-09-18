const diagrams = new WeakMap();
let renderQueue = Promise.resolve();
let nextId = 0;

function prepareDiagram(pre) {
    const documentRef = pre.ownerDocument;
    const wrapper = documentRef.createElement('div');
    wrapper.className = 'article-mermaid';
    const diagram = documentRef.createElement('div');
    diagram.className = 'article-mermaid-diagram';
    diagram.tabIndex = 0;
    diagram.setAttribute('role', 'region');
    diagram.setAttribute('aria-label', 'Mermaid 图表（可横向滚动）');
    diagram.hidden = true;
    const source = documentRef.createElement('details');
    source.open = true;
    const summary = documentRef.createElement('summary');
    summary.textContent = 'Mermaid 源码';
    const status = documentRef.createElement('p');
    status.className = 'article-mermaid-status';
    status.setAttribute('role', 'status');
    const text = pre.textContent;
    pre.before(wrapper);
    source.append(summary, pre);
    wrapper.append(diagram, status, source);
    // The source may have been registered for the article's scroll animation.
    pre.classList.remove('article-section-reveal', 'is-visible');
    const state = { wrapper, diagram, source, status, text, theme: null, version: 0 };
    diagrams.set(pre, state);
    return state;
}

export function renderArticleMermaid(root = document) {
    const theme = root.ownerDocument?.documentElement.dataset.theme
        || root.documentElement?.dataset.theme || 'light';
    const blocks = root.querySelectorAll('.markdown-content pre[data-language="mermaid"], .markdown-content pre:has(code.language-mermaid)');
    for (const pre of blocks) {
        const state = diagrams.get(pre) || prepareDiagram(pre);
        if (state.theme === theme) continue;
        state.theme = theme;
        const version = ++state.version;
        state.status.textContent = '图表加载中…';
        state.status.hidden = false;
        // Mermaid configuration is global: serialize theme changes and renders.
        renderQueue = renderQueue.then(async () => {
            if (!state.wrapper.isConnected || version !== state.version) return;
            try {
                const { default: mermaid } = await import('mermaid');
                if (!state.wrapper.isConnected || version !== state.version) return;
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    suppressErrorRendering: true,
                    theme: theme === 'dark' ? 'dark' : 'default',
                    fontFamily: '"Noto Sans SC", sans-serif',
                });
                const { svg } = await mermaid.render(`article-mermaid-${++nextId}`, state.text);
                if (!state.wrapper.isConnected || version !== state.version) return;
                state.diagram.innerHTML = svg;
                const svgElement = state.diagram.querySelector('svg');
                const width = svgElement?.viewBox.baseVal.width;
                if (width > 0) {
                    // Keep text readable on phones; scroll instead of shrinking the diagram.
                    svgElement.style.width = `${width}px`;
                    svgElement.style.maxWidth = 'none';
                }
                state.diagram.hidden = false;
                state.source.open = false;
                state.status.hidden = true;
            } catch {
                if (!state.wrapper.isConnected || version !== state.version) return;
                state.diagram.hidden = true;
                state.source.open = true;
                state.status.textContent = '图表未能渲染，请查看源码。';
                state.theme = null;
            }
        });
    }
    return renderQueue;
}
