import winston from 'winston'

const env = process.env.NODE_ENV || 'development'

const logger = winston.createLogger({
  level: env === 'test' ? 'crit' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level.toUpperCase()}] ${message}`
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`
      }
      return msg
    }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.colorize({ all: true }),
    }),
  ],
})

// If you want to use this as middleware
const loggerMiddleware = (req: any, res: any, next: () => void) => {
  logger.debug(`${req.method} ${req.url}`)
  next()
}

export { logger, loggerMiddleware }
