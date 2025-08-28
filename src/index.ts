#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  APP_PROFILES, APP_VERSION, AIDEAS_IMAGE_NAME, AIDEAS_PORT, AIDEAS_DOCKER_RUN_COMMAND_EXTRAS
} from "./environment.js";
import { clearLogs, getLogs, logError, logInfo, logThrown } from "./logger.js";
import {
  AgentConfig,
  Task,
  TaskConfig,
  TaskStatus,
  TaskStatuses,
} from "./api-type-definitions.js";
import {
  DockerContainerResult,
  DockerStatus,
  createAndRunContainer,
  checkDockerStatus, stopAndRemoveContainer
} from "./docker-utils.js";
import { ApiClient, createApiClient } from "./api-client.js";
import { PersistentStore } from "./persistent-store.js";

const SERVER_NAME: string = "automate-idea-to-social-mcp";
const SERVER_VERSION: string = APP_VERSION

const taskConfigs: PersistentStore = new PersistentStore({
    dir: 'storage.task-configs',
    ttl: 30 * 60 * 1000 // milliseconds, time to live for each key
});

// Create an MCP server
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION
});

interface AppStatus {
  error: boolean;
  message: string;
}

async function setupDownstreamServer(timeout: number = 30): Promise<AppStatus> {
  const dockerStatus: DockerStatus = await checkDockerStatus();
  let isError: boolean;
  let message;
  if (dockerStatus.error) {
    isError = true;
    message = dockerStatus.message;
  } else {
    const apiClient: ApiClient = await getOrCreateApiClient();
    isError = !(await apiClient.isUp(timeout));
    message = isError ? "Server is not available" : "Server is up and running";
  }
  return {
    error: isError,
    message: message
  };
}

async function getOrCreateApiClient(): Promise<ApiClient> {
  const result: DockerContainerResult | null = await createAndRunContainer(
      AIDEAS_IMAGE_NAME, AIDEAS_PORT, AIDEAS_DOCKER_RUN_COMMAND_EXTRAS);
  if (!result) {
    throw new Error(`Failed to run container for image: ${AIDEAS_IMAGE_NAME} on port: ${AIDEAS_PORT}`);
  }

  const host = APP_PROFILES.toLowerCase().includes("docker") ? result.ip : "localhost";

  const apiEndpoint = `http://${host}:${result.port}`;

  return createApiClient(apiEndpoint);
}

async function requireApiClientAndServerReady(timeoutSeconds: number = 30): Promise<ApiClient> {
  const apiClient: ApiClient = await getOrCreateApiClient();
  // TODO No need to call this every time, just once at startup and then maybe periodically?
  if (await apiClient.isUp(timeoutSeconds)) {
    return apiClient;
  }
  throw new Error(`Server is not up, even after waiting ${timeoutSeconds} seconds`);
}

// Helper functions
async function getAvailableAgents(tag: string | null = null): Promise<string[]> {
  try {
    logInfo(`@index. Getting available agents for tag: ${tag}`);

    const apiClient: ApiClient = await requireApiClientAndServerReady();

    return await apiClient.getAgentNames(tag)

  } catch (error) {
    logThrown(`@index. Error fetching agents`, error);
    return [];
  }
}

async function getAgentConfig(agentName: string): Promise<AgentConfig | null> {
  try {
    logInfo(`@index. Getting agent config for: ${agentName}`);

    const apiClient: ApiClient = await requireApiClientAndServerReady();

    return await apiClient.getAgentConfig(agentName);

  } catch (error) {
    logThrown(`@index. Error reading config for agent: ${agentName}`, error);
    return null;
  }
}

async function getTask(taskId: string): Promise<Task | null> {
  try {
    logInfo(`@index. Getting task by ID: ${taskId}`);

    const apiClient: ApiClient = await requireApiClientAndServerReady();

    return await apiClient.getTask(taskId);

  } catch (error) {
    logThrown(`@index. Error getting task by ID: ${taskId}`, error);
    return null;
  }
}

async function runAutomationTask(config: TaskConfig): Promise<string | null> {
  try {
    logInfo(`@index. Preparing to run task with config: ${JSON.stringify(config)}`);

    if (!config) {
      logError(`@index. Task config is required.`);
      return null;
    }

    const apiClient: ApiClient = await requireApiClientAndServerReady();

    // Create and run the automation task
    const taskId: string = await apiClient.createTask(config);

    logInfo(`@index. Task ID: ${taskId} successfully created`);

    return taskId;

  } catch (error) {
    logThrown(`@index. Error running creating task with config: ${JSON.stringify(config)}`, error);
    return null;
  }
}

function withLogs(message: string | null = null, error?: unknown): string {
  error = error ? (error instanceof Error ? error.message : String(error)) : '';
  const logsPrefix = '- - - - - - - - - - logs - - - - - - - - - -';
  const logsSuffix = '- - - - - - - - - - - - - - - - - - - - - - -';
  return `${message ?? ''} ${error}.\n${logsPrefix}\n${getLogs().join('\n')}\n${logsSuffix}`;
}

// Tool: List available agents
server.tool(
  "list_agents",
  {
    filter_by_tag: z.string().trim().optional().describe("Filter agents by tag (e.g., 'post', 'generate-video', 'test')"),
  },
  async ({ filter_by_tag }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`@index. Listing agents with filter: ${filter_by_tag ?? 'none'}`);

      const agents = await getAvailableAgents(filter_by_tag);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              agents: agents,
              total: agents.length,
              filter_applied: filter_by_tag ?? null
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs('Error listing agents: ', error),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get agent configuration
server.tool(
  "get_agent_config",
  {
    agent_name: z.string().trim().describe("Name of the agent to get configuration for"),
  },
  async ({ agent_name }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`@index. Getting config for agent: ${agent_name}`);

      const agentConfig = await getAgentConfig(agent_name)
      if (!agentConfig) {
        return {
          content: [
            {
              type: "text",
              text: withLogs(`Agent \'${agent_name}\' not found.`),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(agentConfig, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs(`Error getting config for agent: ${agent_name}`, error)
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Create automation task
server.tool(
  "create_automation_task",
  {
    agents: z.array(z.string().trim()).describe("List of agent names to run"),
    text_content: z.string().optional().describe("The text content/idea to process"),
    text_title: z.string().optional().describe("Title for the content"),
    language_codes: z.string().trim().optional().describe("Language codes (e.g., 'en', 'en,es,fr')"),
    image_file_landscape: z.string().trim().optional().describe("Path to landscape image file"),
    image_file_square: z.string().trim().optional().describe("Path to square image file"),
    share_cover_image: z.boolean().default(true).describe("Whether to share cover image"),
  },
  async ({ agents, text_content, text_title, language_codes, image_file_landscape, image_file_square, share_cover_image }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`@index. Creating automation task for agents: ${agents}`);

      // Validate agents exist
      const availableAgents = await getAvailableAgents();
      if (availableAgents.length == 0) {
        return {
          content: [
            {
              type: "text",
              text: withLogs(`No agents available. Please ensure agents are configured.`),
            },
          ],
          isError: true,
        };
      }
      const invalidAgents = agents.filter(agent => !availableAgents.includes(agent));
      if (invalidAgents.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: withLogs(`Invalid agents: ${invalidAgents.join(', ')}. Available agents: ${availableAgents.join(', ')}`),
            },
          ],
          isError: true,
        };
      }

      // Create task configuration
      // Mandatory fields
      const taskConfig: TaskConfig = {
        agents,
        'language-codes': language_codes,
        'text-content': text_content,
        'share-cover-image': share_cover_image ?? true,
      };

      // Optional fields
      if (text_title) taskConfig['text-title'] = text_title;
      if (image_file_landscape) taskConfig['image-file-landscape'] = image_file_landscape;
      if (image_file_square) taskConfig['image-file-square'] = image_file_square;

      // Start the task asynchronously
      // TODO: Should we use await here?
      const taskId = await runAutomationTask(taskConfig);
      if (!taskId) {
        return {
          content: [
            {
              type: "text",
              text: withLogs(`Error creating automation task. No task ID was returned.`),
            },
          ],
          isError: true,
        };
      }
      
      taskConfigs.set(taskId, taskConfig);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              task_id: taskId,
              status: TaskStatuses.PENDING,
              agents,
              message: 'Task created and started'
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs(`Error creating automation task: `, error),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get task status
server.tool(
  "get_task_status",
  {
    task_id: z.string().trim().describe("ID of the task to check"),
  },
  async ({ task_id }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`@index. Getting status for task ID: ${task_id}`);

      const taskConfig = taskConfigs.get(task_id);
      if (!taskConfig) {
        return {
          content: [
            {
              type: "text",
              text: withLogs(`Task '${task_id}' not found`),
            },
          ],
          isError: true,
        };
      }

      const task: Task | null = await getTask(task_id);
      if (!task) {
        return {
          content: [
            {
              type: "text",
              text: withLogs(`Task not found, ID '${task_id}': Task not found`),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs(`Error getting task status: `, error),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: List all tasks
server.tool(
  "list_tasks",
  {
    filter_by_status: z.string().trim().optional().refine((state): state is TaskStatus => {
        return !state || Object.values(TaskStatuses).includes(state as TaskStatus);
    }),
  },
  async ({ filter_by_status }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`@index. Listing tasks with status filter: ${filter_by_status ?? 'none'}`);

      const apiClient: ApiClient = await requireApiClientAndServerReady();

      let taskList: Task[] = await apiClient.getTasks();

      if (filter_by_status) {
        taskList = taskList.filter(task => task.status === filter_by_status);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tasks: taskList,
              total: taskList.length,
              filter_applied: filter_by_status ?? null
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs(`Error listing tasks with status: ${filter_by_status}`, error),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Validate automation setup
server.tool(
  "validate_setup",
  {},
  async () => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`@index. Validating automation setup`);

      const appStatus: DockerStatus = await checkDockerStatus();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ setup: { valid: !appStatus.error, reason: `${appStatus.message}` }}, null, 2),
          },
        ],
        isError: appStatus.error,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs(`Error validating setup: `, error),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: List all tasks
server.tool(
    "get_logs",
    { },
    async ({ }) => {
      try {
        logInfo("@index. Fetching logs");

        const logs = getLogs();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                logs: logs,
                total: logs.length,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching logs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
);

process.on("SIGTERM", async () => {
    logInfo(`@index. Received SIGTERM, shutting down...`);
    try {
      await stopAndRemoveContainer(AIDEAS_IMAGE_NAME);
    } finally {
      process.exit(0);
    }
});

process.on("SIGINT", async () => {
  logInfo(`@index. Received SIGINT, shutting down...`);
  try {
    await stopAndRemoveContainer(AIDEAS_IMAGE_NAME);
  } finally {
    process.exit(0);
  }
});

process.on("exit", async code => {
  logInfo(`@index. App exited with code: ${code}, shutting down...`);
  try {
    await stopAndRemoveContainer(AIDEAS_IMAGE_NAME);
  } finally {
    process.exit(code);
  }
});

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
logInfo(`@index. MCP server: ${SERVER_NAME} v${SERVER_VERSION} is running on stdio.\nPress Ctrl+C to exit`);
// const appStatus: AppStatus = await setupDownstreamServer(30);
// if (appStatus.error) {
//   logError(`@index. Error setting up downstream server. ${appStatus.message}`);
//   process.exit(1);
// } else {
//   logInfo("@index. !! READY !! (Press Ctrl+C to exit)");
// }
