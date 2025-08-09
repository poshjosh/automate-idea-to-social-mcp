#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "js-yaml";
import { AIDEAS_ENV_FILE, AIDEAS_PROJECT_DIR, CONFIG_DIR } from "./environment.js";
import { clearLogs, getLogs, logError, logInfo, logThrown } from "./logger.js";
import { TaskStates } from "./type-definitions.js";
const SERVER_NAME = "automate-idea-to-social-mcp";
const SERVER_VERSION = "1.0.0";
const execAsync = promisify(exec);
// In-memory task storage (in production, this could be a database)
const tasks = new Map();
// Create an MCP server
const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
});
function checkProjectDir() {
    if (!AIDEAS_PROJECT_DIR) {
        throw new Error('AIDEAS_PROJECT_DIR not set');
    }
}
// Helper functions
async function getAvailableAgents() {
    try {
        logInfo("Getting available agents");
        checkProjectDir();
        const agentConfigDir = path.join(AIDEAS_PROJECT_DIR, 'src', 'resources', 'config', 'agent');
        const files = await fs.readdir(agentConfigDir);
        return files
            .filter((file) => file.endsWith('.config.yaml'))
            .map((file) => file.replace('.config.yaml', ''));
    }
    catch (error) {
        logThrown(`Error reading agent configs`, error);
        return [];
    }
}
async function getAgentConfig(agentName) {
    try {
        logInfo(`Getting agent config for: ${agentName}`);
        checkProjectDir();
        const configPath = path.join(AIDEAS_PROJECT_DIR, 'src', 'resources', 'config', 'agent', `${agentName}.config.yaml`);
        const configContent = await fs.readFile(configPath, 'utf8');
        return yaml.load(configContent);
    }
    catch (error) {
        logThrown(`Error reading config for agent: ${agentName}`, error);
        return null;
    }
}
async function runAutomationTask(taskId, config) {
    const task = tasks.get(taskId);
    try {
        logInfo(`Running task with ID: ${taskId}, config: ${JSON.stringify(config)}`);
        checkProjectDir();
        if (!task) {
            logInfo(`Task with ID: ${taskId} not found`);
            return;
        }
        task.status = TaskStates.RUNNING;
        task.startTime = new Date().toISOString();
        // Create a temporary config file for this task
        const tempRunConfigPath = path.join(CONFIG_DIR, `run.config.yaml`);
        const configYaml = yaml.dump(config);
        // TODO Delete after use
        await fs.writeFile(tempRunConfigPath, configYaml);
        logInfo(`Temporary run config created at: ${tempRunConfigPath}`);
        // Run the automation
        // The working directory must be <PROJECT_PATH>/src
        const command = `cd "${AIDEAS_PROJECT_DIR}/src" && set -a && source "${AIDEAS_ENV_FILE}" && set +a && ../.venv/bin/python3 aideas/main.py`;
        const { stdout, stderr } = await execAsync(command);
        task.status = TaskStates.SUCCESS;
        task.endTime = new Date().toISOString();
        task.results = { stdout, stderr };
        logInfo(`Task ID: ${taskId} completed successfully`);
        // Clean up temp config
        await fs.unlink(tempRunConfigPath).catch(() => {
            logError(`Failed to delete temporary run config at: ${tempRunConfigPath}`);
        });
    }
    catch (error) {
        logThrown(`Error running task with ID: ${taskId}`, error);
        if (!task) {
            return;
        }
        task.status = TaskStates.FAILURE;
        task.endTime = new Date().toISOString();
        task.error = error instanceof Error ? error.message : String(error);
    }
}
// Tool: List available agents
server.tool("list_agents", {
    filter_by_tag: z.string().optional().describe("Filter agents by tag (e.g., 'post', 'generate-video', 'test')"),
}, async ({ filter_by_tag }) => {
    try {
        clearLogs(); // Clear logs at the start of the tool execution
        logInfo(`Listing agents with filter: ${filter_by_tag ?? 'none'}`);
        const agents = await getAvailableAgents();
        let filteredAgents = agents;
        if (filter_by_tag) {
            const agentDetails = await Promise.all(agents.map(async (agent) => {
                const config = await getAgentConfig(agent);
                return { name: agent, config };
            }));
            filteredAgents = agentDetails
                .filter(({ config }) => config?.['agent-tags']?.includes(filter_by_tag))
                .map(({ name }) => name);
        }
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        agents: filteredAgents,
                        total: filteredAgents.length,
                        filter_applied: filter_by_tag ?? null
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
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
});
// Tool: Get agent configuration
server.tool("get_agent_config", {
    agent_name: z.string().describe("Name of the agent to get configuration for"),
}, async ({ agent_name }) => {
    try {
        clearLogs(); // Clear logs at the start of the tool execution
        logInfo(`Getting config for agent: ${agent_name}`);
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
    }
    catch (error) {
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
});
// Tool: Create automation task
server.tool("create_automation_task", {
    agents: z.array(z.string()).describe("List of agent names to run"),
    text_content: z.string().describe("The text content/idea to process"),
    text_title: z.string().optional().describe("Title for the content"),
    language_codes: z.string().default("en").describe("Language codes (e.g., 'en', 'en,es,fr')"),
    image_file_landscape: z.string().optional().describe("Path to landscape image file"),
    image_file_square: z.string().optional().describe("Path to square image file"),
    share_cover_image: z.boolean().default(false).describe("Whether to share cover image"),
}, async ({ agents, text_content, text_title, language_codes, image_file_landscape, image_file_square, share_cover_image }) => {
    try {
        clearLogs(); // Clear logs at the start of the tool execution
        logInfo(`Creating automation task for agents: ${agents}`);
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
        const taskConfig = {
            agents,
            'language-codes': language_codes,
            'text-content': text_content,
            'share-cover-image': share_cover_image,
        };
        if (text_title)
            taskConfig['text-title'] = text_title;
        if (image_file_landscape)
            taskConfig['image-file-landscape'] = image_file_landscape;
        if (image_file_square)
            taskConfig['image-file-square'] = image_file_square;
        // Create task status
        const task = {
            id: taskId,
            status: TaskStates.PENDING,
            agents,
        };
        tasks.set(taskId, task);
        // Start the task asynchronously
        // TODO: Should we use await here?
        runAutomationTask(taskId, taskConfig);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        task_id: taskId,
                        status: TaskStates.PENDING,
                        agents,
                        message: 'Task created and started'
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
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
});
// Tool: Get task status
server.tool("get_task_status", {
    task_id: z.string().describe("ID of the task to check"),
}, async ({ task_id }) => {
    try {
        clearLogs(); // Clear logs at the start of the tool execution
        logInfo(`Getting status for task ID: ${task_id}`);
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
    }
    catch (error) {
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
});
// Tool: List all tasks
server.tool("list_tasks", {
    status_filter: z.string().refine((state) => {
        return Object.values(TaskStates).includes(state);
    }),
}, async ({ status_filter }) => {
    try {
        clearLogs(); // Clear logs at the start of the tool execution
        logInfo(`Listing tasks with status filter: ${status_filter ?? 'none'}`);
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
                        filter_applied: status_filter ?? null
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
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
});
// Tool: Validate automation setup
server.tool("validate_setup", {}, async () => {
    try {
        clearLogs(); // Clear logs at the start of the tool execution
        logInfo(`Validating automation setup`);
        const checks = [];
        // Check if project path exists
        try {
            await fs.access(AIDEAS_PROJECT_DIR);
            checks.push({ check: 'Project path exists', status: 'pass', path: AIDEAS_PROJECT_DIR });
        }
        catch {
            checks.push({ check: 'Project path exists', status: 'fail', path: AIDEAS_PROJECT_DIR });
        }
        // Check if main.py exists
        try {
            const mainPyPath = path.join(AIDEAS_PROJECT_DIR, 'src', 'aideas', 'main.py');
            await fs.access(mainPyPath);
            checks.push({ check: 'main.py exists', status: 'pass', path: mainPyPath });
        }
        catch {
            checks.push({ check: 'main.py exists', status: 'fail' });
        }
        // Check if agent configs exist
        try {
            const agents = await getAvailableAgents();
            checks.push({ check: 'Agent configs found', status: 'pass', count: agents.length, agents: agents.slice(0, 5) });
        }
        catch {
            checks.push({ check: 'Agent configs found', status: 'fail' });
        }
        // Check Python availability
        try {
            await execAsync('../.venv/bin/python3 --version');
            checks.push({ check: 'Python3 available', status: 'pass' });
        }
        catch {
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
    }
    catch (error) {
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
});
// Tool: List all tasks
server.tool("get_logs", {}, async ({}) => {
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
    }
    catch (error) {
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
});
// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
logInfo(`MCP server: ${SERVER_NAME} v${SERVER_VERSION} is running on stdio`);
//# sourceMappingURL=index.js.map