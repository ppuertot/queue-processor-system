import database from './connection';
import logger from '../utils/logger';
import { Task, TaskStatus, TaskType, TaskResult } from '../types';

export class TaskModel {
  async createTask(task: Task): Promise<string> {
    const query = `
      INSERT INTO tasks (id, type, priority, data, status, created_at, max_retries)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const values = [
      task.id,
      task.type,
      task.priority,
      JSON.stringify(task.data),
      task.status || 'waiting',
      task.createdAt || new Date(),
      task.maxRetries || 3
    ];

    try {
      const result = await database.query(query, values);
      logger.info('Task created in database', { taskId: task.id, type: task.type });
      return result.rows[0].id;
    } catch (error) {
      logger.error('Error creating task in database', { error, taskId: task.id });
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, additionalData?: Partial<Task>): Promise<void> {
    let query = 'UPDATE tasks SET status = $1, updated_at = $2';
    const values: any[] = [status, new Date()];
    let paramIndex = 3;

    if (additionalData?.startedAt) {
      query += `, started_at = $${paramIndex}`;
      values.push(additionalData.startedAt);
      paramIndex++;
    }

    if (additionalData?.completedAt) {
      query += `, completed_at = $${paramIndex}`;
      values.push(additionalData.completedAt);
      paramIndex++;
    }

    if (additionalData?.failedAt) {
      query += `, failed_at = $${paramIndex}`;
      values.push(additionalData.failedAt);
      paramIndex++;
    }

    if (additionalData?.attempts !== undefined) {
      query += `, attempts = $${paramIndex}`;
      values.push(additionalData.attempts);
      paramIndex++;
    }

    if (additionalData?.progress !== undefined) {
      query += `, progress = $${paramIndex}`;
      values.push(additionalData.progress);
      paramIndex++;
    }

    if (additionalData?.result !== undefined) {
      query += `, result = $${paramIndex}`;
      values.push(JSON.stringify(additionalData.result));
      paramIndex++;
    }

    if (additionalData?.error) {
      query += `, error = $${paramIndex}`;
      values.push(additionalData.error);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex}`;
    values.push(taskId);

    try {
      await database.query(query, values);
      logger.debug('Task status updated', { taskId, status });
    } catch (error) {
      logger.error('Error updating task status', { error, taskId, status });
      throw error;
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    
    try {
      const result = await database.query(query, [taskId]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        type: row.type,
        priority: row.priority,
        data: JSON.parse(row.data),
        status: row.status,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        failedAt: row.failed_at,
        attempts: row.attempts,
        maxRetries: row.max_retries,
        progress: row.progress,
        result: row.result ? JSON.parse(row.result) : null,
        error: row.error
      };
    } catch (error) {
      logger.error('Error fetching task', { error, taskId });
      throw error;
    }
  }

  async getTasksByStatus(status: TaskStatus, limit: number = 100): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE status = $1 ORDER BY created_at DESC LIMIT $2';
    
    try {
      const result = await database.query(query, [status, limit]);
      return result.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        priority: row.priority,
        data: JSON.parse(row.data),
        status: row.status,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        failedAt: row.failed_at,
        attempts: row.attempts,
        maxRetries: row.max_retries,
        progress: row.progress,
        result: row.result ? JSON.parse(row.result) : null,
        error: row.error
      }));
    } catch (error) {
      logger.error('Error fetching tasks by status', { error, status });
      throw error;
    }
  }

  async getTaskStats(): Promise<Record<TaskStatus, number>> {
    const query = `
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
    `;

    try {
      const result = await database.query(query);
      const stats: Record<TaskStatus, number> = {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      };

      result.rows.forEach((row: any) => {
        stats[row.status as TaskStatus] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      logger.error('Error fetching task stats', { error });
      throw error;
    }
  }

  async saveTaskResult(result: TaskResult): Promise<void> {
    const query = `
      INSERT INTO task_results (task_id, success, data, error, duration, attempts, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [
      result.taskId,
      result.success,
      result.data ? JSON.stringify(result.data) : null,
      result.error,
      result.duration,
      result.attempts,
      new Date()
    ];

    try {
      await database.query(query, values);
      logger.debug('Task result saved', { taskId: result.taskId });
    } catch (error) {
      logger.error('Error saving task result', { error, taskId: result.taskId });
      throw error;
    }
  }

  async getMetrics(): Promise<any> {
    const queries = {
      totalTasks: 'SELECT COUNT(*) as count FROM tasks',
      completedTasks: 'SELECT COUNT(*) as count FROM tasks WHERE status = \'completed\'',
      failedTasks: 'SELECT COUNT(*) as count FROM tasks WHERE status = \'failed\'',
      pendingTasks: 'SELECT COUNT(*) as count FROM tasks WHERE status IN (\'waiting\', \'active\', \'delayed\')',
      averageProcessingTime: `
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_time
        FROM tasks 
        WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
      `,
      successRate: `
        SELECT 
          CASE 
            WHEN COUNT(*) = 0 THEN 0 
            ELSE (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*))
          END as success_rate
        FROM tasks 
        WHERE status IN ('completed', 'failed')
      `
    };

    try {
      const results = await Promise.all([
        database.query(queries.totalTasks),
        database.query(queries.completedTasks),
        database.query(queries.failedTasks),
        database.query(queries.pendingTasks),
        database.query(queries.averageProcessingTime),
        database.query(queries.successRate)
      ]);

      return {
        totalTasks: parseInt(results[0].rows[0].count),
        completedTasks: parseInt(results[1].rows[0].count),
        failedTasks: parseInt(results[2].rows[0].count),
        pendingTasks: parseInt(results[3].rows[0].count),
        averageProcessingTime: parseFloat(results[4].rows[0].avg_time) || 0,
        successRate: parseFloat(results[5].rows[0].success_rate) || 0
      };
    } catch (error) {
      logger.error('Error fetching metrics', { error });
      throw error;
    }
  }
}

export const taskModel = new TaskModel();