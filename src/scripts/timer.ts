import { t } from '../lib/i18n.ts';

type TimeInputName = 'hours' | 'minutes' | 'seconds';

type TimerElements = Partial<{
    startBtn: HTMLButtonElement | null;
    pauseBtn: HTMLButtonElement | null;
    resetBtn: HTMLButtonElement | null;
    setTimeBtn: HTMLButtonElement | null;
    timerDisplay: HTMLElement | null;
    progressBar: HTMLElement | null;
    progressText: HTMLElement | null;
    hoursInput: HTMLInputElement | null;
    minutesInput: HTMLInputElement | null;
    secondsInput: HTMLInputElement | null;
}>;

declare global {
    interface Window {
        MrXiaApp?: {
            Timer?: typeof Timer;
            [key: string]: unknown;
        };
        changeTime?: typeof changeTime;
    }
}

function readDefaultElements(): TimerElements {
    return {
        startBtn: document.getElementById('start') as HTMLButtonElement | null,
        pauseBtn: document.getElementById('pause') as HTMLButtonElement | null,
        resetBtn: document.getElementById('reset') as HTMLButtonElement | null,
        setTimeBtn: document.getElementById('set-time') as HTMLButtonElement | null,
        timerDisplay: document.getElementById('timer-display'),
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        hoursInput: document.getElementById('hours') as HTMLInputElement | null,
        minutesInput: document.getElementById('minutes') as HTMLInputElement | null,
        secondsInput: document.getElementById('seconds') as HTMLInputElement | null,
    };
}

function getInput(type: TimeInputName, elements: TimerElements = Timer.cachedElements): HTMLInputElement | null {
    const key = `${type}Input` as keyof TimerElements;
    return (elements[key] as HTMLInputElement | null) ?? (document.getElementById(type) as HTMLInputElement | null);
}

function clampInputValue(input: HTMLInputElement): number {
    const min = Number.parseInt(input.min, 10);
    const max = Number.parseInt(input.max, 10);
    const fallbackMin = Number.isNaN(min) ? 0 : min;
    const fallbackMax = Number.isNaN(max) ? Number.MAX_SAFE_INTEGER : max;
    const parsed = Number.parseInt(input.value, 10);
    const value = Number.isNaN(parsed) ? fallbackMin : parsed;
    return Math.max(fallbackMin, Math.min(fallbackMax, value));
}

function setButtonState(isRunning: boolean): void {
    const { startBtn, pauseBtn } = Timer.cachedElements;
    if (startBtn) {
        startBtn.disabled = isRunning;
    }
    if (pauseBtn) {
        pauseBtn.disabled = !isRunning;
    }
}

export function changeTime(type: TimeInputName, delta: number, elements: TimerElements = Timer.cachedElements): void {
    const input = getInput(type, elements);
    if (!input) {
        return;
    }

    const min = Number.parseInt(input.min, 10);
    const max = Number.parseInt(input.max, 10);
    const safeMin = Number.isNaN(min) ? 0 : min;
    const safeMax = Number.isNaN(max) ? 59 : max;
    let value = clampInputValue(input) + delta;

    if (type === 'hours') {
        input.value = String(Math.max(safeMin, Math.min(safeMax, value)));
        return;
    }

    if (value < safeMin) {
        if (type === 'minutes') {
            const hoursInput = getInput('hours', elements);
            if (hoursInput && clampInputValue(hoursInput) > 0) {
                hoursInput.value = String(clampInputValue(hoursInput) - 1);
                value = safeMax;
            } else {
                value = safeMin;
            }
        }

        if (type === 'seconds') {
            const minutesInput = getInput('minutes', elements);
            if (minutesInput && clampInputValue(minutesInput) > 0) {
                minutesInput.value = String(clampInputValue(minutesInput) - 1);
                value = safeMax;
            } else {
                value = safeMin;
            }
        }
    }

    if (value > safeMax) {
        if (type === 'minutes') {
            const hoursInput = getInput('hours', elements);
            if (hoursInput && clampInputValue(hoursInput) < Number.parseInt(hoursInput.max, 10)) {
                hoursInput.value = String(clampInputValue(hoursInput) + 1);
                value = safeMin;
            } else {
                value = safeMax;
            }
        }

        if (type === 'seconds') {
            const minutesInput = getInput('minutes', elements);
            if (minutesInput && clampInputValue(minutesInput) < Number.parseInt(minutesInput.max, 10)) {
                minutesInput.value = String(clampInputValue(minutesInput) + 1);
                value = safeMin;
            } else {
                value = safeMax;
            }
        }
    }

    input.value = String(value);
}

export const Timer = {
    startTime: null as number | null,
    elapsedTime: 0,
    targetTime: 0,
    intervalId: null as number | null,
    isRunning: false,
    cachedElements: {} as TimerElements,
    cleanupController: null as AbortController | null,

    init(elements: TimerElements = {}) {
        this.destroyListeners();
        this.cachedElements = {
            ...readDefaultElements(),
            ...elements,
        };

        const { startBtn, pauseBtn, resetBtn, setTimeBtn, timerDisplay } = this.cachedElements;

        if (!timerDisplay) {
            return;
        }

        this.cleanupController = new AbortController();
        const { signal } = this.cleanupController;

        timerDisplay.textContent = this.formatTime(Math.floor(this.targetTime / 1000));
        this.updateProgress();
        setButtonState(this.isRunning);

        startBtn?.addEventListener('click', () => this.start(), { signal });
        pauseBtn?.addEventListener('click', () => this.pause(), { signal });
        resetBtn?.addEventListener('click', () => this.reset(), { signal });
        setTimeBtn?.addEventListener('click', () => this.setTimeFromInputs(), { signal });

        for (const input of [this.cachedElements.hoursInput, this.cachedElements.minutesInput, this.cachedElements.secondsInput]) {
            input?.addEventListener('input', () => this.validateTimeInput(input), { signal });
        }
    },

    destroyListeners() {
        this.cleanupController?.abort();
        this.cleanupController = null;
    },

    validateTimeInput(input: HTMLInputElement) {
        input.value = String(clampInputValue(input));
    },

    setTimeFromInputs() {
        const { timerDisplay, hoursInput, minutesInput, secondsInput } = this.cachedElements;
        const hours = hoursInput ? clampInputValue(hoursInput) : 0;
        const minutes = minutesInput ? clampInputValue(minutesInput) : 0;
        const seconds = secondsInput ? clampInputValue(secondsInput) : 0;

        this.stopTimer();
        this.startTime = null;
        this.targetTime = (hours * 3600 + minutes * 60 + seconds) * 1000;
        this.elapsedTime = 0;
        this.isRunning = false;

        if (timerDisplay) {
            timerDisplay.textContent = this.formatTime(Math.floor(this.targetTime / 1000));
        }

        this.updateProgress();
        setButtonState(false);
    },

    formatTime(totalSeconds: number) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    update() {
        if (!this.startTime) {
            return;
        }

        const now = Date.now();
        let totalElapsed = this.elapsedTime + (now - this.startTime);

        if (this.targetTime > 0 && totalElapsed >= this.targetTime) {
            totalElapsed = this.targetTime;
            this.elapsedTime = this.targetTime;
            this.startTime = null;
            this.isRunning = false;
            this.stopTimer();
            setButtonState(false);
        }

        const { timerDisplay } = this.cachedElements;
        if (timerDisplay) {
            timerDisplay.textContent = this.formatTime(Math.floor(totalElapsed / 1000));
        }

        this.updateProgress(totalElapsed);
    },

    updateProgress(elapsedTime = this.elapsedTime) {
        const { progressBar, progressText } = this.cachedElements;
        if (!progressBar || !progressText) {
            return;
        }

        if (this.targetTime <= 0) {
            progressBar.style.width = '0%';
            progressText.textContent = t('timer.elapsed', { time: this.formatTime(Math.floor(elapsedTime / 1000)) });
            return;
        }

        const progress = Math.min(100, Math.floor((elapsedTime / this.targetTime) * 100));
        progressBar.style.width = `${progress}%`;
        progressText.textContent = t('timer.completed', { progress });
    },

    start() {
        if (this.isRunning) {
            return;
        }

        this.startTime = Date.now();
        this.isRunning = true;
        this.intervalId = window.setInterval(() => this.update(), 100);
        setButtonState(true);
    },

    pause() {
        if (!this.isRunning) {
            return;
        }

        this.stopTimer();

        if (this.startTime) {
            this.elapsedTime += Date.now() - this.startTime;
            this.startTime = null;
        }

        this.isRunning = false;
        this.updateProgress();
        setButtonState(false);
    },

    reset() {
        this.pause();
        this.elapsedTime = 0;

        const { timerDisplay } = this.cachedElements;
        if (timerDisplay) {
            timerDisplay.textContent = this.formatTime(Math.floor(this.targetTime / 1000));
        }

        this.updateProgress();
        setButtonState(false);
    },

    syncDisplay() {
        const { timerDisplay } = this.cachedElements;
        if (timerDisplay) {
            const displaySeconds = this.isRunning && this.startTime
                ? Math.floor((this.elapsedTime + Date.now() - this.startTime) / 1000)
                : Math.floor((this.targetTime > 0 && this.elapsedTime === 0 ? this.targetTime : this.elapsedTime) / 1000);
            timerDisplay.textContent = this.formatTime(displaySeconds);
        }
        setButtonState(this.isRunning);
        this.updateProgress();
    },

    stopTimer() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    },
};

function exposeTimerGlobals(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.MrXiaApp = {
        ...(window.MrXiaApp ?? {}),
        Timer,
    };
    window.changeTime = changeTime;
    window.addEventListener('calvin-lang-change', () => Timer.syncDisplay());
}

exposeTimerGlobals();
