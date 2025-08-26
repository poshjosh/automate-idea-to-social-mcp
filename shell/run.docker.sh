#!/usr/bin/env bash

set -euo pipefail

#@echo off

ENV_FILE=${ENV_FILE:-".env"}

cd .. || exit 1

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

APP_VERSION=${APP_VERSION:-"latest"}
BUILD=${BUILD:-true}
DIR=${DIR:-.}
IMAGE=${IMAGE:-"poshjosh/aideas-mcp:${APP_VERSION}"}
SKIP_RUN=${SKIP_RUN:-false}
VERBOSE=${VERBOSE:-false}

[ "${VERBOSE}" = "true" ] || [ "$VERBOSE" = true ] && set -o xtrace

function text_has_content() {
    if [ ! -z "$1" -a "$1" != "" ]; then
        echo true
    else
        echo false
    fi
}

if [ "$(text_has_content "$ENV_FILE")" = false ]; then
    echo "ERROR ENV_FILE is required" && exit 1
fi

if [ "$(text_has_content "$IMAGE")" = false ]; then
    echo "ERROR IMAGE is required" && exit 1
fi

cd "${DIR}"

printf "\nWorking directory: %s\n" "${DIR}"

docker system prune -f

# Build docker image if build=true, or the image doesn't exist

docker images | grep "${IMAGE}" && res="y" || res="n"

if [ "$BUILD" = true ] || [ "$BUILD" = "true" ] || [ "${res}" = "n" ]; then
    printf "\nBuilding image: %s\n" "${IMAGE}"
    docker build -t "${IMAGE}" --progress=plain "${DIR}"
fi

#           input=IMAGE: poshjosh/abc:latest
# output=CONTAINER_NAME: poshjosh-abc-latest
CONTAINER_NAME=$(echo "$IMAGE" | tr / - | tr : -)
printf "\nContainer name: %s\n" "${CONTAINER_NAME}"

# Stop docker container if it is running
docker ps -a | grep "$CONTAINER_NAME" && res="y" || res="n"
if [ "${res}" == "y" ]; then
    printf "\nStopping container: %s\n" "$CONTAINER_NAME"
    # runs the command for 30s, and if it is not terminated, it will kill it after 10s.
    timeout --kill-after=10 30 docker container stop "$CONTAINER_NAME"
fi

printf "\nUsing environment file: %s\n" "${ENV_FILE}"

if [ "${SKIP_RUN}" = "true" ] || [ "$SKIP_RUN" = true ]; then
    printf "\nSkipping app run, since SKIP_RUN is true\n"
else
    printf "\nRunning image: %s\n" "${IMAGE}"
    docker run -u 0 -it --rm --name "$CONTAINER_NAME" \
        -v "/var/run/docker.sock:/var/run/docker.sock" \
        -v "${HOME}/.aideas:${HOME}/.aideas" \
        --env-file "${ENV_FILE}" \
        -e "APP_PROFILES=docker,${APP_PROFILES:-default}" \
        "${IMAGE}"
fi

printf "\nPruning docker system\n"
docker system prune -f

printf "\nSUCCESS\n"