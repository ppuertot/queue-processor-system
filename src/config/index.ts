import dotenv from 'dotenv';
import { AppConfig, TaskType } from '../types';

dotenv.config();

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'queue_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  
  queues: {
    email_notification: {
      name: 'email_notification',
      concurrency: parseInt(process.env.EMAIL_CONCURRENCY || '3', 10),
      maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '5000', 10),
      backoffType: 'exponential',
      removeOnComplete: 100,
      removeOnFail: 50
    },
    image_processing: {
      name: 'image_processing',
      concurrency: parseInt(process.env.IMAGE_CONCURRENCY || '2', 10),
      maxRetries: parseInt(process.env.IMAGE_MAX_RETRIES || '2', 10),
      retryDelay: parseInt(process.env.IMAGE_RETRY_DELAY || '10000', 10),
      backoffType: 'exponential',
      removeOnComplete: 50,
      removeOnFail: 25
    },
    file_processing: {
      name: 'file_processing',
      concurrency: parseInt(process.env.FILE_CONCURRENCY || '3', 10),
      maxRetries: parseInt(process.env.FILE_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.FILE_RETRY_DELAY || '5000', 10),
      backoffType: 'fixed',
      removeOnComplete: 100,
      removeOnFail: 50
    },
    data_export: {
      name: 'data_export',
      concurrency: parseInt(process.env.EXPORT_CONCURRENCY || '1', 10),
      maxRetries: parseInt(process.env.EXPORT_MAX_RETRIES || '2', 10),
      retryDelay: parseInt(process.env.EXPORT_RETRY_DELAY || '15000', 10),
      backoffType: 'exponential',
      removeOnComplete: 25,
      removeOnFail: 25
    },
    api_integration: {
      name: 'api_integration',
      concurrency: parseInt(process.env.API_CONCURRENCY || '5', 10),
      maxRetries: parseInt(process.env.API_MAX_RETRIES || '5', 10),
      retryDelay: parseInt(process.env.API_RETRY_DELAY || '3000', 10),
      backoffType: 'exponential',
      removeOnComplete: 200,
      removeOnFail: 100
    },
    cleanup_tasks: {
      name: 'cleanup_tasks',
      concurrency: parseInt(process.env.CLEANUP_CONCURRENCY || '1', 10),
      maxRetries: parseInt(process.env.CLEANUP_MAX_RETRIES || '1', 10),
      retryDelay: parseInt(process.env.CLEANUP_RETRY_DELAY || '60000', 10),
      backoffType: 'fixed',
      removeOnComplete: 10,
      removeOnFail: 10
    }
  }
};

export default config;