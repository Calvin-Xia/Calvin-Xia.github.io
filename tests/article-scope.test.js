import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { ARTICLE_CONTENT_SELECTOR, resolveArticleContent } from '../src/lib/article-enhancements/article-scope.js';

const rootDir = path.resolve(import.meta.dirname, '..');

function readProjectFile(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

// A minimal stand-in for document/Element good enough for resolveArticleContent.
function createFakeScope({ article = null, isArticleItself = false } = {}) {
    return {
        matches: (selector) => isArticleItself && selector === ARTICLE_CONTENT_SELECTOR,
        querySelector: (selector) => (selector === ARTICLE_CONTENT_SELECTOR ? article : null),
    };
}

describe('article enhancement scope', () => {
    test('the scope selector targets the article body marker', () => {
        assert.equal(ARTICLE_CONTENT_SELECTOR, '[data-article-content]');
    });

    test('resolveArticleContent finds the marker inside a document', () => {
        const article = { id: 'article-body' };

        assert.equal(resolveArticleContent(createFakeScope({ article })), article);
    });

    test('resolveArticleContent returns null when the container is absent', () => {
        assert.equal(resolveArticleContent(createFakeScope()), null);
        assert.equal(resolveArticleContent(null), null);
    });

    test('resolveArticleContent accepts the container element itself', () => {
        const scope = createFakeScope({ isArticleItself: true });

        assert.equal(resolveArticleContent(scope), scope);
    });

    test('resolveArticleContent falls back to the element ownerDocument', () => {
        const article = { id: 'article-body' };
        const element = { ownerDocument: createFakeScope({ article }) };

        assert.equal(resolveArticleContent(element), article);
    });
});

describe('article enhancement scope source contracts', () => {
    test('the article detail page marks its body container while keeping the CSS class', () => {
        const page = readProjectFile('src', 'pages', 'articles', '[...slug].astro');

        assert.match(page, /class="markdown-content"\s+data-article-content/);
    });

    test('tool and post previews keep the shared class but are not marked as article content', () => {
        const toolWidget = readProjectFile('src', 'components', 'MarkdownToolWidget.astro');
        const newPostForm = readProjectFile('src', 'components', 'NewPostForm.astro');

        assert.match(toolWidget, /id="markdown-output"\s+class="markdown-content"/);
        assert.match(newPostForm, /id="post-preview"\s+class="markdown-content"/);
        assert.doesNotMatch(toolWidget, /data-article-content/);
        assert.doesNotMatch(newPostForm, /data-article-content/);
    });

    test('article runtime resolves the article container and skips enhancements without it', () => {
        const runtime = readProjectFile('src', 'scripts', 'article-runtime.js');

        assert.match(runtime, /ARTICLE_CONTENT_SELECTOR/);
        assert.match(runtime, /document\.querySelector\(ARTICLE_CONTENT_SELECTOR\)/);
        assert.match(runtime, /const articleContent = findArticleContent\(\);/);
        assert.match(runtime, /if \(!articleContent\) \{\s*return;\s*\}/);
        assert.match(runtime, /initArticleEnhancements\(articleContent\)/);
        assert.match(runtime, /renderArticleMermaid\(articleContent\)/);
        // Page transitions must keep running even when no article body is present.
        assert.match(runtime, /initPageTransitions\(document, window\)/);
    });

    test('enhancements and mermaid no longer use the shared CSS class as their criterion', () => {
        const sharedSelector = /querySelector(?:All)?\(\s*['"][^'"]*\.markdown-content/;
        const enhancements = readProjectFile('src', 'lib', 'article-enhancements', 'article-enhancements.js');
        const mermaid = readProjectFile('src', 'scripts', 'article-mermaid.js');

        assert.doesNotMatch(enhancements, sharedSelector);
        assert.doesNotMatch(mermaid, sharedSelector);
        assert.match(enhancements, /resolveArticleContent\(root\)/);
        assert.match(mermaid, /resolveArticleContent\(root\)/);
    });

    test('mermaid renders only inside the resolved article container', () => {
        const mermaid = readProjectFile('src', 'scripts', 'article-mermaid.js');

        assert.match(mermaid, /const contentRoot = resolveArticleContent\(root\);/);
        assert.match(mermaid, /contentRoot\.querySelectorAll\('pre\[data-language="mermaid"\]/);
    });

    test('enhancement submodules receive the resolved root instead of re-querying the document', () => {
        const enhancements = readProjectFile('src', 'lib', 'article-enhancements', 'article-enhancements.js');

        assert.match(enhancements, /enhanceArticleImageCaptions\(markdownContent, documentRef\)/);
        assert.match(enhancements, /buildHeadingIndex\(markdownContent, documentRef\)/);
        assert.match(enhancements, /initImageLightbox\(markdownContent, \{ documentRef \}\)/);
        assert.match(enhancements, /initReadingProgress\(\{\s*tocRoot,\s*contentRoot: markdownContent,/);
    });
});
