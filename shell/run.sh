#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/Users/chinomso/dev_ai/automate-idea-to-social-mcp"

export AIDEAS_ENV_FILE="${PROJECT_DIR}/git-ignore/mcp-example-env/run.env"

node "${PROJECT_DIR}/build/index.js"