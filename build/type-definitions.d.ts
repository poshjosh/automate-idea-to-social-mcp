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
export declare const TaskStates: {
    readonly PENDING: "PENDING";
    readonly SKIPPED: "SKIPPED";
    readonly LOADING: "LOADING";
    readonly RUNNING: "RUNNING";
    readonly SUCCESS: "SUCCESS";
    readonly FAILURE: "FAILURE";
    readonly STOPPED: "STOPPED";
};
export type TaskState = (typeof TaskStates)[keyof typeof TaskStates];
//# sourceMappingURL=type-definitions.d.ts.map