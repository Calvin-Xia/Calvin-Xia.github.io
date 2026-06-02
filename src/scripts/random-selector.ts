import { t } from '../lib/i18n.ts';

type MammothApi = {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
};

type RandomSelectorState = {
    items: string[];
    cleanupController: AbortController | null;
};

declare global {
    interface Window {
        RandomSelector?: typeof RandomSelector;
        mammoth?: MammothApi;
    }
}

const SELECTOR_ITEM_TEXT_CLASS = 'selector-item-text';
const SUPPORTED_FILE_EXTENSIONS = new Set(['txt', 'md', 'docx']);
const MAMMOTH_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.0/mammoth.browser.min.js';
const MAMMOTH_LOCAL_URL = '/libs/mammoth/mammoth.browser.min.js';

const state: RandomSelectorState = {
    items: [],
    cleanupController: null,
};
let currentFileStatus: { key: string; vars?: Record<string, string | number> | undefined; isError: boolean } = {
    key: 'random.noFile',
    isError: false,
};

function joinNames(names: string[]): string {
    return names.join(t('random.listSeparator'));
}

function getFileExtension(fileName: string): string {
    const parts = String(fileName || '').toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
}

function splitSupportedFiles(files: FileList | File[]) {
    const supportedFiles: File[] = [];
    const unsupportedFiles: string[] = [];

    for (const file of Array.from(files || [])) {
        if (SUPPORTED_FILE_EXTENSIONS.has(getFileExtension(file.name))) {
            supportedFiles.push(file);
        } else {
            unsupportedFiles.push(file.name);
        }
    }

    return { supportedFiles, unsupportedFiles };
}

function setFileSelectionStatus(key: string, vars?: Record<string, string | number>, isError = false): void {
    const status = document.getElementById('fileSelectionStatus');
    currentFileStatus = { key, vars, isError };

    if (!status) {
        return;
    }

    status.textContent = t(key, vars);
    status.setAttribute('data-i18n', key);
    if (vars) {
        status.setAttribute('data-i18n-vars', JSON.stringify(vars));
    } else {
        status.removeAttribute('data-i18n-vars');
    }
    status.classList.toggle('tool-upload-status--error', isError);
}

function updateFileSelectionStatus(files: FileList | File[] | null): void {
    if (!files || files.length === 0) {
        setFileSelectionStatus('random.noFile');
        return;
    }

    const { supportedFiles, unsupportedFiles } = splitSupportedFiles(files);
    const names = supportedFiles.map((file) => file.name);

    if (supportedFiles.length === 0) {
        setFileSelectionStatus(
            'random.unsupportedFiles',
            { files: joinNames(unsupportedFiles) },
            true,
        );
        return;
    }

    if (unsupportedFiles.length > 0) {
        setFileSelectionStatus(
            'random.selectedWithSkipped',
            { count: supportedFiles.length, names: joinNames(names), skipped: joinNames(unsupportedFiles) },
            true,
        );
        return;
    }

    setFileSelectionStatus('random.selectedFiles', { count: names.length, names: joinNames(names) });
}

function sanitizeInput(input: unknown): string {
    if (typeof input !== 'string') {
        return '';
    }

    return input
        .trim()
        .substring(0, 200)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function fillFromText(text: string): void {
    const lines = text
        .split(/\r?\n/)
        .map((line) => sanitizeInput(line))
        .filter(Boolean);

    for (const line of lines) {
        if (!state.items.includes(line)) {
            state.items.push(line);
        }
    }
}

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
    });
}

async function loadMammoth(): Promise<void> {
    if (window.mammoth) {
        return;
    }

    try {
        await loadScript(MAMMOTH_CDN_URL);
        console.log('[CDN Fallback] Successfully loaded mammoth.js from CDN');
    } catch (error) {
        console.warn('[CDN Fallback] CDN failed for mammoth.js, trying local', error);
        await loadScript(MAMMOTH_LOCAL_URL);
        console.log('[CDN Fallback] Successfully loaded mammoth.js from local');
    }
}

function extractBlockText(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th, figcaption');
    return Array.from(blocks)
        .map((el) => el.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n');
}

async function extractDocx(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
        await loadMammoth();
        if (!window.mammoth) {
            throw new Error('mammoth is unavailable after loading scripts');
        }

        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        fillFromText(extractBlockText(result.value));
    } catch (error) {
        console.error('[CDN Fallback] Failed to load mammoth.js:', error);
        window.alert(t('random.wordUnavailable'));
    }
}

function updateList(): void {
    const list = document.getElementById('items');
    if (!list) {
        return;
    }

    list.innerHTML = '';
    state.items.forEach((item, idx) => {
        const itemElement = document.createElement('li');
        const textElement = document.createElement('span');
        textElement.className = SELECTOR_ITEM_TEXT_CLASS;
        textElement.textContent = item;
        itemElement.appendChild(textElement);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = t('random.delete');
        deleteButton.className = 'remove-btn';
        deleteButton.setAttribute('aria-label', t('random.deleteItem', { item }));
        deleteButton.addEventListener('click', () => RandomSelector.deleteItem(idx));
        itemElement.appendChild(deleteButton);

        list.appendChild(itemElement);
    });
}

export const RandomSelector = {
    init() {
        state.cleanupController?.abort();
        state.cleanupController = new AbortController();
        const { signal } = state.cleanupController;

        const itemInput = document.getElementById('itemInput') as HTMLInputElement | null;
        const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;

        itemInput?.addEventListener(
            'keydown',
            (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addItem();
                }
            },
            { signal },
        );

        fileInput?.addEventListener('change', () => updateFileSelectionStatus(fileInput.files), { signal });
        updateList();
    },

    addItem() {
        const input = document.getElementById('itemInput') as HTMLInputElement | null;
        if (!input) {
            return;
        }

        const value = sanitizeInput(input.value);
        if (!value) {
            return;
        }

        state.items.push(value);
        input.value = '';
        updateList();
    },

    deleteItem(idx: number) {
        state.items.splice(idx, 1);
        updateList();
    },

    deleteAll() {
        if (state.items.length === 0) {
            return;
        }

        if (window.confirm(t('random.confirmClear'))) {
            state.items = [];
            updateList();
            const chosen = document.getElementById('chosen');
            if (chosen) {
                chosen.textContent = '';
                delete chosen.dataset['selectedItem'];
                delete chosen.dataset['emptyChoice'];
                chosen.classList.remove('selector-result--error');
            }
        }
    },

    chooseRandom() {
        const chosen = document.getElementById('chosen');
        if (!chosen) {
            return;
        }

        if (state.items.length === 0) {
            chosen.textContent = t('random.emptyChoice');
            chosen.dataset['emptyChoice'] = 'true';
            delete chosen.dataset['selectedItem'];
            chosen.classList.add('selector-result--error');
            return;
        }

        const idx = Math.floor(Math.random() * state.items.length);
        const selectedItem = state.items[idx];
        if (!selectedItem) {
            return;
        }

        chosen.textContent = t('random.chosen', { item: selectedItem });
        chosen.dataset['selectedItem'] = selectedItem;
        delete chosen.dataset['emptyChoice'];
        chosen.classList.remove('selector-result--error');
    },

    openFilePicker() {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
        if (!fileInput) {
            return;
        }

        fileInput.click();
    },

    async handleFiles() {
        const input = document.getElementById('fileInput') as HTMLInputElement | null;
        if (!input?.files || input.files.length === 0) {
            updateFileSelectionStatus([]);
            return;
        }

        const { supportedFiles, unsupportedFiles } = splitSupportedFiles(input.files);
        if (supportedFiles.length === 0) {
            updateFileSelectionStatus(input.files);
            input.value = '';
            return;
        }

        for (const file of supportedFiles) {
            const fileExtension = getFileExtension(file.name);
            if (fileExtension === 'txt' || fileExtension === 'md') {
                fillFromText(await file.text());
            } else if (fileExtension === 'docx') {
                await extractDocx(await file.arrayBuffer());
            }
        }

        updateList();
        input.value = '';

        if (unsupportedFiles.length > 0) {
            setFileSelectionStatus(
                'random.importedWithSkipped',
                { count: supportedFiles.length, files: joinNames(unsupportedFiles) },
                true,
            );
            return;
        }

        setFileSelectionStatus('random.importedFiles', { count: supportedFiles.length });
    },

    updateList,
    sanitizeInput,
};

function exposeRandomSelector(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.RandomSelector = RandomSelector;
}

exposeRandomSelector();

if (typeof window !== 'undefined') {
    window.addEventListener('calvin-lang-change', () => {
        updateList();
        setFileSelectionStatus(currentFileStatus.key, currentFileStatus.vars, currentFileStatus.isError);
        const chosen = document.getElementById('chosen');
        if (chosen?.dataset['emptyChoice'] === 'true') {
            chosen.textContent = t('random.emptyChoice');
        } else if (chosen?.dataset['selectedItem']) {
            chosen.textContent = t('random.chosen', { item: chosen.dataset['selectedItem'] });
        }
    });
}
