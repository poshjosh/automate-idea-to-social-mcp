#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "js-yaml";
import { parse } from "node-html-parser";

const execAsync = promisify(exec);

// Environment variables for the automate-idea-to-social project
const AIDEAS_PROJECT_PATH = process.env.AIDEAS_PROJECT_PATH;
if (!AIDEAS_PROJECT_PATH) {
  throw new Error('AIDEAS_PROJECT_PATH environment variable is required - path to automate-idea-to-social project');
}

// Define types for agent configurations and tasks
interface AgentConfig {
  'agent-type': string;
  'agent-tags': string;
  'sort-order'?: number;
  stages: Record<string, any>;
}

interface TaskConfig {
  agents: string[];
  'language-codes': string;
  'text-file'?: string;
  'text-title'?: string;
  'text-content'?: string;
  'image-file-landscape'?: string;
  'image-file-square'?: string;
  'share-cover-image'?: boolean;
}

interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agents: string[];
  startTime?: string;
  endTime?: string;
  results?: any;
  error?: string;
}

// In-memory task storage (in production, this could be a database)
const tasks: Map<string, TaskStatus> = new Map();

// Create an MCP server
const server = new McpServer({
  name: "automate-idea-to-social-mcp",
  version: "1.0.0"
});

// Helper functions
async function getAvailableAgents(): Promise<string[]> {
  try {
    if (!AIDEAS_PROJECT_PATH) {
      throw new Error('AIDEAS_PROJECT_PATH not set');
    }
    const agentConfigDir = path.join(AIDEAS_PROJECT_PATH, 'src', 'resources', 'config', 'agent');
    const files = await fs.readdir(agentConfigDir);
    return files
      .filter((file: string) => file.endsWith('.config.yaml'))
      .map((file: string) => file.replace('.config.yaml', ''));
  } catch (error) {
    console.error('Error reading agent configs:', error);
    return [];
  }
}

async function getAgentConfig(agentName: string): Promise<AgentConfig | null> {
  try {
    if (!AIDEAS_PROJECT_PATH) {
      throw new Error('AIDEAS_PROJECT_PATH not set');
    }
    const configPath = path.join(AIDEAS_PROJECT_PATH, 'src', 'resources', 'config', 'agent', `${agentName}.config.yaml`);
    const configContent = await fs.readFile(configPath, 'utf8');
    return yaml.load(configContent) as AgentConfig;
  } catch (error) {
    console.error(`Error reading config for agent ${agentName}:`, error);
    return null;
  }
}

async function runAutomationTask(taskId: string, config: TaskConfig): Promise<void> {
  const task = tasks.get(taskId);
  if (!task) return;

  try {
    task.status = 'running';
    task.startTime = new Date().toISOString();

    if (!AIDEAS_PROJECT_PATH) {
      throw new Error('AIDEAS_PROJECT_PATH not set');
    }

    // Create a temporary config file for this task
    const tempConfigPath = path.join(AIDEAS_PROJECT_PATH, `temp-config-${taskId}.yaml`);
    const configYaml = yaml.dump(config);
    await fs.writeFile(tempConfigPath, configYaml);

    // Run the automation
    const command = `cd "${AIDEAS_PROJECT_PATH}" && export CONFIG_DIR="${tempConfigPath}" && .venv/bin/python3 src/aideas/main.py`;
    const { stdout, stderr } = await execAsync(command);

    task.status = 'completed';
    task.endTime = new Date().toISOString();
    task.results = { stdout, stderr };

    // Clean up temp config
    await fs.unlink(tempConfigPath).catch(() => {});
  } catch (error) {
    task.status = 'failed';
    task.endTime = new Date().toISOString();
    task.error = error instanceof Error ? error.message : String(error);
  }
}

// Tool: List available agents
server.tool(
  "list_agents",
  {
    filter_by_tag: z.string().optional().describe("Filter agents by tag (e.g., 'post', 'generate-video', 'test')"),
  },
  async ({ filter_by_tag }) => {
    try {
      const agents = await getAvailableAgents();
      let filteredAgents = agents;

      if (filter_by_tag) {
        const agentDetails = await Promise.all(
          agents.map(async (agent) => {
            const config = await getAgentConfig(agent);
            return { name: agent, config };
          })
        );

        filteredAgents = agentDetails
          .filter(({ config }) => config && config['agent-tags']?.includes(filter_by_tag))
          .map(({ name }) => name);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              agents: filteredAgents,
              total: filteredAgents.length,
              filter_applied: filter_by_tag || null
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing agents: ${error instanceof Error ? error.message : String(error)}`,
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
      const config = await getAgentConfig(agent_name);
      if (!config) {
        return {
          content: [
            {
              type: "text",
              text: `Agent '${agent_name}' not found`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(config, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting agent config: ${error instanceof Error ? error.message : String(error)}`,
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
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate agents exist
      const availableAgents = await getAvailableAgents();
      const invalidAgents = agents.filter(agent => !availableAgents.includes(agent));
      if (invalidAgents.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid agents: ${invalidAgents.join(', ')}. Available agents: ${availableAgents.join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      // Create task configuration
      const taskConfig: TaskConfig = {
        agents,
        'language-codes': language_codes,
        'text-content': text_content,
        'share-cover-image': share_cover_image,
      };

      if (text_title) taskConfig['text-title'] = text_title;
      if (image_file_landscape) taskConfig['image-file-landscape'] = image_file_landscape;
      if (image_file_square) taskConfig['image-file-square'] = image_file_square;

      // Create task status
      const task: TaskStatus = {
        id: taskId,
        status: 'pending',
        agents,
      };

      tasks.set(taskId, task);

      // Start the task asynchronously
      runAutomationTask(taskId, taskConfig);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              task_id: taskId,
              status: 'pending',
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
            text: `Error creating automation task: ${error instanceof Error ? error.message : String(error)}`,
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
      const task = tasks.get(task_id);
      if (!task) {
        return {
          content: [
            {
              type: "text",
              text: `Task '${task_id}' not found`,
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
            text: `Error getting task status: ${error instanceof Error ? error.message : String(error)}`,
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
    status_filter: z.enum(['pending', 'running', 'completed', 'failed']).optional().describe("Filter tasks by status"),
  },
  async ({ status_filter }) => {
    try {
      let taskList = Array.from(tasks.values());
      
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
              filter_applied: status_filter || null
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Generate content ideas
server.tool(
  "generate_content_ideas",
  {
    topic: z.string().describe("Topic or theme for content ideas"),
    platform: z.string().optional().describe("Target platform (e.g., 'twitter', 'youtube', 'blog')"),
    count: z.number().min(1).max(10).default(5).describe("Number of ideas to generate"),
  },
  async ({ topic, platform, count }) => {
    try {
      // This is a simple content idea generator
      // In a real implementation, this could use AI/LLM APIs
      const ideaTemplates = [
        `How to master ${topic} in 2024`,
        `5 common mistakes people make with ${topic}`,
        `The ultimate guide to ${topic}`,
        `Why ${topic} is more important than you think`,
        `${topic}: A beginner's complete guide`,
        `Advanced ${topic} techniques that actually work`,
        `The future of ${topic}: What to expect`,
        `${topic} myths debunked`,
        `Case study: How ${topic} changed everything`,
        `${topic} tools and resources you need to know`,
      ];

      const platformSpecific = platform ? {
        twitter: [`Quick ${topic} tips thread`, `${topic} hot take`, `${topic} in 280 characters`],
        youtube: [`${topic} tutorial`, `${topic} review`, `${topic} vs alternatives`],
        blog: [`Deep dive into ${topic}`, `${topic} comprehensive analysis`, `${topic} step-by-step guide`],
      } : {};

      const allTemplates = [...ideaTemplates, ...(platformSpecific[platform as keyof typeof platformSpecific] || [])];
      const selectedIdeas = allTemplates.slice(0, count);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              topic,
              platform: platform || 'general',
              ideas: selectedIdeas,
              count: selectedIdeas.length
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating content ideas: ${error instanceof Error ? error.message : String(error)}`,
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
      const checks = [];
      
      // Check if project path exists
      try {
        await fs.access(AIDEAS_PROJECT_PATH);
        checks.push({ check: 'Project path exists', status: 'pass', path: AIDEAS_PROJECT_PATH });
      } catch {
        checks.push({ check: 'Project path exists', status: 'fail', path: AIDEAS_PROJECT_PATH });
      }

      // Check if main.py exists
      try {
        const mainPyPath = path.join(AIDEAS_PROJECT_PATH, 'src', 'aideas', 'main.py');
        await fs.access(mainPyPath);
        checks.push({ check: 'main.py exists', status: 'pass', path: mainPyPath });
      } catch {
        checks.push({ check: 'main.py exists', status: 'fail' });
      }

      // Check if agent configs exist
      try {
        const agents = await getAvailableAgents();
        checks.push({ check: 'Agent configs found', status: 'pass', count: agents.length, agents: agents.slice(0, 5) });
      } catch {
        checks.push({ check: 'Agent configs found', status: 'fail' });
      }

      // Check Python availability
      try {
        await execAsync('python3 --version');
        checks.push({ check: 'Python3 available', status: 'pass' });
      } catch {
        checks.push({ check: 'Python3 available', status: 'fail' });
      }

      const allPassed = checks.every(check => check.status === 'pass');

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              overall_status: allPassed ? 'ready' : 'issues_found',
              checks,
              message: allPassed ? 'Setup validation passed' : 'Some issues found - check individual items'
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error validating setup: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Automate Idea to Social MCP server running on stdio');