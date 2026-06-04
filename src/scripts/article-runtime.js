import { initArticleEnhancements } from '../lib/article-enhancements/article-enhancements.js';
import { initPageTransitions } from './page-transitions.js';

function initArticleRuntime() {
    initPageTransitions(document, window);
    initArticleEnhancements(document);
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
