import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { exec } from 'child_process';

const openBrowser = (url: string) => {
  const platform = process.platform;
  const cmd =
    platform === 'win32' ? `start ${url}` :
    platform === 'darwin' ? `open ${url}` :
    `xdg-open ${url}`;
  exec(cmd);
};

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const server = app.listen(env.PORT, () => {
      const swaggerUrl = `http://localhost:${env.PORT}/api-docs`;
      console.log(`🚀 Library Management API running on port ${env.PORT}`);
      console.log(`📖 Environment: ${env.NODE_ENV}`);
      console.log(`🤖 AI Service: ${env.AI_SERVICE_URL}`);
      console.log(`📋 Swagger UI: ${swaggerUrl}`);

      // Tự động mở Swagger UI khi chạy dev
      if (env.NODE_ENV === 'development') {
        openBrowser(swaggerUrl);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

