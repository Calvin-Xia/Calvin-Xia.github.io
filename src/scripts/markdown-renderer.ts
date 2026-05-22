import { marked, type TokenizerAndRendererExtension } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github.min.css';
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

type MarkdownRendererElements = Partial<{
    inputElement: HTMLTextAreaElement | null;
    outputElement: HTMLElement | null;
    toggleBtn: HTMLButtonElement | null;
    loadingIndicator: HTMLElement | null;
    loadingText: HTMLElement | null;
    weChatButton: HTMLButtonElement | null;
    weChatCopyStatus: HTMLElement | null;
    previewScrollElement: HTMLElement | null;
}>;

type RenderMode = 'normal' | 'wechat';

declare global {
    interface Window {
        MarkdownRenderer?: typeof MarkdownRenderer;
        renderMarkdown?: () => void;
        togglePreview?: () => void;
        exportHTML?: () => void;
        copyHTML?: () => void;
        clearEditor?: () => void;
        loadSample?: () => void;
    }
}

const EMPTY_PREVIEW_HTML = '<p style="text-align: center; color: var(--text-secondary);">预览区域</p>';
const EMPTY_INPUT_HTML = '<p style="text-align: center; color: var(--text-secondary);">请输入Markdown内容</p>';
const WECHAT_BASE_STYLE = 'font-size: 15px; line-height: 1.8; color: #18201f; letter-spacing: 0;';
const MARKDOWN_STORAGE_KEY = 'calvin-xia-markdown-tool-input';
const BLOCK_TAGS = new Set([
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'BLOCKQUOTE',
    'DIV',
    'DL',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'FORM',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'HR',
    'LI',
    'MAIN',
    'NAV',
    'OL',
    'P',
    'PRE',
    'SECTION',
    'TABLE',
    'TBODY',
    'TD',
    'TFOOT',
    'TH',
    'THEAD',
    'TR',
    'UL',
]);
const VOID_TAGS = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);
const HLJS_STYLE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css';
const KATEX_STYLE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.25/katex.min.css';
const markExtension: TokenizerAndRendererExtension = {
    name: 'mark',
    level: 'inline',
    start(src) {
        return src.indexOf('==');
    },
    tokenizer(src) {
        const match = /^==(?=\S)([\s\S]*?\S)==(?![=])/.exec(src);

        if (!match) {
            return undefined;
        }

        return {
            type: 'mark',
            raw: match[0],
            text: match[1],
            tokens: this.lexer.inlineTokens(match[1]),
        };
    },
    renderer(token) {
        return `<mark>${this.parser.parseInline(token.tokens ?? [])}</mark>`;
    },
};

const sampleMarkdown = `# 春日短记

今天把一段草稿整理成可以发布的版本。标题、引用、列表和代码块都保留在正文里，用来检查公众号粘贴后的层级和留白。

## 观察

- **节奏**：段落之间需要有空气。
- **重点**：粗体和链接不能抢走标题的重量。
- **表格**：边框要轻，但信息要稳。

> 文章不是把句子堆起来，而是让读者愿意继续往下走。

## 代码片段

\`\`\`javascript
function publishDraft(title) {
    return title + ' is ready';
}
\`\`\`

## 表格

| 模块 | 检查点 |
|------|--------|
| 标题 | 层级清楚 |
| 正文 | 行高舒适 |
| 引用 | 边界明确 |

---

**结论**：复制到公众号前，先让预览变成发布形态。
`;

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);

marked.use({
    extensions: [markExtension],
});

function readDefaultElements(): MarkdownRendererElements {
    return {
        inputElement: document.getElementById('markdown-input') as HTMLTextAreaElement | null,
        outputElement: document.getElementById('markdown-output'),
        toggleBtn: document.getElementById('toggle-btn') as HTMLButtonElement | null,
        loadingIndicator: document.getElementById('loading-indicator'),
        loadingText: document.getElementById('loading-text'),
        weChatButton: document.getElementById('wechat-toggle-btn') as HTMLButtonElement | null,
        weChatCopyStatus: document.getElementById('wechat-copy-status'),
        previewScrollElement: document.querySelector('.markdown-preview-panel .preview-content'),
    };
}

function parseMarkdown(markdownText: string): string {
    return DOMPurify.sanitize(marked.parse(markdownText) as string);
}

function renderMath(target: HTMLElement): void {
    try {
        void katex;
        renderMathInElement(target, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
        });
    } catch (error) {
        console.warn('Math rendering error:', error);
    }
}

function highlightCode(target: HTMLElement): void {
    try {
        target.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
        });
    } catch (error) {
        console.warn('Code highlighting error:', error);
    }
}

function isTypingElement(element: Element | null): boolean {
    if (!element) {
        return false;
    }

    const tagName = element.tagName;
    return tagName === 'TEXTAREA' || tagName === 'INPUT' || element.getAttribute('contenteditable') === 'true';
}

function serializeOpenTag(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const attributes = Array.from(element.attributes)
        .map((attribute) => `${attribute.name}="${attribute.value.replace(/"/g, '&quot;')}"`)
        .join(' ');

    return attributes ? `<${tagName} ${attributes}>` : `<${tagName}>`;
}

function nodeHasBlockChildren(element: Element): boolean {
    return Array.from(element.children).some((child) => BLOCK_TAGS.has(child.tagName));
}

function formatNode(node: ChildNode, depth: number): string[] {
    const indent = '    '.repeat(depth);

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        return text ? [`${indent}${text}`] : [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return [];
    }

    const element = node as Element;
    const tagName = element.tagName;

    if (!BLOCK_TAGS.has(tagName) || !nodeHasBlockChildren(element) || tagName === 'PRE') {
        return [`${indent}${element.outerHTML.trim()}`];
    }

    if (VOID_TAGS.has(tagName)) {
        return [`${indent}${element.outerHTML.trim()}`];
    }

    const lines = [`${indent}${serializeOpenTag(element)}`];
    element.childNodes.forEach((child) => {
        lines.push(...formatNode(child, depth + 1));
    });
    lines.push(`${indent}</${tagName.toLowerCase()}>`);
    return lines;
}

function applyInlineStyle(element: HTMLElement, style: string): void {
    const existingStyle = element.getAttribute('style');
    element.setAttribute('style', existingStyle ? `${existingStyle}; ${style}` : style);
}

function applyWeChatStyles(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
        const tagName = element.tagName.toLowerCase();
        const isCaption = element.classList.contains('image-caption');
        element.removeAttribute('class');

        if (tagName === 'h1') {
            applyInlineStyle(element, 'font-size: 22px; line-height: 1.45; font-weight: 700; color: #18201f; margin: 28px 0 14px;');
        } else if (tagName === 'h2') {
            applyInlineStyle(element, 'font-size: 19px; line-height: 1.5; font-weight: 700; color: #18201f; margin: 24px 0 12px; border-left: 4px solid #315d67; padding-left: 10px;');
        } else if (tagName === 'h3') {
            applyInlineStyle(element, 'font-size: 17px; line-height: 1.55; font-weight: 700; color: #18201f; margin: 20px 0 10px;');
        } else if (tagName === 'p') {
            applyInlineStyle(element, WECHAT_BASE_STYLE + ' margin: 12px 0;');
        } else if (tagName === 'a') {
            applyInlineStyle(element, 'color: #315d67; text-decoration: none;');
        } else if (tagName === 'strong') {
            applyInlineStyle(element, 'font-weight: 700; color: #18201f;');
        } else if (tagName === 'em') {
            applyInlineStyle(element, 'font-style: italic; color: #4e5c59;');
        } else if (tagName === 'ul' || tagName === 'ol') {
            applyInlineStyle(element, WECHAT_BASE_STYLE + ' margin: 12px 0; padding-left: 22px;');
        } else if (tagName === 'li') {
            applyInlineStyle(element, WECHAT_BASE_STYLE + ' margin: 6px 0;');
        } else if (tagName === 'blockquote') {
            applyInlineStyle(element, 'margin: 16px 0; padding: 10px 14px; border-left: 4px solid #315d67; background: #eef3f2; color: #4e5c59;');
        } else if (tagName === 'pre') {
            applyInlineStyle(element, 'margin: 16px 0; padding: 12px; background: #f1f4f3; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.65;');
        } else if (tagName === 'code') {
            applyInlineStyle(element, 'font-family: Consolas, Monaco, monospace; background: #f1f4f3; border-radius: 4px; padding: 2px 4px; color: #1f2b29;');
        } else if (tagName === 'img') {
            applyInlineStyle(element, 'display: block; max-width: 100%; height: auto; margin: 16px auto; border-radius: 6px;');
        } else if (tagName === 'table') {
            applyInlineStyle(element, 'width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; color: #18201f;');
        } else if (tagName === 'th') {
            applyInlineStyle(element, 'border: 1px solid #d8dfdd; padding: 8px; background: #eef3f2; font-weight: 700;');
        } else if (tagName === 'td') {
            applyInlineStyle(element, 'border: 1px solid #d8dfdd; padding: 8px;');
        } else if (tagName === 'hr') {
            applyInlineStyle(element, 'border: none; border-top: 1px solid #d8dfdd; margin: 24px 0;');
        } else if (tagName === 'section' || tagName === 'div') {
            applyInlineStyle(element, isCaption
                ? 'font-size: 13px; line-height: 1.6; color: #798783; text-align: center; margin: 4px 0 16px;'
                : WECHAT_BASE_STYLE);
        }
    });
}

async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function htmlToPlainText(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;
    return (template.content.textContent || '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function copyRichHTMLToClipboard(html: string, plainText = htmlToPlainText(html)): Promise<'rich' | 'fallback'> {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText || html], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([clipboardItem]);
        return 'rich';
    }

    await copyToClipboard(html);
    return 'fallback';
}

function downloadHTML(filename: string, html: string): void {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export const MarkdownRenderer = {
    inputElement: null as HTMLTextAreaElement | null,
    outputElement: null as HTMLElement | null,
    toggleBtn: null as HTMLButtonElement | null,
    loadingIndicator: null as HTMLElement | null,
    loadingText: null as HTMLElement | null,
    weChatButton: null as HTMLButtonElement | null,
    weChatCopyStatus: null as HTMLElement | null,
    previewScrollElement: null as HTMLElement | null,
    cleanupController: null as AbortController | null,
    isCollapsed: false,
    mode: 'normal' as RenderMode,
    fullContent: '',
    collapsedContent: '',
    weChatHTML: '',

    init(elements: MarkdownRendererElements = {}) {
        this.cleanupController?.abort();
        const resolvedElements = {
            ...readDefaultElements(),
            ...elements,
        };

        this.inputElement = resolvedElements.inputElement ?? null;
        this.outputElement = resolvedElements.outputElement ?? null;
        this.toggleBtn = resolvedElements.toggleBtn ?? null;
        this.loadingIndicator = resolvedElements.loadingIndicator ?? null;
        this.loadingText = resolvedElements.loadingText ?? null;
        this.weChatButton = resolvedElements.weChatButton ?? null;
        this.weChatCopyStatus = resolvedElements.weChatCopyStatus ?? null;
        this.previewScrollElement = resolvedElements.previewScrollElement ?? null;

        if (!this.inputElement || !this.outputElement) {
            return;
        }

        marked.setOptions({
            breaks: false,
            gfm: true,
        });

        this.cleanupController = new AbortController();
        const { signal } = this.cleanupController;

        this.restoreInput();
        this.bindScrollSync(signal);

        this.inputElement.addEventListener(
            'input',
            () => {
                this.persistInput();
            },
            { signal },
        );

        this.inputElement.addEventListener(
            'keydown',
            (event) => {
                if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    this.render();
                }
            },
            { signal },
        );

        document.addEventListener(
            'keydown',
            (event) => {
                if (event.ctrlKey && event.key.toLowerCase() === 's') {
                    event.preventDefault();
                    this.exportHTML();
                }

                if (event.ctrlKey && event.key.toLowerCase() === 'c' && !isTypingElement(document.activeElement)) {
                    event.preventDefault();
                    this.copyHTML();
                }
            },
            { signal },
        );

        if (!this.outputElement.innerHTML.trim()) {
            this.outputElement.innerHTML = EMPTY_PREVIEW_HTML;
        }

        this.setWeChatCopyStatus('富文本剪贴板待复制');
    },

    persistInput() {
        if (!this.inputElement) {
            return;
        }

        try {
            localStorage.setItem(MARKDOWN_STORAGE_KEY, this.inputElement.value);
        } catch {
            // Storage can be unavailable in private or restricted contexts.
        }
    },

    restoreInput() {
        if (!this.inputElement || this.inputElement.value.trim()) {
            return;
        }

        try {
            const saved = localStorage.getItem(MARKDOWN_STORAGE_KEY);
            if (saved) {
                this.inputElement.value = saved;
                this.render();
            }
        } catch {
            // Ignore storage failures; the editor remains fully usable.
        }
    },

    clearPersistedInput() {
        try {
            localStorage.removeItem(MARKDOWN_STORAGE_KEY);
        } catch {
            // Ignore storage failures.
        }
    },

    bindScrollSync(signal: AbortSignal) {
        if (!this.inputElement || !this.previewScrollElement) {
            return;
        }

        let isSyncing = false;
        const syncPreview = () => {
            if (isSyncing || !this.inputElement || !this.previewScrollElement) {
                return;
            }

            const maxInputScroll = this.inputElement.scrollHeight - this.inputElement.clientHeight;
            const maxPreviewScroll = this.previewScrollElement.scrollHeight - this.previewScrollElement.clientHeight;
            if (maxInputScroll <= 0 || maxPreviewScroll <= 0) {
                return;
            }

            isSyncing = true;
            const ratio = this.inputElement.scrollTop / maxInputScroll;
            this.previewScrollElement.scrollTop = maxPreviewScroll * ratio;
            requestAnimationFrame(() => {
                isSyncing = false;
            });
        };

        this.inputElement.addEventListener('scroll', syncPreview, { signal, passive: true });
    },

    render() {
        if (!this.inputElement || !this.outputElement) {
            return;
        }

        const markdownText = this.inputElement.value;
        if (!markdownText.trim()) {
            this.outputElement.innerHTML = EMPTY_INPUT_HTML;
            this.setWeChatCopyStatus('请输入 Markdown 后再复制', 'error');
            return;
        }

        this.fullContent = markdownText;

        if (this.mode === 'wechat') {
            this.renderWeChat();
            return;
        }

        this.generateCollapsedPreview();
        if (this.isCollapsed) {
            this.showCollapsed();
        } else {
            this.showExpanded();
        }

        this.showLoading('渲染完成', 1000);
    },

    generateCollapsedPreview() {
        const lines = this.fullContent.split('\n');
        let previewContent = '';
        let firstImageAdded = false;

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            if (line.startsWith('#')) {
                previewContent += `${line}\n`;
                if (index < 3) {
                    previewContent += '\n';
                }
            } else if (line.includes('<img') || line.includes('![')) {
                previewContent += `${line}\n`;
                firstImageAdded = true;
                break;
            } else if (line.trim() && !firstImageAdded) {
                previewContent += `${line}\n`;
                if (line.trim().length > 10) {
                    break;
                }
            }
        }

        this.collapsedContent = parseMarkdown(previewContent);
    },

    showCollapsed() {
        if (!this.outputElement) {
            return;
        }

        this.outputElement.innerHTML = this.collapsedContent || parseMarkdown(this.fullContent);
        this.outputElement.classList.add('collapsed');
        this.outputElement.classList.remove('expanded', 'markdown-content--wechat');
        if (this.toggleBtn) {
            this.toggleBtn.textContent = '展开';
        }

        this.renderMath();
        this.highlightCode();
        this.processImages();
    },

    showExpanded() {
        if (!this.outputElement) {
            return;
        }

        this.outputElement.innerHTML = parseMarkdown(this.fullContent);
        this.outputElement.classList.remove('collapsed', 'markdown-content--wechat');
        this.outputElement.classList.add('expanded');
        if (this.toggleBtn) {
            this.toggleBtn.textContent = '折叠';
        }

        this.renderMath();
        this.highlightCode();
        this.processImages();
    },

    togglePreview() {
        if (this.mode === 'wechat') {
            return;
        }

        this.isCollapsed = !this.isCollapsed;
        if (this.isCollapsed) {
            this.showCollapsed();
        } else {
            this.showExpanded();
        }
    },

    renderMath() {
        if (this.outputElement) {
            renderMath(this.outputElement);
        }
    },

    highlightCode() {
        if (this.outputElement) {
            highlightCode(this.outputElement);
        }
    },

    processImages(element = this.outputElement) {
        if (!element) {
            return;
        }

        const flexWrappers = element.querySelectorAll<HTMLElement>('div[style*="flex"]');
        flexWrappers.forEach((wrapper) => {
            wrapper.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
                const altText = image.getAttribute('alt');
                if (!altText || image.nextElementSibling?.classList.contains('image-caption')) {
                    return;
                }

                const originalStyle = image.getAttribute('style') || '';
                const widthMatch = originalStyle.match(/width:\s*([\d.]+)%/);
                const widthPercent = widthMatch ? `${widthMatch[1]}%` : 'auto';
                const wrapperDiv = document.createElement('div');
                wrapperDiv.style.cssText = `display: flex; flex-direction: column; align-items: center; width: ${widthPercent}; box-sizing: border-box;`;
                image.parentNode?.insertBefore(wrapperDiv, image);
                wrapperDiv.appendChild(image);

                const imageStyle = originalStyle.replace(/width:\s*[\d.]+%[^;]*;?\s*/g, '').trim();
                if (imageStyle) {
                    image.setAttribute('style', imageStyle);
                } else {
                    image.removeAttribute('style');
                }

                const caption = document.createElement('div');
                caption.className = 'image-caption';
                caption.textContent = altText;
                caption.style.marginTop = '4px';
                caption.style.marginBottom = '0';
                wrapperDiv.appendChild(caption);
            });
        });

        element.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
            if (image.closest('[style*="flex"]')) {
                return;
            }

            const altText = image.getAttribute('alt');
            if (!altText || image.nextElementSibling?.classList.contains('image-caption')) {
                return;
            }

            const caption = document.createElement('div');
            caption.className = 'image-caption';
            caption.textContent = altText;
            caption.style.marginTop = '4px';
            caption.style.marginBottom = '16px';
            image.parentNode?.insertBefore(caption, image.nextSibling);
        });
    },

    renderToProcessedHTML(markdownText: string) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = parseMarkdown(markdownText);
        renderMath(tempDiv);
        highlightCode(tempDiv);
        this.processImages(tempDiv);
        return tempDiv.innerHTML;
    },

    exportHTML() {
        const markdownText = this.inputElement?.value ?? '';
        if (!markdownText.trim()) {
            window.alert('请先输入Markdown内容');
            return;
        }

        const processedHTML = this.mode === 'wechat' ? this.renderWeChat(false) : this.renderToProcessedHTML(markdownText);
        downloadHTML('markdown-output.html', this.generateFullHTML(processedHTML));
        this.showLoading('导出成功', 1000);
    },

    async copyHTML() {
        const markdownText = this.inputElement?.value ?? '';
        if (!markdownText.trim()) {
            window.alert('请先输入Markdown内容');
            return;
        }

        const html = this.mode === 'wechat' ? this.renderWeChat(false) : parseMarkdown(markdownText);
        try {
            await copyToClipboard(html);
            this.showLoading('复制成功', 1000);
        } catch (error) {
            window.alert(`复制失败: ${error}`);
        }
    },

    formatHTML(html = this.outputElement?.innerHTML ?? '') {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        const lines: string[] = [];
        template.content.childNodes.forEach((node) => {
            lines.push(...formatNode(node, 0));
        });
        return lines.join('\n');
    },

    exportFormattedHTML() {
        const markdownText = this.inputElement?.value ?? '';
        if (!markdownText.trim()) {
            window.alert('请先输入Markdown内容');
            return;
        }

        const html = this.mode === 'wechat' ? this.renderWeChat(false) : this.renderToProcessedHTML(markdownText);
        const formattedHTML = this.formatHTML(html);
        downloadHTML('markdown-output-formatted.html', this.generateFullHTML(formattedHTML));
        this.showLoading('格式化导出成功', 1000);
    },

    async copyFormattedHTML() {
        const markdownText = this.inputElement?.value ?? '';
        if (!markdownText.trim()) {
            window.alert('请先输入Markdown内容');
            return;
        }

        const html = this.mode === 'wechat' ? this.renderWeChat(false) : this.renderToProcessedHTML(markdownText);
        const formattedHTML = this.formatHTML(html);
        try {
            await copyToClipboard(formattedHTML);
            this.showLoading('格式化 HTML 已复制', 1000);
        } catch (error) {
            window.alert(`复制失败: ${error}`);
        }
    },

    renderWeChat(updatePreview = true) {
        const markdownText = this.inputElement?.value ?? this.fullContent;
        if (!markdownText.trim()) {
            if (updatePreview && this.outputElement) {
                this.outputElement.innerHTML = EMPTY_INPUT_HTML;
            }
            return '';
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = parseMarkdown(markdownText);
        renderMath(tempDiv);
        this.processImages(tempDiv);

        const wrapper = document.createElement('section');
        wrapper.setAttribute('style', WECHAT_BASE_STYLE + ' margin: 0; padding: 0;');
        wrapper.innerHTML = tempDiv.innerHTML;
        applyWeChatStyles(wrapper);
        this.weChatHTML = wrapper.outerHTML;

        if (updatePreview && this.outputElement) {
            this.outputElement.innerHTML = this.weChatHTML;
            this.outputElement.classList.remove('collapsed', 'expanded');
            this.outputElement.classList.add('markdown-content--wechat');
            this.toggleBtn && (this.toggleBtn.textContent = '折叠');
            this.setWeChatCopyStatus('公众号格式已生成');
            this.showLoading('微信格式已渲染', 1000);
        }

        return this.weChatHTML;
    },

    async copyWeChatHTML() {
        const markdownText = this.inputElement?.value ?? '';
        if (!markdownText.trim()) {
            this.setWeChatCopyStatus('请输入 Markdown 后再复制', 'error');
            window.alert('请先输入Markdown内容');
            return;
        }

        try {
            this.mode = 'wechat';
            if (this.weChatButton) {
                this.weChatButton.setAttribute('aria-pressed', 'true');
                this.weChatButton.textContent = '普通预览';
            }

            const html = this.renderWeChat(true);
            const result = await copyRichHTMLToClipboard(html);
            if (result === 'rich') {
                this.setWeChatCopyStatus('已复制富文本格式，可粘贴到微信公众平台编辑器', 'success');
                this.showLoading('公众号格式已复制', 1000);
                return;
            }

            this.setWeChatCopyStatus('当前浏览器只允许复制 HTML 源码', 'fallback');
            this.showLoading('HTML 源码已复制', 1000);
        } catch (error) {
            this.setWeChatCopyStatus('复制失败，请重试', 'error');
            window.alert(`复制失败: ${error}`);
        }
    },

    toggleWeChatMode() {
        this.mode = this.mode === 'wechat' ? 'normal' : 'wechat';
        if (this.weChatButton) {
            this.weChatButton.setAttribute('aria-pressed', String(this.mode === 'wechat'));
            this.weChatButton.textContent = this.mode === 'wechat' ? '普通预览' : '公众号预览';
        }
        this.render();
    },

    clearEditor() {
        if (!this.inputElement || !this.outputElement) {
            return;
        }

        if (window.confirm('确定要清空输入内容吗？')) {
            this.inputElement.value = '';
            this.clearPersistedInput();
            this.outputElement.innerHTML = EMPTY_PREVIEW_HTML;
            this.fullContent = '';
            this.collapsedContent = '';
            this.weChatHTML = '';
            this.mode = 'normal';
            if (this.weChatButton) {
                this.weChatButton.textContent = '公众号预览';
                this.weChatButton.setAttribute('aria-pressed', 'false');
            }
            this.setWeChatCopyStatus('富文本剪贴板待复制');
        }
    },

    loadSample() {
        if (!this.inputElement) {
            return;
        }

        this.inputElement.value = sampleMarkdown;
        this.persistInput();
        this.render();
    },

    generateFullHTML(content: string) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown渲染结果</title>
    <link rel="stylesheet" href="${HLJS_STYLE_CDN}">
    <link rel="stylesheet" href="${KATEX_STYLE_CDN}">
    <style>
        :root {
            --bg: #f7f7f4;
            --surface: #ffffff;
            --border: #d8dfdd;
            --text: #18201f;
            --text-tertiary: #798783;
        }

        body {
            margin: 0 auto;
            max-width: 900px;
            min-height: 100vh;
            padding: 3rem 1.25rem;
            font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
            line-height: 1.7;
            color: var(--text);
            background: var(--bg);
        }
        .markdown-content {
            padding: 1.6rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--surface);
        }
        .markdown-content img {
            max-width: 100%;
            height: auto;
        }
        .image-caption {
            color: var(--text-tertiary);
            font-size: 0.88rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="markdown-content">
${content}
    </div>
</body>
</html>`;
    },

    setWeChatCopyStatus(message: string, state = 'idle') {
        if (!this.weChatCopyStatus) {
            return;
        }

        this.weChatCopyStatus.textContent = message;
        if (state === 'idle') {
            this.weChatCopyStatus.removeAttribute('data-state');
            return;
        }

        this.weChatCopyStatus.dataset.state = state;
    },

    showLoading(text: string, duration = 2000) {
        if (!this.loadingIndicator || !this.loadingText) {
            return;
        }

        this.loadingText.textContent = text;
        this.loadingIndicator.classList.add('active');
        window.setTimeout(() => {
            this.loadingIndicator?.classList.remove('active');
        }, duration);
    },
};

function exposeMarkdownRenderer(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.MarkdownRenderer = MarkdownRenderer;
    window.renderMarkdown = () => MarkdownRenderer.render();
    window.togglePreview = () => MarkdownRenderer.togglePreview();
    window.exportHTML = () => MarkdownRenderer.exportHTML();
    window.copyHTML = () => MarkdownRenderer.copyHTML();
    window.clearEditor = () => MarkdownRenderer.clearEditor();
    window.loadSample = () => MarkdownRenderer.loadSample();
}

exposeMarkdownRenderer();
