export class SecurityLogger {
    constructor(options = {}) {
        this.logs = [];
        this.maxSize = options.maxSize || 1000;
        this.alertThreshold = options.alertThreshold || 0.1;
        this.alertCallback = null;
        this.alertFired = false;
    }

    logRequest({ path, status, method }) {
        const entry = {
            timestamp: new Date().toISOString(),
            path,
            status,
            method,
            isError: status >= 400,
        };

        if (this.logs.length >= this.maxSize) {
            this.logs.shift();
        }

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
        if (!this.alertCallback) {
            return;
        }

        const errorRate = this.getErrorRate();

        if (errorRate > this.alertThreshold && !this.alertFired) {
            this.alertFired = true;
            this.alertCallback({
                errorRate,
                threshold: this.alertThreshold,
                totalRequests: this.logs.length,
                errorRequests: this.logs.filter((log) => log.isError).length,
            });
        } else if (errorRate <= this.alertThreshold) {
            this.alertFired = false;
        }
    }

    reset() {
        this.logs = [];
        this.alertFired = false;
    }
}
