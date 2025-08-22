# Automate Idea to Social - MCP Server

## Overview

An MCP (Model Context Protocol) server that provides tools to publish content to various
social media platforms. This server is based on the [automate-idea-to-social](https://github.com/poshjosh/automate-idea-to-social) project
and exposes its functionality through a standardized MCP interface.

## Prerequisites

1. **Nodejs**: to run this mcp-server
2. **Docker**: to run the [automation server](https://github.com/poshjosh/automate-idea-to-social) 

## Usage

1. [Click here to download the installer script](https://raw.githubusercontent.com/poshjosh/automate-idea-to-social-mcp/refs/heads/main/installer.js).

2. Open a terminal/command prompt/shell and run the following command:

```bash
node installer.js
```

3. Add the MCP server configuration to your MCP client or IDE.

```json
{
  "mcpServers": {
    "automate-idea-to-social-mcp": {
      "command": "node",
      "args": ["${HOME}/.aideas-mcp/automate-idea-to-social-mcp-main/build/index.js"],
      "env": {
        "AIDEAS_ENV_FILE": "${PATH_TO_DOT_ENV_FILE}"
      }
    }
  }
}
```

Provide values for:

- `${HOME}` - the home directory of the user running the MCP server.
- `${PATH_TO_DOT_ENV_FILE}`. See the [list of environment variables](https://github.com/poshjosh/automate-idea-to-social/blob/main/docs/environment.md).

### VS Code

To add an MCP server to your user profile, you can use the `--add-mcp` command line option, and 
provide the JSON server configuration in the format shown below:

```bash
code --add-mcp "{\"name\":\"automate-idea-to-social-mcp\",\"command\": \"node\",\"args\": [\"${HOME}/.aideas-mcp/automate-idea-to-social-mcp-main/build/index.js\"],\"env\": {\"AIDEAS_ENV_FILE\": \"/${PATH_TO_DOT_ENV_FILE}\"}}"
```

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
