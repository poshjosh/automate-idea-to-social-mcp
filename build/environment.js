import { readEnvValue } from "./read-env-value.js";
import { logInfo } from "./logger.js";
// Environment variables for the automate-idea-to-social project
export const AIDEAS_ENV_FILE = process.env.AIDEAS_ENV_FILE;
logInfo(`AIDEAS_ENV_FILE: "${AIDEAS_ENV_FILE}"`);
if (!AIDEAS_ENV_FILE) {
    throw new Error('AIDEAS_ENV_FILE environment variable is required');
}
let aideasProjectDir = process.env.AIDEAS_PROJECT_DIR;
aideasProjectDir ??= readEnvValue(AIDEAS_ENV_FILE, "AIDEAS_PROJECT_DIR");
logInfo(`AIDEAS_PROJECT_DIR: ${aideasProjectDir}`);
if (!aideasProjectDir) {
    throw new Error('AIDEAS_PROJECT_DIR environment variable is required');
}
export const AIDEAS_PROJECT_DIR = aideasProjectDir;
export const CONFIG_DIR = readEnvValue(AIDEAS_ENV_FILE, "CONFIG_DIR");
logInfo(`CONFIG_DIR: ${CONFIG_DIR}`);
if (!CONFIG_DIR) {
    throw new Error('CONFIG_DIR is required, but was not specified in ' + AIDEAS_ENV_FILE);
}
//# sourceMappingURL=environment.js.map