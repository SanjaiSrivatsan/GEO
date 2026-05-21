import mongoose from 'mongoose';
import { config } from './environment.js';
import logger from './logger.js';

export async function connectDB() {
  try {
    logger.info(`Connecting to MongoDB: ${config.MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);

    await mongoose.connect(config.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    logger.info('✅ MongoDB connection established');

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error disconnecting from MongoDB: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export default mongoose;
