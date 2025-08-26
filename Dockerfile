ARG APP_DIR=/usr/src/app

# Use Node.js 22 slim image as base
FROM node:22-slim AS builder

ARG DOCKER_VERSION='28.3.3'

ARG APP_DIR

# Set working directory in container
WORKDIR "${APP_DIR}"

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy configuration files
COPY tsconfig.json ./
COPY jest.config.cjs ./

# Copy source code
COPY src/ ./src/

RUN npm run build

# This stage = run time environment only
FROM node:22-slim

ARG APP_DIR

COPY --from=builder "${APP_DIR}/node_modules" "${APP_DIR}/node_modules"
COPY --from=builder "${APP_DIR}/build" "${APP_DIR}/build"

# See: https://docs.docker.com/engine/install/debian/
# Update package lists and install required packages
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Add Docker's official GPG key
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
RUN echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker CLI and Docker Compose
RUN apt-get update && apt-get install -y \
    docker-ce-cli \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR "${APP_DIR}"

# Create non-root user for security
#RUN groupadd -r aideas-mcp \
#    && useradd -r -g aideas-mcp aideas-mcp \
#    && chown -R aideas-mcp:aideas-mcp "${APP_DIR}"
#
## Switch to non-root user
#USER aideas-mcp

CMD ["node", "build/index.js"]