/**
 * Structured logger: timestamp, level, and JSON-safe payload.
 * Logs to console; can be extended to ship to external services.
 */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};

module.exports = logger;
