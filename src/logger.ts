const logs: string[] = [];

export function clearLogs() {
    logs.length = 0;
}

export function getLogs(): string[] {
    return logs;
}

function log(level: string, message: string) {
    const log = `${new Date().toISOString()} ${level}: ${message}`;
    logs.push(log)
    console.log(log);
}

export function logInfo(message: string) {
    log(' INFO', message);
}

export function logError(message: string) {
    log('ERROR', message);
}

export function logThrown(message: string, error: unknown) {
    logError(`${message}: ${error instanceof Error ? error.message : String(error)}`);
}
