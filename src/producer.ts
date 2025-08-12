import logger from './utils/logger';
import producer from './services/Producer';
import config from './config';

async function startProducer(): Promise<void> {
  try {
    logger.info('Starting Queue Processor Producer...', {
      nodeEnv: config.nodeEnv
    });

    const options = {
      interval: parseInt(process.env.PRODUCER_INTERVAL || '10000'),
      maxTasks: parseInt(process.env.PRODUCER_MAX_TASKS || '-1'),
      taskTypes: process.env.PRODUCER_TASK_TYPES ? 
        process.env.PRODUCER_TASK_TYPES.split(',') as any[] : undefined
    };

    const finalOptions: any = { ...options };
    if (finalOptions.maxTasks === -1) {
      delete finalOptions.maxTasks;
    }

    await producer.start(finalOptions);

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down producer gracefully...');
      try {
        await producer.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down producer gracefully...');
      try {
        await producer.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start producer', error);
    process.exit(1);
  }
}

startProducer();