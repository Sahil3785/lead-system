const logger = require('../services/logger.service');
const db = require('../services/db.service');
const { withRetry } = require('../utils/retry.util');

const DISPATCH_URL = 'https://jsonplaceholder.typicode.com/posts';

async function runDispatch(leadId) {
  const lead = await db.getLeadById(leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const body = {
    lead_email: lead.email,
    priority: lead.priority || 'normal',
  };

  const { success, retryCount, result, error } = await withRetry(
    async () => {
      const res = await fetch(DISPATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API returned ${res.status}: ${text}`);
      }
      return { statusCode: res.status };
    },
    { maxRetries: 2, delayMs: 1000 }
  );

  if (retryCount > 0) {
    logger.warn('Dispatch agent: retries used', { leadId, retryCount });
  }

  if (success) {
    await db.updateLead(leadId, {
      status: 'completed',
      api_response_code: result.statusCode,
      retry_count: retryCount,
    });
    logger.info('Dispatch agent: completed', {
      leadId,
      api_response_code: result.statusCode,
      retry_count: retryCount,
    });
    return { status: 'completed', api_response_code: result.statusCode, retry_count: retryCount };
  }

  await db.updateLead(leadId, {
    status: 'api_failed',
    retry_count: retryCount,
  });
  logger.error('Dispatch agent: api_failed after retries', {
    leadId,
    retry_count: retryCount,
    error: error?.message,
  });
  throw error;
}

module.exports = { runDispatch };
