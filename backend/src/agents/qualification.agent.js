const logger = require('../services/logger.service');
const db = require('../services/db.service');

const HIGH_PRIORITY_KEYWORDS = ['urgent', 'immediately'];

/**
 * Sets priority from message keywords and updates status to "qualified".
 */
async function runQualification(leadId) {
  const lead = await db.getLeadById(leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const messageLower = (lead.message || '').toLowerCase();
  const isHigh = HIGH_PRIORITY_KEYWORDS.some((kw) => messageLower.includes(kw));
  const priority = isHigh ? 'high' : 'normal';

  const updated = await db.updateLead(leadId, {
    priority,
    status: 'qualified',
  });

  logger.info('Qualification agent: lead qualified', {
    leadId,
    priority,
  });

  return updated;
}

module.exports = { runQualification };
