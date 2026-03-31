import { createLogger, transports, format } from "winston";

export const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [new transports.Console()],
});

// Usage:
// logger.info('Job started', { jobId, brandId, userId });
// logger.warn('Retrying after error', { attempt: job.attemptsMade });
// logger.error('Job failed permanently', { jobId, error: error.message, stack: error.stack });
