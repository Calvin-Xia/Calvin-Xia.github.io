// 文章增强的作用域判据。
//
// 历史上这些增强以 `.markdown-content` 是否存在来判定「这是不是文章正文」，但工具页
// 复用了同一个类名来继承排版样式（src/components/MarkdownToolWidget.astro 的
// `#markdown-output`、src/components/NewPostForm.astro 的 `#post-preview`），
// 于是预览区被误加上标题锚点、图片灯箱、图注、选区工具条和逐段渐显。
//
// 现在只有文章详情页的正文容器带 `data-article-content`（src/pages/articles/[...slug].astro）。
// 该类名仍然保留给 CSS 使用，绝不能用它当判据。
export const ARTICLE_CONTENT_SELECTOR = '[data-article-content]';

function resolveScope(root) {
    if (!root) {
        return null;
    }

    if (root.querySelector) {
        return root;
    }

    return root.ownerDocument || null;
}

/**
 * 在 `root`（document、元素或 ownerDocument）内定位文章正文容器。
 * 若 `root` 本身就是该容器（带 `data-article-content`），直接返回它。
 * 找不到时返回 null —— 调用方据此整体跳过文章增强。
 */
export function resolveArticleContent(root) {
    const scope = resolveScope(root);

    if (!scope) {
        return null;
    }

    if (scope.matches?.(ARTICLE_CONTENT_SELECTOR)) {
        return scope;
    }

    return scope.querySelector?.(ARTICLE_CONTENT_SELECTOR) || null;
}
