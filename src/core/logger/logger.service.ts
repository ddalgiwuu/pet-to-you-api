import { Injectable, LoggerService as NestLoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.printMessage(message, 'log', context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printMessage(message, 'error', context);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: any, context?: string) {
    this.printMessage(message, 'warn', context);
  }

  debug(message: any, context?: string) {
    this.printMessage(message, 'debug', context);
  }

  verbose(message: any, context?: string) {
    this.printMessage(message, 'verbose', context);
  }

  private printMessage(message: any, logLevel: LogLevel, context?: string) {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    const logMessage = `[${timestamp}] [${logLevel.toUpperCase()}] [${ctx}] ${message}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
      case 'verbose':
        if (process.env.NODE_ENV === 'development') {
          console.log(logMessage);
        }
        break;
      default:
        console.log(logMessage);
    }
  }
}
