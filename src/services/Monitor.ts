import config from '../config';
import logger from '../utils/logger';
import queueManager from '../queue/QueueManager';
import database from '../database/connection';
import { taskModel } from '../database/models';
import { SystemMetrics, QueueStats, TaskType } from '../types';

export class Monitor {
  private isRunning: boolean = false;
  private interval: NodeJS.Timeout | null = null;
  private lastMetrics: SystemMetrics | null = null;

  async start(): Promise<void> {
    try {
      logger.info('Starting monitor...');

      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      const redisConnected = await queueManager.testConnection();
      if (!redisConnected) {
        throw new Error('Failed to connect to Redis');
      }

      this.isRunning = true;
      this.startMonitoring();

      logger.info('Monitor started successfully');

    } catch (error) {
      logger.error('Failed to start monitor', error);
      throw error;
    }
  }

  private startMonitoring(): void {
    this.displayHeader();
    
    this.interval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.collectAndDisplayMetrics();
      } catch (error) {
        logger.error('Error collecting metrics', error);
      }
    }, 5000); // Every 5 seconds

    this.collectAndDisplayMetrics();
  }

  private displayHeader(): void {
    console.clear();
    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        QUEUE PROCESSOR SYSTEM MONITOR                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  private async collectAndDisplayMetrics(): Promise<void> {
    try {
      const [dbMetrics, queueStats] = await Promise.all([
        taskModel.getMetrics(),
        queueManager.getAllQueueStats()
      ]);

      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      const systemMetrics: SystemMetrics = {
        totalTasks: dbMetrics.totalTasks,
        completedTasks: dbMetrics.completedTasks,
        failedTasks: dbMetrics.failedTasks,
        pendingTasks: dbMetrics.pendingTasks,
        averageProcessingTime: dbMetrics.averageProcessingTime,
        throughput: uptime > 0 ? dbMetrics.completedTasks / (uptime / 3600) : 0,
        successRate: dbMetrics.successRate,
        uptime,
        memoryUsage: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpuUsage: process.cpuUsage().user + process.cpuUsage().system
      };

      this.displayMetrics(systemMetrics, queueStats);
      this.lastMetrics = systemMetrics;

    } catch (error) {
      console.log(`❌ Error collecting metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private displayMetrics(metrics: SystemMetrics, queueStats: Record<TaskType, QueueStats>): void {
    const timestamp = new Date().toLocaleString();
    
    console.clear();
    this.displayHeader();

    console.log(`📊 SYSTEM OVERVIEW - ${timestamp}`);
    console.log('─'.repeat(80));
    console.log(`🕐 Uptime: ${this.formatUptime(metrics.uptime)}`);
    console.log(`💾 Memory: ${this.formatBytes(metrics.memoryUsage.used)} / ${this.formatBytes(metrics.memoryUsage.total)} (${metrics.memoryUsage.percentage}%)`);
    console.log(`⚡ Throughput: ${metrics.throughput.toFixed(2)} tasks/hour`);
    console.log(`✅ Success Rate: ${metrics.successRate.toFixed(1)}%`);
    console.log(`⏱️  Avg Processing Time: ${metrics.averageProcessingTime.toFixed(2)}s`);
    console.log('');

    console.log('📈 TASK STATISTICS');
    console.log('─'.repeat(80));
    console.log(`📊 Total Tasks: ${metrics.totalTasks.toLocaleString()}`);
    console.log(`✅ Completed: ${metrics.completedTasks.toLocaleString()}`);
    console.log(`❌ Failed: ${metrics.failedTasks.toLocaleString()}`);
    console.log(`⏳ Pending: ${metrics.pendingTasks.toLocaleString()}`);
    console.log('');

    console.log('🔄 QUEUE STATUS');
    console.log('─'.repeat(80));
    console.log('Queue Type           │ Wait │ Active │ Complete │ Failed │ Delayed │ Paused');
    console.log('─'.repeat(80));

    Object.entries(queueStats).forEach(([queueType, stats]) => {
      const name = queueType.padEnd(19);
      const waiting = stats.waiting.toString().padStart(4);
      const active = stats.active.toString().padStart(6);
      const completed = stats.completed.toString().padStart(8);
      const failed = stats.failed.toString().padStart(6);
      const delayed = stats.delayed.toString().padStart(7);
      const paused = stats.paused.toString().padStart(6);

      const statusIcon = this.getQueueStatusIcon(stats);
      console.log(`${statusIcon} ${name} │ ${waiting} │ ${active} │ ${completed} │ ${failed} │ ${delayed} │ ${paused}`);
    });

    console.log('');
    console.log('🔧 SYSTEM HEALTH');
    console.log('─'.repeat(80));
    
    const healthStatus = this.calculateHealthStatus(metrics, queueStats);
    const healthIcon = healthStatus.overall === 'healthy' ? '🟢' : 
                      healthStatus.overall === 'warning' ? '🟡' : '🔴';
    
    console.log(`${healthIcon} Overall Status: ${healthStatus.overall.toUpperCase()}`);
    
    if (healthStatus.issues.length > 0) {
      console.log('⚠️  Issues:');
      healthStatus.issues.forEach(issue => console.log(`   • ${issue}`));
    }

    console.log('');
    console.log('💡 PERFORMANCE INDICATORS');
    console.log('─'.repeat(80));
    
    if (this.lastMetrics) {
      const taskDelta = metrics.completedTasks - this.lastMetrics.completedTasks;
      const taskTrend = taskDelta > 0 ? '📈' : taskDelta < 0 ? '📉' : '➡️';
      console.log(`${taskTrend} Tasks processed since last update: ${taskDelta}`);
      
      const memoryTrend = metrics.memoryUsage.percentage > this.lastMetrics.memoryUsage.percentage ? '📈' : '📉';
      console.log(`${memoryTrend} Memory usage trend: ${metrics.memoryUsage.percentage - this.lastMetrics.memoryUsage.percentage > 0 ? '+' : ''}${(metrics.memoryUsage.percentage - this.lastMetrics.memoryUsage.percentage).toFixed(1)}%`);
    }

    console.log('');
    console.log('Press Ctrl+C to stop monitoring');
  }

  private getQueueStatusIcon(stats: QueueStats): string {
    if (stats.failed > 0) return '🔴';
    if (stats.active > 0) return '🟢';
    if (stats.waiting > 0) return '🟡';
    return '⚪';
  }

  private calculateHealthStatus(metrics: SystemMetrics, queueStats: Record<TaskType, QueueStats>): {
    overall: 'healthy' | 'warning' | 'critical',
    issues: string[]
  } {
    const issues: string[] = [];
    let severity = 'healthy';

    if (metrics.memoryUsage.percentage > 90) {
      issues.push('High memory usage (>90%)');
      severity = 'critical';
    } else if (metrics.memoryUsage.percentage > 80) {
      issues.push('Elevated memory usage (>80%)');
      if (severity === 'healthy') severity = 'warning';
    }

    if (metrics.successRate < 90) {
      issues.push(`Low success rate (${metrics.successRate.toFixed(1)}%)`);
      severity = 'critical';
    } else if (metrics.successRate < 95) {
      issues.push(`Moderate success rate (${metrics.successRate.toFixed(1)}%)`);
      if (severity === 'healthy') severity = 'warning';
    }

    const totalFailed = Object.values(queueStats).reduce((sum, stats) => sum + stats.failed, 0);
    if (totalFailed > 100) {
      issues.push(`High number of failed jobs (${totalFailed})`);
      severity = 'critical';
    } else if (totalFailed > 50) {
      issues.push(`Moderate number of failed jobs (${totalFailed})`);
      if (severity === 'healthy') severity = 'warning';
    }

    const totalActive = Object.values(queueStats).reduce((sum, stats) => sum + stats.active, 0);
    const totalWaiting = Object.values(queueStats).reduce((sum, stats) => sum + stats.waiting, 0);
    
    if (totalWaiting > 1000) {
      issues.push(`High queue backlog (${totalWaiting} waiting)`);
      if (severity === 'healthy') severity = 'warning';
    }

    return { overall: severity as any, issues };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Monitor is not running');
      return;
    }

    logger.info('Stopping monitor...');
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    try {
      await database.close();
      logger.info('Monitor stopped successfully');
    } catch (error) {
      logger.error('Error stopping monitor', error);
      throw error;
    }
  }
}

export default new Monitor();