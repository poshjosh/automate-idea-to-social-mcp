#!/usr/bin/env bash

set -euo pipefail

cd .. || exit 1

set -a
source .env
set +a

node build/index.js