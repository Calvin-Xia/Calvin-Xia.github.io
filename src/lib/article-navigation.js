// Build-time article navigation helpers: prev/next by publish order plus
// scored related posts (same category first, tag overlap, recency fill).

function toCard(post) {
    return {
        slug: post.id,
        title: post.data.title,
        excerpt: post.data.excerpt,
        category: post.data.category,
        date: post.data.date,
    };
}

export function sortPostsByDateDesc(posts) {
    return [...posts].sort((a, b) => b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id, 'zh-CN'));
}

export function buildArticleNavigation(sortedPosts, currentId) {
    const index = sortedPosts.findIndex((post) => post.id === currentId);

    if (index === -1) {
        return { older: null, newer: null };
    }

    return {
        older: sortedPosts[index + 1] ? toCard(sortedPosts[index + 1]) : null,
        newer: sortedPosts[index - 1] ? toCard(sortedPosts[index - 1]) : null,
    };
}

export function selectRelatedPosts(sortedPosts, currentId, { limit = 4, category = '', tags = [] } = {}) {
    const tagSet = new Set(tags);
    const scored = sortedPosts
        .filter((post) => post.id !== currentId)
        .map((post) => {
            let score = 0;
            if (category && post.data.category === category) {
                score += 2;
            }
            for (const tag of post.data.tags || []) {
                if (tagSet.has(tag)) {
                    score += 1;
                }
            }
            return { post, score };
        })
        .sort((left, right) => right.score - left.score
            || right.post.data.date.localeCompare(left.post.data.date)
            || left.post.id.localeCompare(right.post.id, 'zh-CN'));

    const picked = scored.filter((entry) => entry.score > 0).slice(0, limit);
    for (const entry of scored) {
        if (picked.length >= limit) {
            break;
        }
        if (!picked.includes(entry)) {
            picked.push(entry);
        }
    }

    return picked.map((entry) => toCard(entry.post));
}
