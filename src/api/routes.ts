import express from 'express';
import { taskModel } from '../database/models';
import queueManager from '../queue/QueueManager';
import logger from '../utils/logger';
import { Task, TaskType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.post('/tasks', async (req, res) => {
  try {
    const { type, priority = 5, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        error: 'Missing required fields: type and data'
      });
    }

    if (!['email_notification', 'image_processing', 'file_processing', 'data_export', 'api_integration', 'cleanup_tasks'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid task type'
      });
    }

    if (priority < 1 || priority > 10) {
      return res.status(400).json({
        error: 'Priority must be between 1 and 10'
      });
    }

    const task: Task = {
      id: uuidv4(),
      type: type as TaskType,
      priority,
      data,
      status: 'waiting',
      createdAt: new Date()
    };

    const taskId = await queueManager.addTask(task);

    logger.info('Task created via API', {
      taskId,
      taskType: type,
      priority
    });

    res.status(201).json({
      taskId,
      message: 'Task created successfully'
    });
  } catch (error) {
    logger.error('Error creating task via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await taskModel.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    res.json(task);
  } catch (error) {
    logger.error('Error fetching task via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.get('/stats/queues', async (req, res) => {
  try {
    const queueStats = await queueManager.getAllQueueStats();
    res.json(queueStats);
  } catch (error) {
    logger.error('Error fetching queue stats via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.get('/stats/system', async (req, res) => {
  try {
    const [dbMetrics, queueStats] = await Promise.all([
      taskModel.getMetrics(),
      queueManager.getAllQueueStats()
    ]);

    const totalQueueTasks = Object.values(queueStats).reduce((total, stats) => {
      return total + stats.waiting + stats.active + stats.delayed;
    }, 0);

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const systemMetrics = {
      ...dbMetrics,
      uptime,
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpuUsage: process.cpuUsage(),
      throughput: dbMetrics.completedTasks / (uptime / 3600), // tasks per hour
      queueStats
    };

    res.json(systemMetrics);
  } catch (error) {
    logger.error('Error fetching system stats via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/admin/queues/:taskType/pause', async (req, res) => {
  try {
    const { taskType } = req.params;

    if (!['email_notification', 'image_processing', 'file_processing', 'data_export', 'api_integration', 'cleanup_tasks'].includes(taskType)) {
      return res.status(400).json({
        error: 'Invalid task type'
      });
    }

    await queueManager.pauseQueue(taskType as TaskType);

    logger.info('Queue paused via API', { taskType });

    res.json({
      message: `Queue ${taskType} paused successfully`
    });
  } catch (error) {
    logger.error('Error pausing queue via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/admin/queues/:taskType/resume', async (req, res) => {
  try {
    const { taskType } = req.params;

    if (!['email_notification', 'image_processing', 'file_processing', 'data_export', 'api_integration', 'cleanup_tasks'].includes(taskType)) {
      return res.status(400).json({
        error: 'Invalid task type'
      });
    }

    await queueManager.resumeQueue(taskType as TaskType);

    logger.info('Queue resumed via API', { taskType });

    res.json({
      message: `Queue ${taskType} resumed successfully`
    });
  } catch (error) {
    logger.error('Error resuming queue via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/admin/retry-failed', async (req, res) => {
  try {
    const { taskType } = req.body;

    if (taskType && !['email_notification', 'image_processing', 'file_processing', 'data_export', 'api_integration', 'cleanup_tasks'].includes(taskType)) {
      return res.status(400).json({
        error: 'Invalid task type'
      });
    }

    const retriedCount = await queueManager.retryFailedJobs(taskType as TaskType);

    logger.info('Failed jobs retried via API', { taskType, retriedCount });

    res.json({
      message: `${retriedCount} failed jobs retried successfully`,
      retriedCount
    });
  } catch (error) {
    logger.error('Error retrying failed jobs via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/demo/create-sample-tasks', async (req, res) => {
  try {
    const sampleTasks: Task[] = [
      {
        type: 'email_notification',
        priority: 8,
        data: {
          to: ['user@example.com', 'admin@example.com'],
          subject: 'Welcome to our service',
          body: 'Thank you for joining our platform!',
          template: 'welcome'
        }
      },
      {
        type: 'image_processing',
        priority: 6,
        data: {
          imagePath: '/uploads/sample-image.jpg',
          operations: [
            { type: 'resize', params: { width: 300, height: 300 } },
            { type: 'compress', params: { quality: 0.8 } }
          ],
          outputPath: '/processed/sample-image-thumb.jpg'
        }
      },
      {
        type: 'file_processing',
        priority: 5,
        data: {
          filePath: '/data/sample-data.csv',
          operation: 'parse',
          params: { format: 'csv', delimiter: ',' }
        }
      },
      {
        type: 'data_export',
        priority: 3,
        data: {
          query: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL \'7 days\'',
          format: 'csv',
          destination: '/exports/recent-users.csv'
        }
      },
      {
        type: 'api_integration',
        priority: 7,
        data: {
          endpoint: 'https://api.example.com/webhook',
          method: 'POST',
          headers: { 'Authorization': 'Bearer sample-token' },
          payload: { event: 'user_registered', userId: '12345' }
        }
      },
      {
        type: 'cleanup_tasks',
        priority: 2,
        data: {
          type: 'temp_files',
          params: { olderThan: '7d', path: '/tmp' }
        }
      }
    ];

    const taskIds: string[] = [];

    for (const task of sampleTasks) {
      const taskId = await queueManager.addTask({
        ...task,
        id: uuidv4(),
        status: 'waiting',
        createdAt: new Date()
      });
      taskIds.push(taskId);
    }

    logger.info('Sample tasks created via API', { taskIds });

    res.json({
      message: 'Sample tasks created successfully',
      taskIds,
      count: taskIds.length
    });
  } catch (error) {
    logger.error('Error creating sample tasks via API', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;