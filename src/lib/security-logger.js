export class SecurityLogger {
    constructor(options = {}) {
        this.logs = [];
        this.alertThreshold = options.alertThreshold || 0.1;
        this.alertCallback = null;
    }

    logRequest({ path, status, method }) {
        const entry = {
            timestamp: new Date().toISOString(),
            path,
            status,
            method,
            isError: status >= 400,
        };
        this.logs.push(entry);
        this.checkAlert();
        return entry;
    }

    getErrorRate() {
        if (this.logs.length === 0) return 0;
        const errors = this.logs.filter((log) => log.isError).length;
        return errors / this.logs.length;
    }

    getLogs() {
        return this.logs;
    }

    onAlert(callback) {
        this.alertCallback = callback;
    }

    checkAlert() {
        if (this.alertCallback && this.getErrorRate() > this.alertThreshold) {
            this.alertCallback({
                errorRate: this.getErrorRate(),
                threshold: this.alertThreshold,
                totalRequests: this.logs.length,
                errorRequests: this.logs.filter((log) => log.isError).length,
            });
        }
    }

    reset() {
        this.logs = [];
    }
}
