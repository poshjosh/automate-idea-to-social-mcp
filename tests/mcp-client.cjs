const { spawn } = require('child_process');
const { EventEmitter } = require('events');

class McpClient extends EventEmitter {
  constructor(timeoutMilliseconds = 30000) {
    super();
    this.process = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.connected = false;
    this.timeoutMilliseconds = timeoutMilliseconds;
  }

  /**
   * Connect to an MCP server
   * @param {Object} serverConfig - Server configuration
   * @param {string} serverConfig.command - Command to start the server
   * @param {string[]} serverConfig.args - Arguments for the server command
   * @param {Object} serverConfig.env - Environment variables
   */
  async connect(serverConfig) {
    return new Promise((resolve, reject) => {
      try {
        // Spawn the MCP server process
        this.process = spawn(serverConfig.command, serverConfig.args || [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...serverConfig?.env }
        });

        let buffer = '';

        // Handle stdout data (JSON-RPC messages)
        this.process.stdout.on('data', (data) => {
          buffer += data.toString();
          
          // Process complete JSON-RPC messages
          let lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              // May be json, or just plain text
              try {
                const message = JSON.parse(line.trim());
                this.handleMessage(message);
              } catch (error) {
                this.handleMessage(line.trim());
              }
            }
          }
        });

        // Handle stderr
        this.process.stderr.on('data', (data) => {
          console.error('Server stderr:', data.toString());
        });

        // Handle process exit
        this.process.on('exit', (code) => {
          console.log(`MCP server exited with code ${code}`);
          this.connected = false;
          this.emit('disconnect');
        });

        // Handle process error
        this.process.on('error', (error) => {
          console.error('Process error:', error);
          reject(error);
        });

        // Initialize the connection
        this.initialize().then(resolve).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize the MCP connection
   */
  async initialize() {
    const initResponse = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: false
        },
        sampling: {}
      },
      clientInfo: {
        name: 'simple-mcp-client',
        version: '1.0.0'
      }
    });

    // Send initialized notification
    await this.sendNotification('initialized', {});
    
    this.connected = true;
    console.log('MCP client connected and initialized');
    return initResponse;
  }

  /**
   * Handle incoming messages from the server
   */
  handleMessage(message) {
    if (message.id && this.pendingRequests.has(message.id)) {
      // This is a response to a request
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(`MCP Error: ${message.error.message}`));
      } else {
        resolve(message.result);
      }
    } else if (message.method) {
      // This is a notification or request from server
      console.log('Received from server:', message);
    }
  }

  /**
   * Send a JSON-RPC request to the server
   */
  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, this.timeoutMilliseconds);

      this.sendMessage(message);
    });
  }

  /**
   * Send a JSON-RPC notification to the server
   */
  async sendNotification(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };
    this.sendMessage(message);
  }

  /**
   * Send a message to the server
   */
  sendMessage(message) {
    if (!this.process || !this.process.stdin.writable) {
      throw new Error('MCP server process not available');
    }

    const messageStr = JSON.stringify(message) + '\n';
    this.process.stdin.write(messageStr);
  }

  /**
   * List available tools from the server
   */
  async listTools() {
    return await this.sendRequest('tools/list');
  }

  /**
   * Call a tool on the server
   * @param {string} toolName - Name of the tool to call
   * @param {Object} args - Arguments to pass to the tool
   */
  async callTool(toolName, args = {}) {
    return await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });
  }

  /**
   * List available resources from the server
   */
  async listResources() {
    return await this.sendRequest('resources/list');
  }

  /**
   * Read a resource from the server
   * @param {string} uri - URI of the resource to read
   */
  async readResource(uri) {
    return await this.sendRequest('resources/read', {
      uri
    });
  }

  /**
   * List available prompts from the server
   */
  async listPrompts() {
    return await this.sendRequest('prompts/list');
  }

  /**
   * Get a prompt from the server
   * @param {string} name - Name of the prompt
   * @param {Object} args - Arguments for the prompt
   */
  async getPrompt(name, args = {}) {
    return await this.sendRequest('prompts/get', {
      name,
      arguments: args
    });
  }

  /**
   * Disconnect from the MCP server
   */
  disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    this.pendingRequests.clear();
  }

  /**
   * Check if the client is connected
   */
  isConnected() {
    return this.connected;
  }
}

// Export the class for use in other modules
module.exports = { MCPClient: McpClient };
