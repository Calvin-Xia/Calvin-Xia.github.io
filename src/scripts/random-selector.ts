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

function setFileSelectionStatus(message: string, isError = false): void {
    const status = document.getElementById('fileSelectionStatus');
    if (!status) {
        return;
    }

    status.textContent = message;
    status.classList.toggle('tool-upload-status--error', isError);
}

function updateFileSelectionStatus(files: FileList | File[] | null): void {
    if (!files || files.length === 0) {
        setFileSelectionStatus('未选择任何文件');
        return;
    }

    const { supportedFiles, unsupportedFiles } = splitSupportedFiles(files);
    const names = supportedFiles.map((file) => file.name);

    if (supportedFiles.length === 0) {
        setFileSelectionStatus(
            `当前选择的文件类型不支持：${unsupportedFiles.join('、')}。请上传 TXT、Markdown 或 DOCX 文件。`,
            true,
        );
        return;
    }

    if (unsupportedFiles.length > 0) {
        setFileSelectionStatus(
            `已选择 ${supportedFiles.length} 个可导入文件：${names.join('、')}。以下文件将被跳过：${unsupportedFiles.join('、')}。`,
            true,
        );
        return;
    }

    setFileSelectionStatus(`已选择 ${names.length} 个文件：${names.join('、')}`);
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
        window.alert('Word文档解析功能暂时不可用，请稍后重试或使用TXT/Markdown文件');
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
        deleteButton.textContent = '删除';
        deleteButton.className = 'remove-btn';
        deleteButton.setAttribute('aria-label', `删除 ${item}`);
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

        if (window.confirm('确定要清空所有选项吗？')) {
            state.items = [];
            updateList();
            const chosen = document.getElementById('chosen');
            if (chosen) {
                chosen.textContent = '';
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
            chosen.textContent = '请先添加选项';
            chosen.classList.add('selector-result--error');
            return;
        }

        const idx = Math.floor(Math.random() * state.items.length);
        chosen.textContent = `抽中：${state.items[idx]}`;
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
                `已导入 ${supportedFiles.length} 个文件，已跳过不支持的文件：${unsupportedFiles.join('、')}。`,
                true,
            );
            return;
        }

        setFileSelectionStatus(`已导入 ${supportedFiles.length} 个文件。`);
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
