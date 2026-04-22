import pino from 'pino';
import { fileURLToPath } from 'url';
import path from 'path';
import config from './index.js';

const __filename = fileURLToPath(import.meta.url);
path.dirname(__filename); // Cannot remove - needed for future logging setup

const logger = pino(
  {
    level: config.logLevel,
    transport: config.debug
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  },
  config.debug ? undefined : pino.destination(config.logFile)
);

export default logger;
