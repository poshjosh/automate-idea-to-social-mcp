# Direct Usage

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
