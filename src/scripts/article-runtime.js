import { ARTICLE_CONTENT_SELECTOR } from '../lib/article-enhancements/article-scope.js';
import { initArticleEnhancements } from '../lib/article-enhancements/article-enhancements.js';
import { initPageTransitions } from './page-transitions.js';
import { renderArticleMermaid } from './article-mermaid.js';

function findArticleContent() {
    return document.querySelector(ARTICLE_CONTENT_SELECTOR);
}

function initArticleRuntime() {
    initPageTransitions(document, window);

    // 文章增强是全站加载的，但只作用于文章详情正文容器。工具页/发帖预览里找不到
    // 该容器，于是整体跳过：不抛错，也不影响页面过渡、浏览量等其他逻辑。
    const articleContent = findArticleContent();
    if (!articleContent) {
        return;
    }

    initArticleEnhancements(articleContent);
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
