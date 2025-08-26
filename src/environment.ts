import * as os from "os";
import { readEnvValue } from "./read-env-value.js";
import { logInfo } from "./logger.js";

///////////////////////////////// NOTE //////////////////////////////////////
// Environment which should be passed to aideas should be prefixed with this;
// Except when those env variables are defined in a separate AIDEAS_ENV_FILE.
/////////////////////////////////////////////////////////////////////////////
const PREFIX = "AIDEAS_";

logInfo(`Working from directory: ${process.cwd()}`);

const AIDEAS_ENV_FILE = process.env.AIDEAS_ENV_FILE;
logInfo(`AIDEAS_ENV_FILE: ${AIDEAS_ENV_FILE}`);

logInfo(`Environment:\n${JSON.stringify(process.env)}`);

function requireEnvValue(name: string, fallback: string): string {
    let value = process.env[`${PREFIX}${name}`];
    if (!value) {
        if (AIDEAS_ENV_FILE) {
            value = readEnvValue(AIDEAS_ENV_FILE, name, fallback);
            logInfo(`Read ${name} = ${value} from: ${AIDEAS_ENV_FILE}`);
        } else {
            value = fallback;
            logInfo(`Fallback to ${name} = ${fallback}`);
        }
    } else {
        logInfo(`Environment value for ${PREFIX}${name} = ${value}`);
    }
    if (!value) {
        throw new Error(`${name} environment variable is required.`);
    }
    return value;
}

export const AIDEAS_PORT = parseInt(requireEnvValue("APP_PORT", "5001"));

export const APP_VERSION = requireEnvValue("APP_VERSION", "0.3.4");
export const AIDEAS_IMAGE_NAME = `poshjosh/aideas:${APP_VERSION}`;
logInfo(`AIDEAS_IMAGE_NAME = ${AIDEAS_IMAGE_NAME}`);

export const AIDEAS_APP_PROFILES = requireEnvValue("APP_PROFILES", "default");

function getContainerRunCommandExtras(): string {
    const parts = [
        "-v", `${os.homedir()}/.aideas:/root/.aideas`,
        "--shm-size=2g",
        "-e", `APP_PROFILES=docker,${AIDEAS_APP_PROFILES}`
    ];
    Object.keys(process.env).filter(key => key.startsWith(PREFIX)).forEach(key => {
        parts.push("-e", `${key}=${process.env[key]}`);
    });
    if (AIDEAS_ENV_FILE) {
        parts.push("--env-file", AIDEAS_ENV_FILE);
    }
    return parts.join(" ");
}

export const AIDEAS_DOCKER_RUN_COMMAND_EXTRAS = getContainerRunCommandExtras();
