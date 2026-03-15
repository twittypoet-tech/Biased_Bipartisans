/**
 * Structured logger for Bipi services.
 * Outputs JSON-formatted log lines for production observability.
 * Falls back to human-readable format in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const minLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'info'] ?? 1
const isProduction = process.env.NODE_ENV === 'production'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= minLevel
}

function formatMessage(level: LogLevel, service: string, message: string, data?: Record<string, unknown>): string {
  if (isProduction) {
    return JSON.stringify({
      level,
      service,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    })
  }

  const prefix = `[${level.toUpperCase().padEnd(5)}] [${service}]`
  const dataStr = data ? ` ${JSON.stringify(data)}` : ''
  return `${prefix} ${message}${dataStr}`
}

export function createLogger(service: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (shouldLog('debug')) console.debug(formatMessage('debug', service, message, data))
    },
    info(message: string, data?: Record<string, unknown>) {
      if (shouldLog('info')) console.log(formatMessage('info', service, message, data))
    },
    warn(message: string, data?: Record<string, unknown>) {
      if (shouldLog('warn')) console.warn(formatMessage('warn', service, message, data))
    },
    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      if (shouldLog('error')) {
        const errorData = error instanceof Error
          ? { errorMessage: error.message, stack: error.stack, ...data }
          : { errorMessage: String(error), ...data }
        console.error(formatMessage('error', service, message, errorData))
      }
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
