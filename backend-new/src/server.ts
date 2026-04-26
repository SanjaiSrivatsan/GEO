import app from "./app.js";
import config from "./config/index.js";
import logger from "./config/logger.js";
import { connectDB } from "./config/database.js";

async function startServer(): Promise<void> {
  try {
    // Connect to database (non-blocking in dev mode)
    try {
      await connectDB();
    } catch (error) {
      if (config.nodeEnv === "development") {
        logger.warn("MongoDB connection failed. Running in offline mode.");
        logger.warn("Some features will not work until MongoDB is available.");
      } else {
        throw error;
      }
    }

    // Start Express server
    const server = app.listen(config.port, config.host, () => {
      logger.info(
        `✓ ${config.appName} v${config.appVersion} running on http://${config.host}:${config.port}`,
      );
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Debug mode: ${config.debug}`);
      logger.info(`API docs: http://${config.host}:${config.port}/`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      server.close(async () => {
        logger.info("Express server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      server.close(async () => {
        logger.info("Express server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
