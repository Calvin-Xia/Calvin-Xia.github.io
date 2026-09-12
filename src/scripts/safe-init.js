import { t } from '../lib/i18n.ts';

// Wraps page module init functions so one broken module cannot take down the rest.
export function safeInit(moduleName, initFn) {
    try {
        initFn();
    } catch (error) {
        console.error(`[${t('common.moduleInitError')}] ${moduleName}:`, error);
    }
}
