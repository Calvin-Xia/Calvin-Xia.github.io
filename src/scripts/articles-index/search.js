import { escapeRegExp } from '../../lib/escape-regexp.js';

export function highlightedFragment(value, query) {
    const fragment = document.createDocumentFragment();
    const source = String(value || '');
    const normalizedQuery = String(query || '').trim();

    if (!normalizedQuery) {
        fragment.append(document.createTextNode(source));
        return fragment;
    }

    const pattern = new RegExp(escapeRegExp(normalizedQuery), 'gi');
    let lastIndex = 0;

    for (const match of source.matchAll(pattern)) {
        const matchIndex = match.index ?? 0;
        if (matchIndex > lastIndex) {
            fragment.append(document.createTextNode(source.slice(lastIndex, matchIndex)));
        }

        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        fragment.append(mark);
        lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < source.length) {
        fragment.append(document.createTextNode(source.slice(lastIndex)));
    }

    return fragment;
}

export function createSuggestionElement(item, index, query, { label = '', onNavigate } = {}) {
    const suggestion = document.createElement('div');
    suggestion.className = 'suggestion-item';
    suggestion.id = `suggestion-${item.id}`;
    suggestion.dataset.index = String(index);
    suggestion.setAttribute('role', 'option');

    const title = document.createElement('div');
    title.className = 'suggestion-title';
    title.append(highlightedFragment(item.title, query));

    const meta = document.createElement('div');
    meta.className = 'suggestion-meta';
    meta.textContent = [label, item.category, item.date].filter(Boolean).join(' · ');

    suggestion.append(title, meta);
    suggestion.addEventListener('click', () => onNavigate?.());
    return suggestion;
}

export function hideSearchHistory(historyContainer) {
    if (historyContainer) {
        historyContainer.innerHTML = '';
    }
}

export function hideSuggestions(state, suggestionsContainer, searchInput) {
    state.suggestionRequestId += 1;
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
    state.suggestionItems = [];
    state.selectedSuggestionIndex = -1;
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
}

export function updateSuggestionSelection(state, searchInput) {
    state.suggestionItems.forEach((item, index) => {
        const selected = index === state.selectedSuggestionIndex;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));

        if (selected) {
            searchInput.setAttribute('aria-activedescendant', item.id);
        }
    });
}

export function setSearchStatus(statusElement, message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}
