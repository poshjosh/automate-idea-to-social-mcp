// Define types for agent configurations and tasks
export interface AgentConfig {
    'agent-type': string;
    'agent-tags': string;
    'sort-order'?: number;
    stages: Record<string, any>;
}

export interface TaskConfig {
    agents: string[];
    'language-codes': string;
    'text-file'?: string;
    'text-title'?: string;
    'text-content'?: string;
    'image-file-landscape'?: string;
    'image-file-square'?: string;
    'share-cover-image'?: boolean;
}

export interface TaskStatus {
    id: string;
    status: TaskState;
    agents: string[];
    startTime?: string;
    endTime?: string;
    results?: any;
    error?: string;
}

export const TaskStates = {
    PENDING: 'PENDING',
    SKIPPED: 'SKIPPED',
    LOADING: 'LOADING',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    STOPPED: 'STOPPED'
} as const;

export type TaskState = (typeof TaskStates)[keyof typeof TaskStates];

