import { enhanceArticleImageCaptions } from '../article-image-captions.js';
import { resolveArticleContent } from './article-scope.js';
import { buildHeadingIndex } from './heading-index.js';
import { initImageLightbox } from './image-lightbox.js';
import { initReadingProgress } from './reading-progress.js';
import { initSelectionToolbar } from './selection-toolbar.js';
import { initSectionReveals } from './section-reveals.js';

const enhancementCleanups = new WeakMap();

function resolveDocument(root) {
    if (root?.nodeType === 9) {
        return root;
    }

    return root?.ownerDocument || document;
}

export function initArticleEnhancements(root = document) {
    const documentRef = resolveDocument(root);
    // 作用域收紧到文章正文容器：工具页/发帖预览复用 `.markdown-content` 类名，
    // 不能用它当判据（见 article-scope.js）。找不到容器就整体跳过。
    const markdownContent = resolveArticleContent(root);
    const tocRoot = documentRef.querySelector?.('[data-article-toc]');

    enhancementCleanups.get(documentRef)?.();
    enhancementCleanups.delete(documentRef);

    if (!markdownContent) {
        if (tocRoot) {
            tocRoot.hidden = true;
        }

        return { headings: [] };
    }

    enhanceArticleImageCaptions(markdownContent, documentRef);
    const headings = buildHeadingIndex(markdownContent, documentRef);
    initImageLightbox(markdownContent, { documentRef });
    const selectionToolbarCleanup = initSelectionToolbar(markdownContent, {
        windowRef: documentRef.defaultView || window,
    });
    const progressCleanup = initReadingProgress({
        tocRoot,
        contentRoot: markdownContent,
        headings,
        documentRef,
        windowRef: documentRef.defaultView || window,
    });
    const sectionRevealCleanup = initSectionReveals(markdownContent, {
        windowRef: documentRef.defaultView || window,
    });
    const cleanup = () => {
        for (const fn of [selectionToolbarCleanup, progressCleanup, sectionRevealCleanup]) {
            try { fn(); } catch {}
        }
        enhancementCleanups.delete(documentRef);
    };

    enhancementCleanups.set(documentRef, cleanup);

    return { headings };
}
