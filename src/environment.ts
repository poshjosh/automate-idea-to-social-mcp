import { readEnvValue } from "./read-env-value.js";
import { logInfo } from "./logger.js";

// Environment variables for the automate-idea-to-social project
export const _ef = process.env.AIDEAS_ENV_FILE;
logInfo(`AIDEAS_ENV_FILE: "${_ef}"`);
if (!_ef) {
    throw new Error('AIDEAS_ENV_FILE environment variable is required');
}
export const AIDEAS_ENV_FILE = _ef;

function requireValueFromEnvFile(name: string): string {
    const value = readEnvValue(AIDEAS_ENV_FILE, name)
    logInfo(`${name} = ${value}`);
    if (!value) {
        throw new Error(`${name} environment variable is required but was not specified in ${AIDEAS_ENV_FILE}`);
    }
    return value;
}

export const AIDEAS_PORT = parseInt(readEnvValue(AIDEAS_ENV_FILE, "APP_PORT", 5001));

export const APP_VERSION = readEnvValue(AIDEAS_ENV_FILE, "APP_VERSION", "0.3.2");
export const AIDEAS_IMAGE_NAME = `poshjosh/aideas:${APP_VERSION}`;
logInfo(`AIDEAS_IMAGE_NAME = ${AIDEAS_IMAGE_NAME}`);

const BLOG_APP_DIR = requireValueFromEnvFile("BLOG_APP_DIR");
const BLOG_APP_VERSION = readEnvValue(AIDEAS_ENV_FILE,"BLOG_APP_VERSION", "0.1.6");
export const AIDEAS_DOCKER_VOLUME = `${BLOG_APP_DIR}/app/automate-jamstack-${BLOG_APP_VERSION}/app:/blog-app`;
logInfo(`AIDEAS_DOCKER_VOLUME = ${AIDEAS_DOCKER_VOLUME}`);

export const AIDEAS_CONFIG_DIR = requireValueFromEnvFile("CONFIG_DIR");

export const AIDEAS_OUTPUT_DIR = requireValueFromEnvFile("OUTPUT_DIR");

export const AIDEAS_CONTENT_DIR = readEnvValue(AIDEAS_ENV_FILE,"CONTENT_DIR", AIDEAS_OUTPUT_DIR);
logInfo(`AIDEAS_CONTENT_DIR = ${AIDEAS_CONTENT_DIR}`);

export const AIDEAS_APP_PROFILES = readEnvValue(AIDEAS_ENV_FILE,"APP_PROFILES", "");
logInfo(`AIDEAS_APP_PROFILES = ${AIDEAS_APP_PROFILES}`);

function getContainerRunCommandExtras(): string {
    // We don't want directories like OUTPUT_DIR, which our container
    // accesses to change (at least within the container), so we use a
    // fixed value for such directories. The value is fixed even though
    // the host directory they are bound to changes.
    // Define container directories
    const container_output_dir = "/root/.aideas/output";
    const container_content_dir = "/root/.aideas/content";
    // const container_chrome_dir = "/root/.config/google-chrome";

    let command: string =
`-v ${AIDEAS_OUTPUT_DIR}:${container_output_dir} \
-v ${AIDEAS_CONTENT_DIR}:${container_content_dir} \
-e APP_PROFILES=docker,${AIDEAS_APP_PROFILES} \
-e OUTPUT_DIR=${container_output_dir} \
-e CONTENT_DIR=${container_content_dir} \
--env-file ${AIDEAS_ENV_FILE}`;

    if (AIDEAS_DOCKER_VOLUME) {
        command = command.replace("-e APP_PROFILES", `-v ${AIDEAS_DOCKER_VOLUME} -e APP_PROFILES`)
    }

    return command;
}

export const AIDEAS_DOCKER_RUN_COMMAND_EXTRAS = getContainerRunCommandExtras();
