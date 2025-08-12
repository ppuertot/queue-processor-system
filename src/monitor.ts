import logger from './utils/logger';
import monitor from './services/Monitor';
import config from './config';

async function startMonitor(): Promise<void> {
  try {
    logger.info('Starting Queue Processor Monitor...', {
      nodeEnv: config.nodeEnv
    });

    await monitor.start();

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down monitor gracefully...');
      try {
        await monitor.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down monitor gracefully...');
      try {
        await monitor.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start monitor', error);
    process.exit(1);
  }
}

startMonitor();