import { t } from '../../lib/i18n.ts';

export function createTypeBadge(type, label) {
    const badge = document.createElement('span');
    badge.className = `content-type-badge content-type-badge--${type}`;
    badge.textContent = label;
    return badge;
}

export function appendReadingStats(container, item) {
    if (!item.readingStats) {
        return;
    }

    const stats = document.createElement('span');
    stats.className = 'blog-card-reading-stats';
    stats.textContent = `${item.readingStats.wordCountDisplay} · ${item.readingStats.readTimeDisplay}`;
    container.append(stats);
}

export function createContentCard(item, { mixed = false, index = 0, highlighted = false, fresh = false, thumbSource = null, typeLabel = '' } = {}) {
    const card = document.createElement('article');
    card.className = `blog-card content-card-enter${mixed ? ' blog-card--mixed' : ''}${highlighted ? ' search-result' : ''}`;
    card.style.setProperty('--stagger-index', String(index));

    const link = document.createElement('a');
    link.href = item.filePath;
    link.className = 'blog-card-link';

    if (thumbSource) {
        const thumb = document.createElement('img');
        thumb.className = 'blog-card-thumb';
        thumb.src = thumbSource;
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        thumb.width = 480;
        thumb.height = 270;
        link.append(thumb);
    }

    const title = document.createElement('h2');
    title.className = `blog-card-title${highlighted ? ' search-result-title' : ''}`;
    if (highlighted && item.highlightedTitle) {
        title.innerHTML = item.highlightedTitle;
    } else {
        title.textContent = item.title;
    }

    const excerpt = document.createElement('p');
    excerpt.className = `blog-card-excerpt${highlighted ? ' search-result-excerpt' : ''}`;
    if (highlighted && item.highlightedExcerpt) {
        excerpt.innerHTML = item.highlightedExcerpt;
    } else {
        excerpt.textContent = item.excerpt;
    }

    link.append(title, excerpt);
    card.append(link);

    const meta = document.createElement('div');
    meta.className = `blog-card-meta${highlighted ? ' search-result-meta' : ''}`;

    if (mixed) {
        meta.append(createTypeBadge(item.type, typeLabel));
    }

    if (fresh) {
        const freshBadge = document.createElement('span');
        freshBadge.className = 'content-type-badge content-type-badge--new';
        freshBadge.textContent = t('common.new');
        meta.append(freshBadge);
    }

    if (item.category) {
        const category = document.createElement('span');
        category.className = 'blog-card-category';
        category.textContent = item.category;
        meta.append(category);
    }

    item.tags.slice(0, mixed ? 3 : item.tags.length).forEach((tag) => {
        const tagNode = document.createElement('span');
        tagNode.className = 'blog-card-tag';
        tagNode.textContent = tag;
        meta.append(tagNode);
    });

    const dateElement = document.createElement('div');
    dateElement.className = `blog-card-date blog-card-date-row${highlighted ? ' search-result-date' : ''}`;

    const dateText = document.createElement('span');
    dateText.textContent = item.date;
    dateElement.append(dateText);
    appendReadingStats(dateElement, item);

    card.append(meta, dateElement);
    return card;
}

export function renderNoResults(container, { onReset } = {}) {
    if (!container) {
        return;
    }

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'no-results';

    const title = document.createElement('p');
    title.textContent = t('articles.noResultsTitle');

    const description = document.createElement('p');
    description.className = 'text-small';
    description.textContent = t('articles.noResultsDescription');

    const actions = document.createElement('div');
    actions.className = 'no-results-actions';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'btn btn-outline';
    resetButton.textContent = t('articles.resetFilters');
    resetButton.addEventListener('click', () => onReset?.());

    actions.append(resetButton);
    wrapper.append(title, description, actions);
    container.append(wrapper);
}

export function showSkeletonThen(resultsContainer, skeletons, renderFn, reducedMotion = false) {
    if (!resultsContainer || !skeletons) {
        renderFn();
        return;
    }

    resultsContainer.innerHTML = '';
    skeletons.hidden = false;

    window.setTimeout(() => {
        skeletons.hidden = true;
        renderFn();
    }, reducedMotion ? 0 : 160);
}
