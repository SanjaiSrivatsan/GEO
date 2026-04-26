import mongoose from "mongoose";
import config from "./index.js";
import logger from "./logger.js";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    logger.info("Already connected to MongoDB");
    return;
  }

  try {
    logger.info(
      `Connecting to MongoDB at ${config.mongodbUrl.replace(/\/\/.*:.*@/, "//")}...`,
    );

    const connectionPromise = mongoose.connect(config.mongodbUrl, {
      retryWrites: true,
      w: "majority",
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    // Create timeout race for faster failure
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("MongoDB connection timeout")), 5000),
    );

    await Promise.race([connectionPromise, timeoutPromise]);

    isConnected = true;
    logger.info("✓ Successfully connected to MongoDB");

    // Setup event listeners
    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      logger.warn("MongoDB connection disconnected");
    });

    mongoose.connection.on("error", (error) => {
      logger.error("MongoDB connection error:", error);
    });
  } catch (error) {
    logger.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("✓ Successfully disconnected from MongoDB");
  } catch (error) {
    logger.error("Failed to disconnect from MongoDB:", error);
    throw error;
  }
}

export function getIsConnected(): boolean {
  return isConnected;
}

export default {
  connectDB,
  disconnectDB,
  getIsConnected,
};
