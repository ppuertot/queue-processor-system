export type TaskType = 
  | 'email_notification'
  | 'image_processing'
  | 'file_processing'
  | 'data_export'
  | 'api_integration'
  | 'cleanup_tasks';

export type TaskStatus = 
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface BaseTaskData {
  [key: string]: any;
}

export interface EmailNotificationData extends BaseTaskData {
  to: string[];
  subject: string;
  body: string;
  template?: string;
  attachments?: string[];
}

export interface ImageProcessingData extends BaseTaskData {
  imagePath: string;
  operations: Array<{
    type: 'resize' | 'compress' | 'filter';
    params: Record<string, any>;
  }>;
  outputPath: string;
}

export interface FileProcessingData extends BaseTaskData {
  filePath: string;
  operation: string;
  params: Record<string, any>;
}

export interface DataExportData extends BaseTaskData {
  query: string;
  format: 'csv' | 'json' | 'xlsx';
  destination: string;
}

export interface ApiIntegrationData extends BaseTaskData {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: Record<string, any>;
}

export interface CleanupTasksData extends BaseTaskData {
  type: 'temp_files' | 'old_logs' | 'cache';
  params: Record<string, any>;
}

export type TaskData = 
  | EmailNotificationData
  | ImageProcessingData
  | FileProcessingData
  | DataExportData
  | ApiIntegrationData
  | CleanupTasksData;

export interface Task {
  id?: string;
  type: TaskType;
  priority: TaskPriority;
  data: TaskData;
  status?: TaskStatus;
  createdAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  attempts?: number;
  maxRetries?: number;
  progress?: number;
  result?: any;
  error?: string;
}

export interface QueueConfig {
  name: string;
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  backoffType: 'fixed' | 'exponential';
  removeOnComplete: number;
  removeOnFail: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface SystemMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  averageProcessingTime: number;
  throughput: number;
  successRate: number;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  maxConcurrentJobs: number;
  maxRetries: number;
  retryDelay: number;
  database: DatabaseConfig;
  redis: RedisConfig;
  queues: Record<TaskType, QueueConfig>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  attempts: number;
}