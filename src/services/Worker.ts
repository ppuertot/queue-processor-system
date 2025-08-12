import Bull from 'bull';
import config from '../config';
import logger from '../utils/logger';
import queueManager from '../queue/QueueManager';
import taskProcessor from '../queue/TaskProcessor';
import database from '../database/connection';
import { TaskType } from '../types';

export class Worker {
  private isRunning: boolean = false;
  private queues: Map<TaskType, Bull.Queue> = new Map();

  constructor() {
    this.setupGracefulShutdown();
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting worker...');

      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      const redisConnected = await queueManager.testConnection();
      if (!redisConnected) {
        throw new Error('Failed to connect to Redis');
      }

      this.setupQueueProcessors();
      this.isRunning = true;

      logger.info('Worker started successfully', {
        queues: Object.keys(config.queues),
        nodeEnv: config.nodeEnv
      });

      this.startHealthCheck();

    } catch (error) {
      logger.error('Failed to start worker', error);
      throw error;
    }
  }

  private setupQueueProcessors(): void {
    Object.keys(config.queues).forEach((taskType) => {
      const queueConfig = config.queues[taskType as TaskType];
      const queue = queueManager.getQueue(taskType as TaskType);

      if (!queue) {
        logger.error(`Queue not found for task type: ${taskType}`);
        return;
      }

      this.queues.set(taskType as TaskType, queue);

      queue.process(queueConfig.concurrency, async (job: Bull.Job) => {
        const startTime = Date.now();
        
        try {
          logger.info(`Processing job ${job.id} of type ${taskType}`, {
            jobId: job.id,
            taskType,
            priority: job.opts.priority,
            attempts: job.attemptsMade + 1
          });

          let result;
          switch (taskType as TaskType) {
            case 'email_notification':
              result = await taskProcessor.processEmailNotification(job);
              break;
            case 'image_processing':
              result = await taskProcessor.processImageProcessing(job);
              break;
            case 'file_processing':
              result = await taskProcessor.processFileProcessing(job);
              break;
            case 'data_export':
              result = await taskProcessor.processDataExport(job);
              break;
            case 'api_integration':
              result = await taskProcessor.processApiIntegration(job);
              break;
            case 'cleanup_tasks':
              result = await taskProcessor.processCleanupTasks(job);
              break;
            default:
              throw new Error(`Unknown task type: ${taskType}`);
          }

          const duration = Date.now() - startTime;
          logger.info(`Job ${job.id} completed successfully`, {
            jobId: job.id,
            taskType,
            duration,
            result: result.success
          });

          return result;

        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Job ${job.id} failed`, {
            jobId: job.id,
            taskType,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: job.attemptsMade + 1
          });
          throw error;
        }
      });

      logger.info(`Queue processor setup for ${taskType}`, {
        concurrency: queueConfig.concurrency,
        maxRetries: queueConfig.maxRetries
      });
    });
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const queueStats = await queueManager.getAllQueueStats();
        const memoryUsage = process.memoryUsage();

        logger.debug('Worker health check', {
          uptime: process.uptime(),
          memoryUsage: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
          },
          activeJobs: Object.values(queueStats).reduce((total, stats) => total + stats.active, 0),
          waitingJobs: Object.values(queueStats).reduce((total, stats) => total + stats.waiting, 0)
        });

      } catch (error) {
        logger.error('Health check failed', error);
      }
    }, 30000); // Every 30 seconds
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Worker is not running');
      return;
    }

    logger.info('Stopping worker...');
    this.isRunning = false;

    try {
      for (const [taskType, queue] of this.queues) {
        logger.info(`Closing queue ${taskType}...`);
        await queue.close();
      }

      await queueManager.cleanQueues(true);
      await database.close();

      logger.info('Worker stopped successfully');
    } catch (error) {
      logger.error('Error stopping worker', error);
      throw error;
    }
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      queues: Array.from(this.queues.keys()),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid
    };
  }
}

export default new Worker();