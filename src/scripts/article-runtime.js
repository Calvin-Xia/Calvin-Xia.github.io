import { ARTICLE_CONTENT_SELECTOR } from '../lib/article-enhancements/article-scope.js';
import { initArticleEnhancements } from '../lib/article-enhancements/article-enhancements.js';
import { initPageTransitions } from './page-transitions.js';
import { renderArticleMermaid } from './article-mermaid.js';

function findArticleContent() {
    return document.querySelector(ARTICLE_CONTENT_SELECTOR);
}

function initArticleRuntime() {
    initPageTransitions(document, window);

    // 文章增强是全站加载的，但只作用于文章详情正文容器：工具页/发帖预览里找不到该容器，
    // 于是整体跳过，不抛错，也不影响页面过渡、浏览量等其他逻辑。
    //
    // 找不到容器时仍然要走增强入口：上一篇的清理（window/document 监听器与
    // IntersectionObserver）就发生在它内部（article-enhancements.js 的 enhancementCleanups）。
    // 在 ClientRouter 导航中 document 是持久的，只替换 body，所以提前 return 会把上一篇的
    // 监听器与已脱离 DOM 的正文留在原地，直到下次打开文章页才被清掉。
    const articleContent = findArticleContent();
    initArticleEnhancements(articleContent || document);

    if (!articleContent) {
        return;
    }

    void renderArticleMermaid(articleContent);
}

function startArticleRuntime() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArticleRuntime, { once: true });
        return;
    }

    initArticleRuntime();
}

startArticleRuntime();
document.addEventListener('astro:page-load', initArticleRuntime);
window.addEventListener('calvin-theme-change', () => {
    const articleContent = findArticleContent();
    if (articleContent) {
        void renderArticleMermaid(articleContent);
    }
});
