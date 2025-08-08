# Usage Examples for Automate Idea to Social MCP Server

This document provides practical examples of how to use the MCP server tools for automating content creation and social media publishing.

## Quick Start Examples

### 1. Basic Setup Validation

Before using the server, validate that everything is configured correctly:

```
validate_setup
```

**Expected Response:**
```json
{
  "overall_status": "ready",
  "checks": [
    {
      "check": "Project path exists",
      "status": "pass",
      "path": "/Users/chinomso/dev_ai/automate-idea-to-social"
    },
    {
      "check": "main.py exists",
      "status": "pass"
    },
    {
      "check": "Agent configs found",
      "status": "pass",
      "count": 13,
      "agents": ["blog", "twitter", "youtube", "facebook", "instagram"]
    },
    {
      "check": "Python3 available",
      "status": "pass"
    }
  ],
  "message": "Setup validation passed"
}
```

### 2. Discover Available Agents

List all available automation agents:

```
list_agents
```

**Response:**
```json
{
  "agents": [
    "blog",
    "copy-files-to-pictory-output",
    "facebook",
    "image-generator",
    "instagram",
    "pictory",
    "reddit",
    "subtitles-translation",
    "test-agent",
    "tiktok",
    "translation",
    "twitter",
    "youtube"
  ],
  "total": 13,
  "filter_applied": null
}
```

Filter agents by posting capability:

```
list_agents filter_by_tag="post"
```

**Response:**
```json
{
  "agents": ["blog", "twitter", "youtube", "facebook", "instagram", "tiktok", "reddit"],
  "total": 7,
  "filter_applied": "post"
}
```

## Content Creation Workflows

### 3. Generate Content Ideas

Generate ideas for a specific topic:

```
generate_content_ideas topic="artificial intelligence" platform="youtube" count=3
```

**Response:**
```json
{
  "topic": "artificial intelligence",
  "platform": "youtube",
  "ideas": [
    "How to master artificial intelligence in 2024",
    "5 common mistakes people make with artificial intelligence",
    "The ultimate guide to artificial intelligence"
  ],
  "count": 3
}
```

### 4. Single Platform Publishing

Create a task to post content to Twitter:

```
create_automation_task 
agents=["twitter"] 
text_content="🚀 Just discovered an amazing AI tool that can automate social media posting! The future of content creation is here. What's your favorite AI productivity tool? #AI #Productivity #SocialMedia" 
text_title="AI Social Media Automation"
```

**Response:**
```json
{
  "task_id": "task_1704123456789_abc123def",
  "status": "pending",
  "agents": ["twitter"],
  "message": "Task created and started"
}
```

### 5. Multi-Platform Publishing

Create a comprehensive content publishing task:

```
create_automation_task 
agents=["youtube", "twitter", "blog"] 
text_content="In this comprehensive guide, we'll explore the top 10 productivity hacks that successful entrepreneurs use daily. From time-blocking techniques to automation tools, these strategies can transform your workflow and boost your efficiency by 300%." 
text_title="10 Productivity Hacks That Will Transform Your Workflow" 
language_codes="en,es,fr"
```

**Response:**
```json
{
  "task_id": "task_1704123456790_def456ghi",
  "status": "pending",
  "agents": ["youtube", "twitter", "blog"],
  "message": "Task created and started"
}
```

## Task Management

### 6. Monitor Task Progress

Check the status of a specific task:

```
get_task_status task_id="task_1704123456789_abc123def"
```

**Response (Running):**
```json
{
  "id": "task_1704123456789_abc123def",
  "status": "running",
  "agents": ["twitter"],
  "startTime": "2024-01-01T12:34:56.789Z",
  "endTime": null,
  "results": null,
  "error": null
}
```

**Response (Completed):**
```json
{
  "id": "task_1704123456789_abc123def",
  "status": "completed",
  "agents": ["twitter"],
  "startTime": "2024-01-01T12:34:56.789Z",
  "endTime": "2024-01-01T12:36:23.456Z",
  "results": {
    "stdout": "Task completed successfully. Tweet posted.",
    "stderr": ""
  },
  "error": null
}
```

### 7. List All Tasks

View all tasks with their current status:

```
list_tasks
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_1704123456789_abc123def",
      "status": "completed",
      "agents": ["twitter"],
      "startTime": "2024-01-01T12:34:56.789Z",
      "endTime": "2024-01-01T12:36:23.456Z"
    },
    {
      "id": "task_1704123456790_def456ghi",
      "status": "running",
      "agents": ["youtube", "twitter", "blog"],
      "startTime": "2024-01-01T12:40:15.123Z",
      "endTime": null
    }
  ],
  "total": 2,
  "filter_applied": null
}
```

Filter by status:

```
list_tasks status_filter="completed"
```

## Advanced Use Cases

### 8. Blog Content with Images

Create a blog post with accompanying images:

```
create_automation_task 
agents=["blog"] 
text_content="# The Rise of Remote Work: A Complete Guide\n\nRemote work has transformed from a rare perk to a standard practice. In this comprehensive guide, we'll explore the benefits, challenges, and best practices for successful remote work implementation.\n\n## Benefits of Remote Work\n- Increased flexibility\n- Better work-life balance\n- Reduced commuting costs\n- Access to global talent\n\n## Challenges and Solutions\n- Communication barriers: Use tools like Slack and Zoom\n- Isolation: Schedule regular team check-ins\n- Productivity concerns: Implement clear goals and metrics" 
text_title="The Rise of Remote Work: A Complete Guide" 
image_file_landscape="/path/to/remote-work-cover.jpg" 
share_cover_image=true
```

### 9. Video Content with Subtitles

Create a YouTube video with multi-language subtitles:

```
create_automation_task 
agents=["youtube", "subtitles-translation"] 
text_content="Welcome to our channel! Today we're discussing the top 5 programming languages to learn in 2024. Whether you're a beginner or looking to expand your skills, this video will help you make the right choice for your career." 
text_title="Top 5 Programming Languages to Learn in 2024" 
language_codes="en,es,fr,de,ja"
```

### 10. Agent Configuration Inspection

Examine the configuration of a specific agent:

```
get_agent_config agent_name="youtube"
```

**Response (truncated):**
```json
{
  "agent-type": "browser",
  "agent-tags": "post",
  "sort-order": 2,
  "browser": {
    "chrome": {
      "undetected": true,
      "options": {
        "args": [
          "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "window-size=1920,1080",
          "start-maximized"
        ]
      }
    }
  },
  "stages": {
    "login": {
      "url": "https://www.youtube.com/",
      "stage-items": {
        "website-cookies": {
          "search-for": [
            "//*[@id=\"content\"]//ytd-button-renderer/yt-button-shape/button/div/span[starts-with(text(), \"Accept\")]"
          ]
        }
      }
    }
  }
}
```

## Error Handling Examples

### 11. Invalid Agent Name

```
create_automation_task 
agents=["invalid-agent"] 
text_content="Test content"
```

**Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Invalid agents: invalid-agent. Available agents: blog, twitter, youtube, facebook, instagram, tiktok, reddit, ..."
    }
  ],
  "isError": true
}
```

### 12. Missing Task ID

```
get_task_status task_id="nonexistent-task"
```

**Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Task 'nonexistent-task' not found"
    }
  ],
  "isError": true
}
```

## Best Practices

### Content Planning Workflow

1. **Generate Ideas**: Use `generate_content_ideas` to brainstorm topics
2. **Validate Setup**: Run `validate_setup` before starting tasks
3. **Check Agents**: Use `list_agents` to see available platforms
4. **Create Tasks**: Use `create_automation_task` with appropriate agents
5. **Monitor Progress**: Use `get_task_status` and `list_tasks` to track execution
6. **Review Results**: Check task results for success/failure details

### Multi-Language Content

For international audiences, use the `language_codes` parameter:

```
create_automation_task 
agents=["blog", "youtube"] 
text_content="Your content here" 
language_codes="en,es,fr,de,it,pt,ja,ko,zh"
```

### Batch Processing

Create multiple tasks for different content pieces:

```
# Task 1: Educational content
create_automation_task agents=["youtube", "blog"] text_content="How to learn Python programming" text_title="Python Learning Guide"

# Task 2: Promotional content  
create_automation_task agents=["twitter", "facebook"] text_content="Check out our new Python course!" text_title="Course Announcement"

# Task 3: Community engagement
create_automation_task agents=["reddit", "twitter"] text_content="What's your favorite Python library and why?" text_title="Community Question"
```

## Troubleshooting Common Issues

### Setup Issues

If `validate_setup` fails:

1. Check that `AIDEAS_PROJECT_PATH` is correctly set
2. Ensure the automate-idea-to-social project is properly installed
3. Verify Python dependencies are installed
4. Check file permissions

### Task Failures

If tasks fail:

1. Check task status with `get_task_status`
2. Review error messages in the response
3. Ensure platform credentials are configured
4. Verify content meets platform requirements (length, format, etc.)

### Agent Issues

If agents are not found:

1. Use `list_agents` to see available agents
2. Check agent configuration files exist
3. Verify agent names are spelled correctly
4. Ensure the project is up to date

This comprehensive guide should help you get started with the MCP server and explore its full capabilities for automating your social media content workflow.