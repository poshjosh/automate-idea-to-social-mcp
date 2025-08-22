import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import {
    AgentConfig,
    Task,
    TaskConfig,
    TaskStatuses
} from "./api-type-definitions.js";
import { logInfo } from "./logger.js";

interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
    statusCode?: number;
}

/**
 * API Client class for making HTTP requests to the specified endpoints
 */
class ApiClient {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    }

    /**
     * Makes an HTTP request using Node.js built-in modules
     * @param method HTTP method (GET, POST, etc.)
     * @param endpoint API endpoint path
     * @param data Request body data (for POST requests)
     * @param retries Number of retries for the request in case of failure
     * @param retryInterval Interval between retries in milliseconds
     * @returns Promise resolving to the response data
     */
    private async makeRequest(method: string, endpoint?: string, data?: any,
                              retries: number = 2, retryInterval: number = 5000): Promise<ApiResponse> {
        let response;
        while (retries-- >= 0) {
            logInfo(`ApiClient. Sending ${method} to ${endpoint} with data: ${data ? JSON.stringify(data) : data}`);
            response = await this._makeRequest(method, endpoint, data);
            if (response.success && response?.data) {
                logInfo(`ApiClient. Request successful. Response data:\n${response?.data ? JSON.stringify(response.data) : data}`);
                return response
            }
            logInfo(`ApiClient. Retrying request. Retries left: ${retries}`);
            // Wait some seconds and try again
            await new Promise(resolve => setTimeout(resolve, retryInterval));
        }
        if (!response) {
            logInfo(`ApiClient. No response.`);
            return { success: false }
        }
        return response;
    }

    private async _makeRequest(method: string, endpoint?: string, data?: any): Promise<ApiResponse> {
        return new Promise((resolve) => {
            const fullUrl = endpoint ? `${this.baseUrl}${endpoint}` : this.baseUrl;
            const parsedUrl = new URL(fullUrl);

            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const req = httpModule.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const statusCode = res.statusCode || 0;

                        if (statusCode >= 200 && statusCode < 300) {
                            let parsedData;
                            try {
                                parsedData = JSON.parse(responseData);
                            } catch (parseError) {
                                // TODO Really?
                                // If JSON parsing fails, return raw data
                                parsedData = responseData;
                            }

                            resolve({
                                success: true,
                                data: parsedData,
                                statusCode: statusCode
                            });
                        } else {
                            resolve({
                                success: false,
                                error: `HTTP ${statusCode}: ${responseData}`,
                                statusCode: statusCode
                            });
                        }
                    } catch (error) {
                        resolve({
                            success: false,
                            error: `Response parsing error: ${error instanceof Error ? error.message : String(error)}`,
                            statusCode: res.statusCode
                        });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Request error: ${error.message}`
                });
            });

            // Write request body for POST requests
            if (data && method === 'POST') {
                const jsonData = JSON.stringify(data);
                req.write(jsonData);
            }

            req.end();
        });
    }

    async isUp(timeoutSeconds: number = 30): Promise<boolean> {
        logInfo(`ApiClient. Checking if server is up, timeout: ${timeoutSeconds} seconds`);
        if (timeoutSeconds < 0) {
            throw new Error("Timeout must be a positive number");
        }
        while((timeoutSeconds--) >= 0) {
            const isUp: boolean = await this._isUp();
            // logInfo(`isUp: ${isUp}, time left: ${timeoutSeconds}`);
            if (isUp) {
                return true;
            }
            // Wait for 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        logInfo(`ApiClient. Server is not up, even after waiting ${timeoutSeconds} seconds`);
        return false;
    }

    async _isUp(): Promise<boolean> {
        try {
            // TODO Change to the new health endpoint i.e. GET, '/info/health/status'
            const response = await this.makeRequest('GET', undefined, null, 0);
            return response.success;
        } catch (error) {
            console.error(`ApiClient. Error checking API health: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * GET /api/agents
     * Retrieves all agent names, (by the specified tag if provided)
     * @param tag Optional tag to filter agents
     * @returns Promise resolving to the names of agents
     */
    async getAgentNames(tag: string | null = null): Promise<string[]> {
        logInfo(`ApiClient. Getting agent names for tag: ${tag}`);
        const endpoint = tag ? `/api/agents?tag=${encodeURIComponent(tag)}` : '/api/agents';
        const response = await this.makeRequest('GET', endpoint);

        if (response.success) {
            return ApiClient.toMap(response?.data).get("agents") || []
        } else {
            throw new Error(`ApiClient. Failed to get agents: ${response?.error}`);
        }
    }

    /**
     * GET /api/agents/<agent-name>
     * Retrieves a specific agent by name
     * @param agentName The name of the agent to retrieve
     * @returns Promise resolving to Agent
     */
    async getAgentConfig(agentName: string): Promise<AgentConfig> {
        logInfo(`ApiClient. Getting agent config for agent: ${agentName}`);
        const encodedAgentName = encodeURIComponent(agentName);
        const response = await this.makeRequest('GET', `/api/agents/${encodedAgentName}`);

        if (response.success) {
            return ApiClient.toAgentConfig(ApiClient.toMap(response?.data).get("agent"))
        } else {
            throw new Error(`ApiClient. Failed to get agent ${agentName}: ${response?.error}`);
        }
    }

    /**
     * POST /api/tasks
     * Creates a new task
     * @param taskData Object containing tag and agents array
     * @returns Promise resolving to a Task
     */
    async createTask(taskData: TaskConfig): Promise<string> {
        logInfo(`ApiClient. Creating task with data: ${JSON.stringify(taskData)}`);
        const response = await this.makeRequest('POST', '/api/tasks', taskData, 0);

        if (response.success) {
            return ApiClient.toMap(response?.data).get("id");
        } else {
            throw new Error(`ApiClient. Failed to create task: ${response?.error}`);
        }
    }

    /**
     * GET /api/tasks
     * Retrieves all tasks
     * @returns Promise resolving to an array Tasks
     */
    async getTasks(): Promise<Task[]> {
        logInfo(`ApiClient. Getting all tasks`);
        const response = await this.makeRequest('GET', '/api/tasks');

        if (response.success) {
            return (ApiClient.toMap(response?.data).get("tasks") as []).map(taskData => ApiClient.toTask(taskData));
        } else {
            throw new Error(`ApiClient. Failed to get tasks: ${response?.error}`);
        }
    }

    /**
     * GET /api/tasks/<task-id>
     * Retrieves a specific task by ID
     * @param taskId The ID of the task to retrieve
     * @returns Promise resolving to task data
     */
    async getTask(taskId: string): Promise<any> {
        logInfo(`ApiClient. Getting task with ID: ${taskId}`);
        const encodedTaskId = encodeURIComponent(taskId);
        const response = await this.makeRequest('GET', `/api/tasks/${encodedTaskId}`);

        if (response.success) {
            return ApiClient.toTask(response?.data);
        } else {
            throw new Error(`ApiClient. Failed to get task ${taskId}: ${response?.error}`);
        }
    }

    /**
     * Converts response data to an AgentConfig if it's an object
     * @param data The data to convert
     * @returns The AgentConfig object created from the provided data
     */
    private static toAgentConfig(data: any): AgentConfig {
        const map: Map<string, any> = ApiClient.toMap(data)
        return {
            'agent-type': map.get('agent-type'),
            'agent-tags': map.get('agent-tags'),
            'sort-order': map.get('sort-order') || 0,
            // TODO
            stages: map.get('stages') || {}
        };
    }

    /**
     * Converts response data to a Task if it's an object
     * @param data The data to convert
     * @returns The Task object created from the provided data
     */
    private static toTask(data: any): Task {
        const map: Map<string, any> = ApiClient.toMap(data)
        return {
            id: map.get("id"),
            agents: map.get("agents") || [],
            links: map.get("links") || {},
            progress: map.get("progress") || {},
            status: map.get("status") || TaskStatuses.PENDING
        };
    }

    /**
     * Converts response data to a Map if it's an object
     * @param data The data to convert
     * @returns Map representation of the data
     */
    private static toMap(data: any): Map<string, any> {
        if (!data) {
            return new Map();
        }
        if (data instanceof Map) {
            return data;
        }
        const type = typeof data;
        if (type === 'object' && !Array.isArray(data)) {
            return new Map(Object.entries(data));
        }
        let errorMsg;
        try {
            errorMsg = `Data cannot be converted to Map - type: ${type} is not object: ${JSON.stringify(data)}`;
            throw new Error(errorMsg);
        } catch(error) {
            errorMsg = `Data cannot be converted to Map - type: ${type} is not object: ${data}`
            throw new Error(errorMsg);
        }
    }
}

/**
 * Factory function to create an ApiClient instance
 * @param baseUrl The base URL for the API
 * @returns New ApiClient instance
 */
function createApiClient(baseUrl: string): ApiClient {
    return new ApiClient(baseUrl);
}

// Example usage and helper functions
async function exampleUsage() {
    const client = createApiClient('https://api.example.com');

    try {
        // Get all agents
        const agents = await client.getAgentNames();
        console.log('All agents:', agents);

        // Get specific agent
        const agent = await client.getAgentConfig('agent-name');
        console.log('Specific agent:', agent);

        // Create a task
        const newTaskId = await client.createTask({
            tag: 'example-tag',
            agents: ['agent1', 'agent2']
        });
        console.log('Created task:', newTaskId);

        // Get all tasks
        const tasks = await client.getTasks();
        console.log('All tasks:', tasks);

        // Get specific task
        const task = await client.getTask('task-id-123');
        console.log('Specific task:', task);
    } catch (error) {
        console.error('API Error:', error instanceof Error ? error.message : String(error));
    }
}

// Export the main classes and functions
export {
    ApiClient,
    createApiClient,
    TaskConfig,
    ApiResponse
};

// Run example if this file is executed directly
// if (require.main === module) {
//     exampleUsage().catch(console.error);
// }