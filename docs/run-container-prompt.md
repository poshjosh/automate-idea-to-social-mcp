Write a typescript script that:

Given:

- port number
- docker image name

Does the following:

- create a container name by: 
  - extracting the image name without version
  - replacing all '/' with '-' in the result of the previous step.
  - appending '-mcp-container' to the result of the previous step.
- Using the container name from the previous step, check if the container is running.
- if it is not running, run the container with the specified port.
- if the port is occupied by another process, try to find an available port and run the container with that port.
- return the container name and port number if it is running at this point, otherwise return null.
    

