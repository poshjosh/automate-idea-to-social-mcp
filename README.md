# Automate Idea to Social - MCP Server

## Overview

An MCP (Model Context Protocol) server that provides tools to publish content to various
social media platforms. This server is based on the [automate-idea-to-social](https://github.com/poshjosh/automate-idea-to-social) project
and exposes its functionality through a standardized MCP interface.

## Prerequisites

- **Docker**

## Usage

- In the json configuration below, replace `<MY_HOME_DIRECTORY>` with your home directory (e.g., `/home/thomas` or `C:\Users\jana`).

- Add the json configuration below to your MCP client or IDE. 

```json
{
  "mcpServers": {
    "automate-idea-to-social-mcp": {
      "command": "docker",
      "args": [
        "run", "-u", "0", "-i", "--rm",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-e", "APP_PROFILES=docker",
        "-e", "USER_HOME=<MY_HOME_DIRECTORY>",
        "poshjosh/aideas-mcp:0.0.1"
      ],
      "env": { }
    }
  }
}
```

- Depending on the agents, you may need to provide additional [environment variables]((https://github.com/poshjosh/automate-idea-to-social/blob/main/docs/environment.md)). 
For example for instagram we add the following to the `args` section above:

```json
{
  "mcpServers": {
    "automate-idea-to-social-mcp": {
      "args": [
        "-e", "INSTAGRAM_USER_EMAIL=<MY_INSTAGRAM_EMAIL>",
        "-e", "INSTAGRAM_USER_PASS=<MY_INSTAGRAM_PASSWORD>"
      ]
    }
  }
}
```

See the full list of [environment variables]((https://github.com/poshjosh/automate-idea-to-social/blob/main/docs/environment.md)).

### VS Code

See [Use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

## Supported Social Media (and other) Agents

The server provides automation capabilities for:

- **YouTube**: Video upload, metadata, playlists, subtitles
- **Twitter**: Tweet posting with media support
- **Facebook**: Post creation and publishing
- **Instagram**: Image and story posting
- **TikTok**: Video upload and publishing
- **Reddit**: Subreddit post submission
- **Blog**: Content publishing to blog platforms
- **Translation**: Multi-language content support

## Key Features Implemented

### 1. Agent Management
- `list_agents`: Lists all available automation agents with optional filtering
- `get_agent_config`: Retrieves detailed configuration for specific agents
- Supports various agents: YouTube, Twitter, Facebook, Instagram, TikTok, Reddit, Blog, etc.

### 2. Task Management
- `create_automation_task`: Creates and executes automation tasks
- `get_task_status`: Monitors task progress and results
- `list_tasks`: Lists all tasks with status filtering
- Asynchronous task execution with proper error handling

### 3. System Validation
- `validate_setup`: Comprehensive system health checks
- Validates Python environment, project structure, and dependencies
- Provides actionable feedback for configuration issues

## Technical Implementation

### Architecture
- **Language**: TypeScript with Node.js runtime
- **Protocol**: Model Context Protocol (MCP) using official SDK
- **Transport**: Standard I/O (stdio) for communication
- **Integration**: Runs docker to execute automation tasks

### Dependencies
- `@modelcontextprotocol/sdk`: MCP server framework
- `zod`: Schema validation and type safety
- `js-yaml`: YAML configuration parsing
- `axios`: HTTP client for potential API integrations
- `node-html-parser`: HTML parsing capabilities

## Related pages

- [Available tools](./AVAILABLE_TOOLS.md)
- [Usage examples](./USAGE_EXAMPLES.md)

## Related Projects

- [automate-idea-to-social](https://github.com/poshjosh/automate-idea-to-social) - The underlying automation system
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript SDK for MCP servers
