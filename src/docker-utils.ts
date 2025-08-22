import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import { logError, logInfo, logThrown } from "./logger.js";

const execAsync = promisify(exec);

interface DockerContainerResult {
    containerName: string;
    port: number;
}

interface DockerStatus {
    error: boolean;
    message: string;
}

/**
 * Checks if Docker is installed on the system
 * @returns Promise resolving to true if Docker is installed, false otherwise
 */
async function isDockerInstalled(): Promise<boolean> {
    try {
        await execAsync('docker --version');
        return true;
    } catch (error) {
        logThrown("Docker is not installed.", error);
        return false;
    }
}

/**
 * Checks if Docker daemon is running
 * @returns Promise resolving to true if Docker is running, false otherwise
 */
async function isDockerRunning(): Promise<boolean> {
    try {
        // Try to connect to Docker daemon by running a simple command
        await execAsync('docker info');
        return true;
    } catch (error) {
        logThrown("Docker is not running.", error);
        return false;
    }
}

/**
 * Comprehensive Docker status check
 * Checks if Docker is installed and running
 * @returns Promise resolving to DockerCheckResult with status and message
 */
async function checkDockerStatus(): Promise<DockerStatus> {
    try {
        // First check if Docker is installed
        const installed = await isDockerInstalled();

        if (!installed) {
            return {
                error: true,
                message: 'Docker is not installed on this system. Please install Docker to continue.'
            };
        }

        // Then check if Docker daemon is running
        const running = await isDockerRunning();

        if (!running) {
            return {
                error: true,
                message: 'Docker is installed but not running. Please start the Docker daemon (try: sudo systemctl start docker or sudo service docker start).'
            };
        }

        return {
            error: false,
            message: 'Docker is installed and running successfully.'
        };

    } catch (error) {
        return {
            error: true,
            message: `Unexpected error while checking Docker status: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Creates a container name from a docker image name
 * @param imageName - The docker image name (e.g., "nginx:latest", "my-repo/app:1.0")
 * @param suffixToAppend - Optional suffix to append to the container name (default: "mcp-container")
 * @returns The generated container name
 */
function createContainerName(imageName: string, suffixToAppend: string = "-mcp-container"): string {
    // Extract image name without version (remove everything after ':')
    const nameWithoutVersion = imageName.split(':')[0];

    // Replace all '/' with '-'
    const nameWithDashes = nameWithoutVersion.replace(/\//g, '-');

    const result =  `${nameWithDashes}${suffixToAppend}`;

    // logInfo(`Generated container name: ${result}`);

    return result;
}

/**
 * Checks if a container is currently running
 * @param containerName - The name of the container to check
 * @returns True if the container is running, false otherwise
 */
async function isContainerRunning(containerName: string): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --filter "status=running" --format "{{.Names}}"`);
        return stdout.trim().includes(containerName);
    } catch (error) {
        logThrown('Error checking container status:', error);
        return false;
    }
}

/**
 * Checks if a port is available on the local machine
 * @param port - The port number to check
 * @returns Promise that resolves to true if port is available, false otherwise
 */
function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });

        server.on('error', () => {
            resolve(false);
        });
    });
}

/**
 * Finds an available port starting from the given port number
 * @param startPort - The port number to start checking from
 * @param maxPort - The maximum port number to check (default: 65535)
 * @returns The first available port number, or null if none found
 */
async function findAvailablePort(startPort: number, maxPort: number = 65535): Promise<number | null> {
    for (let port = startPort; port <= maxPort; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    return null;
}

/**
 * Runs a Docker container with the specified image and port
 * @param imageName - The Docker image name
 * @param containerName - The name to assign to the container
 * @param port - The port to bind the container to, and exposed
 * @param runCommandExtras - Will be appended to the run command before the image name
 * @param user - The user ID to run the container as (default: '0' for root)
 * @returns True if the container was started successfully, false otherwise
 */
async function runContainer(imageName: string, containerName: string, port: number,
                            runCommandExtras: string | null | undefined = null,
                            user: string = '0'): Promise<boolean> {
    try {
        // First, stop and remove any existing container with the same name
        // await stopAndRemoveContainer(containerName);

        // Run the new container
        let command =
`docker run --name ${containerName} -u ${user} -p ${port}:${port} -d \
-v /etc/localtime:/etc/localtime \
-v /var/run/docker.sock:/var/run/docker.sock \
-e APP_PORT=${port} \
${runCommandExtras ?? ''} ${imageName}`;
        // logInfo(`Executing command:\n${command}`);
        await execAsync(command);

        // Wait a moment and check if the container is actually running
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await isContainerRunning(containerName);
    } catch (error) {
        logThrown('Error running container:', error);
        return false;
    }
}

/**
 * Stop and remove a Docker container with the specified name
 * @param imageName - The name of the image, whose container should be stopped and removed.
 * The container name will be derived from this image name using function createContainerName.
 * @returns True if the container is stopped, false otherwise
 */
async function stopAndRemoveContainer(imageName: string): Promise<boolean> {
    const containerName = createContainerName(imageName);
    logInfo(`Stopping and removing container: ${containerName}`);
    try {
        if (!await isContainerRunning(containerName)) {
            logInfo(`Container ${containerName} is not running, nothing to stop.`);
            return true;
        }
        // First, stop and remove any existing container with the same name
        try {
            await execAsync(`docker stop ${containerName} && docker rm ${containerName}`);
        } catch (error) {
            // Ignore errors if container doesn't exist
        }
        // Wait a moment and check if the container is actually running
        await new Promise(resolve => setTimeout(resolve, 1000));
        return !(await isContainerRunning(containerName));
    } catch (error) {
        logThrown('Error running container:', error);
        return false;
    }
}

/**
 * Main function that creates and runs a Docker container
 * @param imageName - The Docker image name
 * @param port - The port to bind the container to, and exposed
 * @param runCommandExtras - Will be appended to the run command before the image name
 * @param user - The user ID to run the container as (default: '0' for root)
 * @returns Container result with name and port, or null if failed
 */
async function createAndRunContainer(imageName: string, port: number, runCommandExtras: string | null | undefined = null, user: string = '0'): Promise<DockerContainerResult | null> {
    try {
        // Step 1: Create container name
        const containerName = createContainerName(imageName);
        logInfo(`Starting container: ${containerName} on port: ${port}...`);

        // Step 2: Check if container is already running
        if (await isContainerRunning(containerName)) {
            logInfo(`Container ${containerName} is already running`);
            return { containerName, port };
        }

        // Step 3: Check if the desired port is available
        let availablePort = port;
        if (!(await isPortAvailable(port))) {
            logInfo(`Port ${port} is occupied, finding alternative port...`);
            const foundPort = await findAvailablePort(port + 1);
            if (foundPort === null) {
                logError('No available ports found');
                return null;
            }
            availablePort = foundPort;
            logInfo(`Using available port: ${availablePort} instead of provided port: ${port}`);
        }

        // Step 4: Run the container
        const success = await runContainer(imageName, containerName, availablePort, runCommandExtras, user);

        if (success) {
            logInfo(`Container ${containerName} started successfully on port ${availablePort}`);
            return { containerName, port: availablePort };
        } else {
            logError('Failed to start container');
            return null;
        }
    } catch (error) {
        logThrown('Error in manageDockerContainer:', error);
        return null;
    }
}

// Example usage
async function main() {
    const imageName = 'nginx:latest'; // Replace with your image name
    try {
        const result = await createAndRunContainer(imageName, 3000);
        logInfo(`${JSON.stringify(result)}`);
    } catch(error) {
        await stopAndRemoveContainer(imageName);
    }
}

export { createAndRunContainer, DockerContainerResult, checkDockerStatus, DockerStatus, stopAndRemoveContainer };

// Run the example if this file is executed directly
// if (require.main === module) {
//     main().catch(console.error);
// }