import logger from './utils/logger';
import worker from './services/Worker';
import config from './config';

async function startWorker(): Promise<void> {
  try {
    logger.info('Starting Queue Processor Worker...', {
      nodeEnv: config.nodeEnv,
      queues: Object.keys(config.queues)
    });

    await worker.start();

    logger.info('🚀 Queue Processor Worker is running!', {
      environment: config.nodeEnv,
      queues: Object.keys(config.queues).length
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down worker gracefully...');
      try {
        await worker.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down worker gracefully...');
      try {
        await worker.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start worker', error);
    process.exit(1);
  }
}

startWorker();