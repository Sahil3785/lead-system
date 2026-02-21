const logger = require('../services/logger.service');
const db = require('../services/db.service');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SOURCES = ['facebook', 'google', 'website'];
const MIN_MESSAGE_LENGTH = 15;

/**
 * Validates lead payload and persists to DB.
 * If validation fails: insert with status "validation_failed" and return { valid: false, lead, errors }.
 * If valid: insert with status "received" and return { valid: true, lead }.
 */
async function runIntake(payload) {
  const { name, email, message, source } = payload;
  const errors = [];

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push('Invalid email format');
  }
  if (!message || typeof message !== 'string' || message.trim().length < MIN_MESSAGE_LENGTH) {
    errors.push(`Message must be at least ${MIN_MESSAGE_LENGTH} characters`);
  }
  if (!source || !ALLOWED_SOURCES.includes(source.toLowerCase())) {
    errors.push(`Source must be one of: ${ALLOWED_SOURCES.join(', ')}`);
  }

  const status = errors.length > 0 ? 'validation_failed' : 'received';
  const leadRow = {
    name: name || '',
    email: email || '',
    message: (message || '').trim(),
    source: (source || '').toLowerCase(),
    status,
  };

  const lead = await db.insertLead(leadRow);
  logger.info('Intake agent: lead persisted', {
    leadId: lead.id,
    status,
    validationErrors: errors.length ? errors : undefined,
  });

  if (errors.length > 0) {
    return { valid: false, lead, errors };
  }
  return { valid: true, lead };
}

module.exports = { runIntake, ALLOWED_SOURCES, MIN_MESSAGE_LENGTH };
