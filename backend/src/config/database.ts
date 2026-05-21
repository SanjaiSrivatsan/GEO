import mongoose from 'mongoose';
import { config } from './environment';
import logger from './logger';

let mongoServer: any;

export async function connectDB() {
  try {
    let uri = config.MONGODB_URI;

    // Use MongoDB Memory Server in development/test when local MongoDB unavailable
    if (
      (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') &&
      config.MONGODB_URI.includes('localhost')
    ) {
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        logger.info('🧪 Using MongoDB Memory Server for development');
      } catch (err) {
        logger.warn('MongoDB Memory Server not available, using configured URI');
      }
    }

    logger.info(`Connecting to MongoDB: ${uri.replace(/:[^:]*@/, ':****@')}`);

    await mongoose.connect(uri, {
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
    if (mongoServer) {
      await mongoServer.stop();
      logger.info('MongoDB Memory Server stopped');
    }
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error disconnecting from MongoDB: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export default mongoose;
