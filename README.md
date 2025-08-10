# Automate Idea to Social MCP Server

An MCP (Model Context Protocol) server that provides tools for automating content generation and publishing to social media platforms. This server is based on the [automate-idea-to-social](https://github.com/poshjosh/automate-idea-to-social) project and exposes its functionality through a standardized MCP interface.

## Features

- **Agent Management**: List and configure automation agents for different platforms
- **Task Creation**: Create and manage automation tasks for content publishing
- **Status Monitoring**: Track the progress of automation tasks
- **Setup Validation**: Validate that the underlying automation system is properly configured

## Supported Platforms

The server supports automation for the following social media platforms:

- **YouTube**: Video upload, title/description setting, playlist management
- **Twitter**: Tweet posting with text and media
- **Facebook**: Post creation and publishing
- **Instagram**: Image and story posting
- **TikTok**: Video upload and publishing
- **Reddit**: Post submission to subreddits
- **Blog**: Content publishing to blog platforms

## Prerequisites

1. **Python Environment**: Python 3.x with the automate-idea-to-social project installed
2. **Project Setup**: The automate-idea-to-social project must be properly configured
3. **Platform Credentials**: API keys and authentication tokens for target platforms

## Installation

1. **Clone or download this MCP server**:
   ```bash
   cd /Users/chinomso/dev_ai
   # Server files should be in automate-idea-to-social-mcp/
   ```

2. **Install dependencies**:
   ```bash
   cd automate-idea-to-social-mcp
   npm install
   ```

3. **Build the server**:
   ```bash
   npm run build
   ```

4. **Set up the automate-idea-to-social project**:
   - Follow the installation instructions in the [original project](https://github.com/poshjosh/automate-idea-to-social)
   - Ensure all required environment variables are set
   - Test that the project works independently

## Configuration

### Environment Variables

The MCP server requires the following environment variable:

- `AIDEAS_PROJECT_DIR`: Full path to the automate-idea-to-social project directory

### MCP Settings Configuration

Add the server to your MCP settings file (`~/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`):

```json
{
  "mcpServers": {
    "automate-idea-to-social": {
      "command": "node",
      "args": ["/Users/chinomso/dev_ai/automate-idea-to-social-mcp/build/index.js"],
      "env": {
        "AIDEAS_PROJECT_DIR": "/Users/chinomso/dev_ai/automate-idea-to-social"
      }
    }
  }
}
```

## Available Tools

### 1. `list_agents`
Lists all available automation agents.

**Parameters:**
- `filter_by_tag` (optional): Filter agents by tag (e.g., 'post', 'custom', 'test')

**Example:**
```
List all agents that can post content
```

### 2. `get_agent_config`
Retrieves the configuration for a specific agent.

**Parameters:**
- `agent_name`: Name of the agent to get configuration for

**Example:**
```
Get the configuration for the twitter agent
```

### 3. `create_automation_task`
Creates and starts a new automation task.

**Parameters:**
- `agents`: Array of agent names to run
- `text_content`: The text content/idea to process
- `text_title` (optional): Title for the content
- `language_codes` (default: "en"): Language codes (e.g., 'en', 'en,es,fr')
- `image_file_landscape` (optional): Path to landscape image file
- `image_file_square` (optional): Path to square image file
- `share_cover_image` (default: false): Whether to share cover image

**Example:**
```
Create a task to post "How to learn Python programming effectively" to Twitter and YouTube
```

### 4. `get_task_status`
Checks the status of a specific task.

**Parameters:**
- `task_id`: ID of the task to check

**Example:**
```
Check the status of task task_1704123456789_abc123def
```

### 5. `list_tasks`
Lists all tasks with optional filtering.

**Parameters:**
- `status_filter` (optional): Filter tasks by status ('pending', 'running', 'completed', 'failed')

**Example:**
```
List all completed tasks
```

### 6. `validate_setup`
Validates that the automation system is properly configured.

**Example:**
```
Validate the automation setup
```

### 7. `get_logs`
Get logs since the last call.

**Parameters:**
None

**Example:**
```
Get the latest logs
```

## Usage Examples

### Basic Content Publishing

1. **Create an automation task**:
   ```
   Create a task to post "5 productivity tips that changed my life: 1) Time blocking 2) Pomodoro technique 3) Digital minimalism 4) Morning routines 5) Single-tasking" to Twitter
   ```

2. **Monitor task progress**:
   ```
   Check the status of the task
   ```

### Multi-Platform Publishing

```
Create a task to post "The future of AI in education" to YouTube, Twitter, and blog agents with title "AI Revolution in Learning"
```

### Content Workflow

1. **Validate setup**:
   ```
   Validate the automation setup
   ```

2. **List available agents**:
   ```
   List all agents that can post content
   ```

3. **Create and execute task**:
   ```
   Create a task to post one of the generated ideas to blog and social media
   ```

4. **Monitor progress**:
   ```
   List all running tasks
   ```

## Error Handling

The server includes comprehensive error handling for:

- Missing or invalid project paths
- Agent configuration errors
- Task execution failures
- Platform authentication issues
- File system access problems

All errors are returned with descriptive messages to help with troubleshooting.

## Security Considerations

- **Environment Variables**: Store sensitive credentials in environment variables, not in code
- **File Paths**: Ensure proper file path validation to prevent directory traversal
- **Task Isolation**: Each task runs in isolation to prevent interference
- **Credential Management**: Follow platform-specific security guidelines for API keys

## Troubleshooting

### Common Issues

1. **"AIDEAS_PROJECT_DIR environment variable is required"**
   - Ensure the environment variable is set in the MCP configuration
   - Verify the path points to the correct project directory

2. **"Agent not found" errors**
   - Check that agent configuration files exist in the project
   - Verify agent names are spelled correctly

3. **Task execution failures**
   - Ensure Python environment is properly configured
   - Check that all required dependencies are installed
   - Verify platform credentials are valid

4. **Permission errors**
   - Ensure the MCP server has read/write access to the project directory
   - Check file permissions on configuration files

### Debugging

Enable debug logging by setting the log level in the original project's configuration. Task execution details are captured and returned in task status responses.

## Development

### Project Structure

```
automate-idea-to-social-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This documentation
```

### Building from Source

```bash
npm install
npm run build
```

### Development Mode

```bash
npm run dev  # Watch mode for development
```

## Contributing

This MCP server is designed to work with the automate-idea-to-social project. For issues related to:

- **MCP Server**: Report issues with the server implementation
- **Automation Logic**: Report issues to the original automate-idea-to-social project
- **Platform Integration**: Check platform-specific documentation and APIs

## License

MIT License - see the original automate-idea-to-social project for licensing details.

## Related Projects

- [automate-idea-to-social](https://github.com/poshjosh/automate-idea-to-social) - The underlying automation system
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - TypeScript SDK for MCP servers