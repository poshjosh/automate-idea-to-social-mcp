import * as os from "os";
import { readEnvValue } from "./read-env-value.js";
import { logInfo } from "./logger.js";

export const APP_VERSION = process.env["APP_VERSION"] ?? "0.0.1";
export const APP_PROFILES = process.env["APP_PROFILES"] ?? "default";
export const TASK_CACHE_TTL_SECONDS = parseInt(process.env["TASK_CACHE_TTL_SECONDS"] ?? "86400");

///////////////////////////////// NOTE //////////////////////////////////////
// aideas related environment variables
// Environment which should be passed to aideas should be prefixed with this;
// Except when those env variables are defined in a separate AIDEAS_ENV_FILE.
/////////////////////////////////////////////////////////////////////////////
const PREFIX = "AIDEAS_";

logInfo(`@environment. Working from directory: ${process.cwd()}`);

const AIDEAS_ENV_FILE = process.env.AIDEAS_ENV_FILE;
logInfo(`@environment. AIDEAS_ENV_FILE: ${AIDEAS_ENV_FILE}`);

logInfo(`@environment. \n${JSON.stringify(process.env)}`);

function requireAideasEnvValue(name: string, fallback: string): string {
    let value = process.env[`${PREFIX}${name}`];
    if (!value) {
        if (AIDEAS_ENV_FILE) {
            value = readEnvValue(AIDEAS_ENV_FILE, name, fallback);
            logInfo(`@environment. Read ${name} = ${value} from: ${AIDEAS_ENV_FILE}`);
        } else {
            value = fallback;
            logInfo(`@environment. Fallback to ${name} = ${fallback}`);
        }
    } else {
        logInfo(`@environment. Environment value for ${PREFIX}${name} = ${value}`);
    }
    if (!value) {
        throw new Error(`${name} environment variable is required.`);
    }
    return value;
}

export const AIDEAS_PORT = parseInt(requireAideasEnvValue("APP_PORT", "5001"));

const AIDEAS_APP_VERSION = requireAideasEnvValue("APP_VERSION", "0.3.4");
export const AIDEAS_IMAGE_NAME = `poshjosh/aideas:${AIDEAS_APP_VERSION}`;
logInfo(`@environment. AIDEAS_IMAGE_NAME = ${AIDEAS_IMAGE_NAME}`);

export const AIDEAS_APP_PROFILES = requireAideasEnvValue("APP_PROFILES", "default");

// USER_HOME is only required when running in a docker container.
// From within our docker container, we run the aideas docker container.
// To run the aideas docker container we mount ${USER_HOME}/.aideas to /root/.aideas
// We could use the system's ${HOME} variable from within our container,
// but that would only point to the containers home directory (e.g /root).
const userHome = process.env["USER_HOME"] || os.homedir();

function getContainerRunCommandExtras(): string {
    const parts = [
        "-v", `${userHome}/.aideas:/root/.aideas`,
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
