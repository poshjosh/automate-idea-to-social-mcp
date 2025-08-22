// Define types for agent configurations and tasks
export interface AgentConfig {
    'agent-type'?: string;
    'agent-tags'?: string;
    'sort-order'?: number;
    stages?: Record<string, any>;
}

export interface TaskConfig {
    tag?: string;
    agents: string[];
    'language-codes'?: string;
    'text-file'?: string;
    'text-title'?: string;
    'text-content'?: string;
    'image-file-landscape'?: string;
    'image-file-square'?: string;
    'share-cover-image'?: boolean;
}

export interface Task {
    id: string,
    agents: string[],
    links: Record<string, any>,
    progress: Record<string, any>,
    status: TaskStatus,
}

export const TaskStatuses = {
    PENDING: 'PENDING',
    SKIPPED: 'SKIPPED',
    LOADING: 'LOADING',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    STOPPED: 'STOPPED'
} as const;

export type TaskStatus = (typeof TaskStatuses)[keyof typeof TaskStatuses];

