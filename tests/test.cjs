const { MCPClient } = require('./mcp-client.cjs');
const { TaskStatuses } = require("../src/api-type-definitions.ts");

function getFieldValueFromToolCallResponse(toolName, response, fieldName) {
  const responseText = response?.content[0]?.text;
  if (!responseText) {
    console.error(`Unexpected ${toolName} response, expected field: content[0].text in response: `, response);
    return;
  }
  try {
    const fieldValue = JSON.parse(responseText)[fieldName];
    if (!fieldValue) {
      console.error(`Unexpected ${toolName} response, expected field: content[0].text.${fieldName} in response:\n`, response);
    }
    return fieldValue;
  } catch(parseError) {
    console.error(`Unexpected ${toolName} response, expected field: content[0].text.${fieldName} in response:\n`, response);
    return null;
  }
}

async function test() {
  // MCP server exited with code 0
  // The above message may indicate that the MCP server process has exited successfully.
  //
  const client = new MCPClient(60 * 1000);

  try {
    const docker = true;

    // Example server configuration
    const serverConfig = {
      command: 'node',
      args: ['/Users/chinomso/dev_ai/automate-idea-to-social-mcp/build/index.js'],
      env: {
        "AIDEAS_ENV_FILE": "/Users/chinomso/.aideas/content/run.env"
      }
    };
    const serverConfigDocker = {
      command: 'docker',
      args: [
        "run", "-u", "0", "-i", "--rm",
        "-v", "/var/run/docker.sock:/var/run/docker.sock",
        "-e", "APP_PROFILES=docker",
        "-e", `USER_HOME=${require('os').homedir()}`,
        "poshjosh/aideas-mcp:0.0.1"
      ],
    };

    // Connect to the server
    await client.connect(docker ? serverConfigDocker : serverConfig);

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    const listAgentsResponse = await client.callTool('list_agents');
    // console.log('List agents result:', listAgentsResponse);
    const agents = getFieldValueFromToolCallResponse(
      "list_agents", listAgentsResponse, "agents");
    console.log('Agents:', agents);

    const agent_name = agents[0];
    const agentConfigResponse = await client.callTool("get_agent_config", {
      agent_name
    })
    console.log(`${agent_name} agent config response:\n`, agentConfigResponse);

    // List resources (optional)
    try {
      const resources = await client.listResources();
      console.log('Available resources:', resources);
    } catch (error) {
      console.log('No resources available or not supported');
    }

    // List prompts (optional)
    try {
      const prompts = await client.listPrompts();
      console.log('Available prompts:', prompts);
    } catch (error) {
      console.log('No prompts available or not supported');
    }

    const createTaskResponse = await client.callTool('create_automation_task', {
      agents: ["test-agent", "test-log"],
      // text_content: "Rest is for the assured.",
      // text_title: "",
      // language_codes: [""],
      // image_file_landscape: "",
      // image_file_square: "",
      // share_cover_image: true
    });
    console.log("Create automation task response:  ", createTaskResponse);
    const taskId = getFieldValueFromToolCallResponse(
      "create_automation_task", createTaskResponse, "task_id");
    if (!taskId) {
      return;
    }

    const listTasksResponse = await client.callTool("list_tasks", {
      filter_by_status: TaskStatuses.RUNNING
    })
    console.log('List tasks response:\n', listTasksResponse);

    let taskStatus = null;
    while (!taskStatus || taskStatus.toString() === "PENDING") {
      const taskStatusResponse = await client.callTool('get_task_status', {
        task_id: taskId
      });
      // console.log("Task status response:  ", taskStatusResponse);
      taskStatus = getFieldValueFromToolCallResponse(
        "get_task_status", taskStatusResponse, "status");
      console.log(`Status: ${taskStatus}, task ID: ${taskId}`);
      // Wait for a while before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect when done
    client.disconnect();
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  test();
}
