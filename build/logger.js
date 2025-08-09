const logs = [];
export function clearLogs() {
    logs.length = 0;
}
export function getLogs() {
    return logs;
}
function log(level, message) {
    const log = `${new Date().toISOString()} ${level}: ${message}`;
    logs.push(log);
    console.log(log);
}
export function logInfo(message) {
    log(' INFO', message);
}
export function logError(message) {
    log('ERROR', message);
}
export function logThrown(message, error) {
    logError(`${message}: ${error instanceof Error ? error.message : String(error)}`);
}
//# sourceMappingURL=logger.js.map