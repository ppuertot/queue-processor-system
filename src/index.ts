import logger from './utils/logger';
import apiServer from './api/server';
import config from './config';

async function startServer(): Promise<void> {
  try {
    logger.info('Starting Queue Processor System API Server...', {
      nodeEnv: config.nodeEnv,
      port: config.port
    });

    await apiServer.start();

    logger.info('🚀 Queue Processor System API Server is running!', {
      port: config.port,
      environment: config.nodeEnv
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  try {
    await apiServer.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  try {
    await apiServer.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
});

startServer();