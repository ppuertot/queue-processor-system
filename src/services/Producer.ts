import config from '../config';
import logger from '../utils/logger';
import queueManager from '../queue/QueueManager';
import database from '../database/connection';
import { Task, TaskType, TaskPriority, ImageProcessingData, DataExportData, ApiIntegrationData, CleanupTasksData } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class Producer {
  private isRunning: boolean = false;
  private interval: NodeJS.Timeout | null = null;
  private taskCount: number = 0;

  async start(options: {
    interval?: number;
    maxTasks?: number;
    taskTypes?: TaskType[];
  } = {}): Promise<void> {
    try {
      logger.info('Starting producer...');

      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      const redisConnected = await queueManager.testConnection();
      if (!redisConnected) {
        throw new Error('Failed to connect to Redis');
      }

      this.isRunning = true;
      this.startProducing(options);

      logger.info('Producer started successfully', {
        interval: options.interval || 10000,
        maxTasks: options.maxTasks || -1,
        taskTypes: options.taskTypes || 'all'
      });

    } catch (error) {
      logger.error('Failed to start producer', error);
      throw error;
    }
  }

  private startProducing(options: {
    interval?: number;
    maxTasks?: number;
    taskTypes?: TaskType[];
  }): void {
    const interval = options.interval || 10000; // 10 seconds default
    const maxTasks = options.maxTasks || -1; // unlimited by default
    const allowedTaskTypes = options.taskTypes || [
      'email_notification',
      'image_processing',
      'file_processing',
      'data_export',
      'api_integration',
      'cleanup_tasks'
    ];

    console.log('🎯 TASK PRODUCER STARTED');
    console.log('─'.repeat(50));
    console.log(`📊 Configuration:`);
    console.log(`   • Interval: ${interval}ms`);
    console.log(`   • Max Tasks: ${maxTasks === -1 ? 'Unlimited' : maxTasks}`);
    console.log(`   • Task Types: ${allowedTaskTypes.join(', ')}`);
    console.log('─'.repeat(50));
    console.log('');

    this.interval = setInterval(async () => {
      if (!this.isRunning) return;

      if (maxTasks > 0 && this.taskCount >= maxTasks) {
        console.log(`✅ Maximum tasks reached (${maxTasks}). Stopping producer...`);
        await this.stop();
        return;
      }

      try {
        await this.generateRandomTask(allowedTaskTypes);
        this.taskCount++;
      } catch (error) {
        logger.error('Error generating task', error);
      }
    }, interval);

    this.generateRandomTask(allowedTaskTypes);
  }

  private async generateRandomTask(allowedTaskTypes: TaskType[]): Promise<void> {
    const taskType = allowedTaskTypes[Math.floor(Math.random() * allowedTaskTypes.length)];
    const priority = (Math.floor(Math.random() * 10) + 1) as TaskPriority;

    let task: Task;

    switch (taskType) {
      case 'email_notification':
        task = this.createEmailTask(priority);
        break;
      case 'image_processing':
        task = this.createImageTask(priority);
        break;
      case 'file_processing':
        task = this.createFileTask(priority);
        break;
      case 'data_export':
        task = this.createDataExportTask(priority);
        break;
      case 'api_integration':
        task = this.createApiTask(priority);
        break;
      case 'cleanup_tasks':
        task = this.createCleanupTask(priority);
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    try {
      const taskId = await queueManager.addTask(task);
      
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] 📝 Created ${taskType} task (ID: ${taskId.slice(0, 8)}..., Priority: ${priority})`);
      
    } catch (error) {
      logger.error('Error adding task to queue', error);
    }
  }

  private createEmailTask(priority: TaskPriority): Task {
    const templates = ['welcome', 'notification', 'reminder', 'newsletter', 'alert'];
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    const recipients = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
      `user${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`
    );

    return {
      id: uuidv4(),
      type: 'email_notification',
      priority,
      data: {
        to: recipients,
        subject: `Test Email ${Date.now()}`,
        body: `This is a test email generated at ${new Date().toISOString()}`,
        template: templates[Math.floor(Math.random() * templates.length)],
        attachments: Math.random() > 0.7 ? ['document.pdf'] : undefined
      },
      status: 'waiting',
      createdAt: new Date()
    };
  }

  private createImageTask(priority: TaskPriority): Task {
    const operations = [
      { type: 'resize', params: { width: 300, height: 300 } },
      { type: 'compress', params: { quality: 0.8 } },
      { type: 'filter', params: { type: 'blur', intensity: 0.5 } }
    ];

    const selectedOps = operations.slice(0, Math.floor(Math.random() * operations.length) + 1);

    return {
      id: uuidv4(),
      type: 'image_processing',
      priority,
      data: {
        imagePath: `/uploads/image-${Date.now()}.jpg`,
        operations: selectedOps,
        outputPath: `/processed/image-${Date.now()}-processed.jpg`
      } as ImageProcessingData,
      status: 'waiting',
      createdAt: new Date()
    };
  }

  private createFileTask(priority: TaskPriority): Task {
    const operations = ['parse', 'convert', 'validate', 'transform'];
    const formats = ['csv', 'json', 'xml', 'txt'];

    return {
      id: uuidv4(),
      type: 'file_processing',
      priority,
      data: {
        filePath: `/data/file-${Date.now()}.${formats[Math.floor(Math.random() * formats.length)]}`,
        operation: operations[Math.floor(Math.random() * operations.length)],
        params: {
          format: formats[Math.floor(Math.random() * formats.length)],
          encoding: 'utf-8'
        }
      },
      status: 'waiting',
      createdAt: new Date()
    };
  }

  private createDataExportTask(priority: TaskPriority): Task {
    const queries = [
      'SELECT * FROM users WHERE active = true',
      'SELECT * FROM orders WHERE created_at > NOW() - INTERVAL \'1 day\'',
      'SELECT COUNT(*) FROM sessions GROUP BY user_id',
      'SELECT * FROM products WHERE stock > 0'
    ];
    const formats = ['csv', 'json', 'xlsx'];

    return {
      id: uuidv4(),
      type: 'data_export',
      priority,
      data: {
        query: queries[Math.floor(Math.random() * queries.length)],
        format: formats[Math.floor(Math.random() * formats.length)] as 'csv' | 'json' | 'xlsx',
        destination: `/exports/export-${Date.now()}.${formats[Math.floor(Math.random() * formats.length)]}`
      } as DataExportData,
      status: 'waiting',
      createdAt: new Date()
    };
  }

  private createApiTask(priority: TaskPriority): Task {
    const endpoints = [
      'https://api.example.com/webhook',
      'https://service.test.com/notify',
      'https://external-api.demo.org/sync',
      'https://webhook.sample.io/events'
    ];
    const methods = ['GET', 'POST', 'PUT'];

    return {
      id: uuidv4(),
      type: 'api_integration',
      priority,
      data: {
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        method: methods[Math.floor(Math.random() * methods.length)] as 'GET' | 'POST' | 'PUT' | 'DELETE',
        headers: {
          'Authorization': `Bearer token-${Date.now()}`,
          'Content-Type': 'application/json'
        },
        payload: {
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          data: { test: true }
        }
      } as ApiIntegrationData,
      status: 'waiting',
      createdAt: new Date()
    };
  }

  private createCleanupTask(priority: TaskPriority): Task {
    const types = ['temp_files', 'old_logs', 'cache'];
    const paths = ['/tmp', '/var/log', '/cache', '/uploads/temp'];

    return {
      id: uuidv4(),
      type: 'cleanup_tasks',
      priority,
      data: {
        type: types[Math.floor(Math.random() * types.length)] as 'temp_files' | 'old_logs' | 'cache',
        params: {
          olderThan: `${Math.floor(Math.random() * 30) + 1}d`,
          path: paths[Math.floor(Math.random() * paths.length)]
        }
      } as CleanupTasksData,
      status: 'waiting',
      createdAt: new Date()
    };
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Producer is not running');
      return;
    }

    logger.info('Stopping producer...');
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    try {
      await database.close();
      
      console.log('');
      console.log('🎯 PRODUCER SUMMARY');
      console.log('─'.repeat(50));
      console.log(`📊 Total tasks created: ${this.taskCount}`);
      console.log('✅ Producer stopped successfully');
      
      logger.info('Producer stopped successfully', { totalTasksCreated: this.taskCount });
    } catch (error) {
      logger.error('Error stopping producer', error);
      throw error;
    }
  }

  getStats(): any {
    return {
      isRunning: this.isRunning,
      taskCount: this.taskCount,
      uptime: process.uptime()
    };
  }
}

export default new Producer();