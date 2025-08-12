import Bull from 'bull';
import { createClient } from 'redis';
import config from '../config';
import logger from '../utils/logger';
import { Task, TaskType, QueueStats } from '../types';
import { taskModel } from '../database/models';
import { v4 as uuidv4 } from 'uuid';

export class QueueManager {
  private queues: Map<TaskType, Bull.Queue> = new Map();
  private redisClient: any;

  constructor() {
    this.redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password,
      database: config.redis.db
    });

    this.redisClient.on('error', (err: any) => {
      logger.error('Redis client error', err);
    });

    this.redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    this.initializeQueues();
  }

  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db
      }
    };

    Object.keys(config.queues).forEach((taskType) => {
      const queueConfig = config.queues[taskType as TaskType];
      const queue = new Bull(queueConfig.name, redisConfig);

      queue.on('error', (error) => {
        logger.error(`Queue ${queueConfig.name} error`, error);
      });

      queue.on('waiting', (jobId) => {
        logger.debug(`Job ${jobId} waiting in queue ${queueConfig.name}`);
      });

      queue.on('active', (job) => {
        logger.info(`Job ${job.id} started processing in queue ${queueConfig.name}`, {
          jobId: job.id,
          taskType: job.data.type,
          priority: job.data.priority
        });
      });

      queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} completed in queue ${queueConfig.name}`, {
          jobId: job.id,
          taskType: job.data.type,
          result
        });
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} failed in queue ${queueConfig.name}`, {
          jobId: job.id,
          taskType: job.data.type,
          error: err.message,
          attempts: job.attemptsMade
        });
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled in queue ${queueConfig.name}`, {
          jobId: job.id,
          taskType: job.data.type
        });
      });

      this.queues.set(taskType as TaskType, queue);
      logger.info(`Queue ${queueConfig.name} initialized`);
    });
  }

  async addTask(task: Task): Promise<string> {
    const taskId = task.id || uuidv4();
    const taskWithId = { ...task, id: taskId };

    try {
      await taskModel.createTask(taskWithId);

      const queue = this.queues.get(task.type);
      if (!queue) {
        throw new Error(`Queue not found for task type: ${task.type}`);
      }

      const queueConfig = config.queues[task.type];
      const jobOptions: Bull.JobOptions = {
        priority: task.priority,
        attempts: queueConfig.maxRetries,
        backoff: {
          type: queueConfig.backoffType,
          delay: queueConfig.retryDelay
        },
        removeOnComplete: queueConfig.removeOnComplete,
        removeOnFail: queueConfig.removeOnFail
      };

      const job = await queue.add(taskWithId, jobOptions);
      
      logger.info('Task added to queue', {
        taskId,
        taskType: task.type,
        jobId: job.id,
        priority: task.priority
      });

      return taskId;
    } catch (error) {
      logger.error('Error adding task to queue', { error, taskId, taskType: task.type });
      throw error;
    }
  }

  async getQueueStats(taskType: TaskType): Promise<QueueStats> {
    const queue = this.queues.get(taskType);
    if (!queue) {
      throw new Error(`Queue not found for task type: ${taskType}`);
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: 0 // Bull doesn't have a direct getPaused method
      };
    } catch (error) {
      logger.error('Error getting queue stats', { error, taskType });
      throw error;
    }
  }

  async getAllQueueStats(): Promise<Record<TaskType, QueueStats>> {
    const stats: Partial<Record<TaskType, QueueStats>> = {};

    for (const taskType of this.queues.keys()) {
      try {
        stats[taskType] = await this.getQueueStats(taskType);
      } catch (error) {
        logger.error(`Error getting stats for queue ${taskType}`, error);
        stats[taskType] = {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0
        };
      }
    }

    return stats as Record<TaskType, QueueStats>;
  }

  async pauseQueue(taskType: TaskType): Promise<void> {
    const queue = this.queues.get(taskType);
    if (!queue) {
      throw new Error(`Queue not found for task type: ${taskType}`);
    }

    try {
      await queue.pause();
      logger.info(`Queue ${taskType} paused`);
    } catch (error) {
      logger.error(`Error pausing queue ${taskType}`, error);
      throw error;
    }
  }

  async resumeQueue(taskType: TaskType): Promise<void> {
    const queue = this.queues.get(taskType);
    if (!queue) {
      throw new Error(`Queue not found for task type: ${taskType}`);
    }

    try {
      await queue.resume();
      logger.info(`Queue ${taskType} resumed`);
    } catch (error) {
      logger.error(`Error resuming queue ${taskType}`, error);
      throw error;
    }
  }

  async retryFailedJobs(taskType?: TaskType): Promise<number> {
    let retriedCount = 0;

    const queuesToProcess = taskType ? [taskType] : Array.from(this.queues.keys());

    for (const queueType of queuesToProcess) {
      const queue = this.queues.get(queueType);
      if (!queue) continue;

      try {
        const failedJobs = await queue.getFailed();
        
        for (const job of failedJobs) {
          await job.retry();
          retriedCount++;
        }

        logger.info(`Retried ${failedJobs.length} failed jobs in queue ${queueType}`);
      } catch (error) {
        logger.error(`Error retrying failed jobs in queue ${queueType}`, error);
      }
    }

    return retriedCount;
  }

  async cleanQueues(graceful: boolean = true): Promise<void> {
    try {
      for (const [taskType, queue] of this.queues) {
        if (graceful) {
          await queue.close();
        } else {
          await queue.close(true);
        }
        logger.info(`Queue ${taskType} closed`);
      }

      await this.redisClient.quit();
      logger.info('All queues closed and Redis connection closed');
    } catch (error) {
      logger.error('Error closing queues', error);
      throw error;
    }
  }

  getQueue(taskType: TaskType): Bull.Queue | undefined {
    return this.queues.get(taskType);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.redisClient.connect();
      await this.redisClient.ping();
      logger.info('Redis connection test successful');
      return true;
    } catch (error) {
      logger.error('Redis connection test failed', error);
      return false;
    }
  }
}

export default new QueueManager();