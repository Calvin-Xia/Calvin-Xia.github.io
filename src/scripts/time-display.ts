import { t } from '../lib/i18n.ts';

let intervalId: number | undefined;

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

function formatTime(date: Date): string {
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());
    const seconds = pad2(date.getSeconds());
    return `${hours}:${minutes}:${seconds}`;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const weekday = t(`time.weekdays.${date.getDay()}`);
    return `${year}-${month}-${day} ${weekday}`;
}

function updateTime(): void {
    const now = new Date();
    const timeElement = document.querySelector<HTMLElement>('.current-time');

    if (!timeElement) {
        return;
    }

    timeElement.innerHTML = `
        <span class="current-time__label">${t('time.label')}</span>
        <span class="current-time__clock">${formatTime(now)}</span>
        <span class="current-time__date">${formatDate(now)}</span>
    `;
}

export const TimeDisplay = {
    init(): void {
        if (intervalId) {
            window.clearInterval(intervalId);
        }

        updateTime();
        intervalId = window.setInterval(updateTime, 1000);
        window.addEventListener('calvin-lang-change', updateTime);

        window.addEventListener(
            'beforeunload',
            () => {
                if (intervalId) {
                    window.clearInterval(intervalId);
                    intervalId = undefined;
                }
            },
            { once: true },
        );
    },

    updateTime,
    formatTime,
    formatDate,
};

export function initTimeDisplay(): void {
    TimeDisplay.init();
}
