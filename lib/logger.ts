type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: Record<string, unknown>
  error?: {
    message: string
    stack?: string
  }
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    }
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    const entry = this.formatMessage(level, message, data, error)
    
    if (process.env.NODE_ENV === 'development') {
      const colorMap = {
        info: '\x1b[36m', 
        warn: '\x1b[33m', 
        error: '\x1b[31m', 
        debug: '\x1b[35m', 
      }
      const reset = '\x1b[0m'
      
      console.log(
        `${colorMap[level]}[${entry.timestamp}] [${level.toUpperCase()}]${reset} ${message}`,
        data ? JSON.stringify(data, null, 2) : '',
        error ? error.stack : ''
      )
    } else {
      
      console.log(JSON.stringify(entry))
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error))
    this.log('error', message, data, err)
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data)
    }
  }
}

export const logger = new Logger()

