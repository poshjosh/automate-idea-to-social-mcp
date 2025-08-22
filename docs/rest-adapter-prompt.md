Write a typescript script that:

Given:

- A base url

Exposes several functions to use the base url to make HTTP requests to endpoints as follows:

- GET /api/agents
  - Response format: Json object

- GET /api/agents/<agent-name>
  - Response format: JSON object.

- POST /api/tasks
  - Request body data=`{"tag":"<string>", "agents":["<array of strings>"] }`
  - Response format: JSON object.

- GET /api/tasks
  - Response format: JSON object. 

- GET /api/tasks/<task-id>
  - Response format: JSON object. 

The output returned by each method may be a Map, JSON or other key-value data structure.

The script should not have any external dependencies, except for the built-in modules.