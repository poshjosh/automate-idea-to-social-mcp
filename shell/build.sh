#!/usr/bin/env bash

set -euo pipefail

cd ..

npm install

npm run clean && npm run build