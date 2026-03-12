/**
 * 簡單的結構化日誌系統
 * 支援不同日誌級別和環境變數控制
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // 從環境變數讀取日誌級別，預設為 INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        this.logLevel = LogLevel.DEBUG;
        break;
      case 'INFO':
        this.logLevel = LogLevel.INFO;
        break;
      case 'WARN':
        this.logLevel = LogLevel.WARN;
        break;
      case 'ERROR':
        this.logLevel = LogLevel.ERROR;
        break;
      default:
        this.logLevel = LogLevel.INFO;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: object): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, context));
    }
  }
}

// 匯出單例實例
export const logger = Logger.getInstance();

// 匯出便捷函數
export const log = {
  debug: (message: string, context?: object) => logger.debug(message, context),
  info: (message: string, context?: object) => logger.info(message, context),
  warn: (message: string, context?: object) => logger.warn(message, context),
  error: (message: string, context?: object) => logger.error(message, context),
};
