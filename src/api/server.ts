import express from 'express';
import cors from 'cors';
import config from '../config';
import logger from '../utils/logger';
import routes from './routes';
import database from '../database/connection';

export class ApiServer {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      logger.info('API Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    this.app.use('/api', routes);

    this.app.get('/', (req, res) => {
      res.json({
        service: 'Queue Processor System',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          tasks: '/api/tasks',
          stats: '/api/stats',
          admin: '/api/admin'
        }
      });
    });

    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled API error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        error: 'Internal server error',
        message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
      });
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at Promise', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception thrown', error);
      process.exit(1);
    });
  }

  async start(): Promise<void> {
    try {
      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      this.server = this.app.listen(config.port, () => {
        logger.info(`API Server started on port ${config.port}`, {
          environment: config.nodeEnv,
          port: config.port
        });
      });

      this.server.on('error', (error: Error) => {
        logger.error('Server error', error);
      });

    } catch (error) {
      logger.error('Failed to start API server', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

export default new ApiServer();