export function setFilterVisibility(filterNav, isVisible, searchInput) {
    if (!filterNav) {
        return;
    }

    if (!isVisible && filterNav.contains(document.activeElement)) {
        searchInput?.focus();
    }

    filterNav.classList.toggle('is-hidden', !isVisible);
    filterNav.setAttribute('aria-hidden', String(!isVisible));
}

export function setActiveFilter(container, value) {
    let normalizedValue = 'all';

    container?.querySelectorAll('.filter-tag').forEach((button) => {
        if (button.dataset.filter === value) {
            normalizedValue = value;
        }
    });

    container?.querySelectorAll('.filter-tag').forEach((button) => {
        const active = button.dataset.filter === normalizedValue;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });

    return normalizedValue;
}

export function resetFilterButtons(container) {
    container?.querySelectorAll('.filter-tag').forEach((button) => {
        const active = button.dataset.filter === 'all';
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

export function selectFilterButton(container, button) {
    container?.querySelectorAll('.filter-tag').forEach((tag) => {
        tag.classList.remove('active');
        tag.setAttribute('aria-pressed', 'false');
    });

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
}

export function getFilteredArticles(articles, { currentCategory, currentTag }) {
    return articles.filter((item) => {
        const categoryMatch = currentCategory === 'all' || item.category === currentCategory;
        const tagMatch = currentTag === 'all' || item.tags.includes(currentTag);
        return categoryMatch && tagMatch;
    });
}
