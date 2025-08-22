#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "js-yaml";
import {
  AIDEAS_IMAGE_NAME, AIDEAS_PORT, AIDEAS_CONFIG_DIR, AIDEAS_DOCKER_RUN_COMMAND_EXTRAS
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
import { extractFieldValueFromJsonFile } from "./utils.js";

const SERVER_NAME: string = "automate-idea-to-social-mcp";
const SERVER_VERSION: string = extractFieldValueFromJsonFile("../package.json", "version");

// In-memory task storage (in production, this could be a database)
const taskConfigs: Map<string, TaskConfig> = new Map(); // TODO Bleed this from time to time?

// Create an MCP server
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION
});

interface AppStatus {
  error: boolean;
  message: string;
}

async function setupApp(timeout: number = 30): Promise<AppStatus> {
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

  const apiEndpoint = `http://localhost:${result.port}`;

  return createApiClient(apiEndpoint);
}

// Helper functions
async function getAvailableAgents(tag: string | null = null): Promise<string[]> {
  try {
    logInfo(`Getting available agents for tag: ${tag}`);

    const apiClient: ApiClient = await getOrCreateApiClient();

    return await apiClient.getAgentNames(tag)

  } catch (error) {
    logThrown(`Error reading agent configs`, error);
    return [];
  }
}

async function getAgentConfig(agentName: string): Promise<AgentConfig | null> {
  try {
    logInfo(`Getting agent config for: ${agentName}`);

    const apiClient: ApiClient = await getOrCreateApiClient();

    return await apiClient.getAgentConfig(agentName);

  } catch (error) {
    logThrown(`Error reading config for agent: ${agentName}`, error);
    return null;
  }
}

async function getTask(taskId: string): Promise<Task | null> {
  try {
    logInfo(`Getting task by ID: ${taskId}`);

    const apiClient: ApiClient = await getOrCreateApiClient();

    return await apiClient.getTask(taskId);

  } catch (error) {
    taskConfigs.delete(taskId);
    logThrown(`Error getting task by ID: ${taskId}`, error);
    return null;
  }
}

async function runAutomationTask(config: TaskConfig): Promise<string | null> {
  let tempRunConfigPath: string | null = null;
  try {
    logInfo(`Preparing to run task with config: ${JSON.stringify(config)}`);

    if (!config) {
      logError(`Task config is required.`);
      return null;
    }

    // Create a temporary config file for this task
    tempRunConfigPath = path.join(AIDEAS_CONFIG_DIR, `run.config.yaml`);
    const configYaml = yaml.dump(config);
    await fs.writeFile(tempRunConfigPath, configYaml);
    logInfo(`Temporary run config created at: ${tempRunConfigPath}`);

    const apiClient: ApiClient = await getOrCreateApiClient();

    // Create and run the automation task
    const taskId: string = await apiClient.createTask(config);

    logInfo(`Task ID: ${taskId} successfully created`);

    return taskId;

  } catch (error) {
    logThrown(`Error running creating task with config: ${JSON.stringify(config)}`, error);
    return null;
  } finally {
    if (tempRunConfigPath) {
      // Clean up temp config
      await fs.unlink(tempRunConfigPath).catch(() => {
        logError(`Failed to delete temporary run config at: ${tempRunConfigPath}`);
      });
    }
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
    filter_by_tag: z.string().optional().describe("Filter agents by tag (e.g., 'post', 'generate-video', 'test')"),
  },
  async ({ filter_by_tag }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`Listing agents with filter: ${filter_by_tag ?? 'none'}`);

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
    agent_name: z.string().describe("Name of the agent to get configuration for"),
  },
  async ({ agent_name }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`Getting config for agent: ${agent_name}`);

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
    agents: z.array(z.string()).describe("List of agent names to run"),
    text_content: z.string().describe("The text content/idea to process"),
    text_title: z.string().optional().describe("Title for the content"),
    language_codes: z.string().default("en").describe("Language codes (e.g., 'en', 'en,es,fr')"),
    image_file_landscape: z.string().optional().describe("Path to landscape image file"),
    image_file_square: z.string().optional().describe("Path to square image file"),
    share_cover_image: z.boolean().default(false).describe("Whether to share cover image"),
  },
  async ({ agents, text_content, text_title, language_codes, image_file_landscape, image_file_square, share_cover_image }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`Creating automation task for agents: ${agents}`);

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
    task_id: z.string().describe("ID of the task to check"),
  },
  async ({ task_id }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`Getting status for task ID: ${task_id}`);

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
        taskConfigs.delete(task_id);
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
      taskConfigs.delete(task_id);
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
    status_filter: z.string().refine((state): state is TaskStatus => {
        return Object.values(TaskStatuses).includes(state as TaskStatus);
    }),
  },
  async ({ status_filter }) => {
    try {
      clearLogs(); // Clear logs at the start of the tool execution
      logInfo(`Listing tasks with status filter: ${status_filter ?? 'none'}`);

      const apiClient: ApiClient = await getOrCreateApiClient();

      let taskList: Task[] = await apiClient.getTasks();

      // Delete stale tasks
      for (const taskId of taskConfigs.keys()) {
        if (!taskList.find(t => t.id === taskId)) {
          taskConfigs.delete(taskId);
        }
      }

      if (status_filter) {
        taskList = taskList.filter(task => task.status === status_filter);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tasks: taskList,
              total: taskList.length,
              filter_applied: status_filter ?? null
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: withLogs(`Error listing tasks with status: ${status_filter}`, error),
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
      logInfo(`Validating automation setup`);

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
        logInfo("Fetching logs");

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
    logInfo(`Received SIGTERM, shutting down...`);
    try {
      await stopAndRemoveContainer(AIDEAS_IMAGE_NAME);
    } finally {
      process.exit(0);
    }
});

process.on("SIGINT", async () => {
  logInfo(`Received SIGINT, shutting down...`);
  try {
    await stopAndRemoveContainer(AIDEAS_IMAGE_NAME);
  } finally {
    process.exit(0);
  }
});

process.on("exit", async code => {
  logInfo(`App exited with code: ${code}, shutting down...`);
  try {
    await stopAndRemoveContainer(AIDEAS_IMAGE_NAME);
  } finally {
    process.exit(code);
  }
});

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
logInfo(`MCP server: ${SERVER_NAME} v${SERVER_VERSION} is running on stdio\nPress Ctrl+C to exit`);
// const appStatus: AppStatus = await setupApp(30);
// if (appStatus.error) {
//   logError(appStatus.message);
//   process.exit(1);
// } else {
//   logInfo(`MCP server: ${SERVER_NAME} v${SERVER_VERSION} is running on stdio\nPress Ctrl+C to exit`);
// }
