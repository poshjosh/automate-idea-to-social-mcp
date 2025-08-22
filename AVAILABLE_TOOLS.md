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
