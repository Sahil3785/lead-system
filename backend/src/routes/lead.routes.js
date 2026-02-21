const express = require('express');
const logger = require('../services/logger.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { runIntake } = require('../agents/intake.agent');
const { runQualification } = require('../agents/qualification.agent');
const { runDispatch } = require('../agents/dispatch.agent');

const router = express.Router();

/**
 * Validates that body has exactly: name, email, message, source (all strings).
 * Rejects extra fields or wrong types so we accept ONLY the required format.
 */
function validateLeadBody(body) {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Body must be a JSON object' };
  const { name, email, message, source } = body;
  if (typeof name !== 'string') return { valid: false, error: 'name must be a string' };
  if (typeof email !== 'string') return { valid: false, error: 'email must be a string' };
  if (typeof message !== 'string') return { valid: false, error: 'message must be a string' };
  if (typeof source !== 'string') return { valid: false, error: 'source must be a string' };
  const allowedKeys = ['name', 'email', 'message', 'source'];
  const keys = Object.keys(body);
  if (keys.some((k) => !allowedKeys.includes(k))) {
    return { valid: false, error: 'Only name, email, message, source are allowed' };
  }
  return { valid: true, payload: { name, email, message, source } };
}

/**
 * POST /api/lead
 * Accepts only: { name, email, message, source }.
 * Pipeline: Intake -> (if valid) Qualification -> Dispatch.
 */
router.post(
  '/lead',
  asyncHandler(async (req, res) => {
    logger.info('Incoming request', { path: '/api/lead', method: 'POST' });

    const bodyCheck = validateLeadBody(req.body);
    if (!bodyCheck.valid) {
      logger.info('Validation result: body rejected', { error: bodyCheck.error });
      return res.status(400).json({ error: bodyCheck.error });
    }

    const { payload } = bodyCheck;

    // Agent 1: Intake — validate and persist
    const intakeResult = await runIntake(payload);
    if (!intakeResult.valid) {
      logger.info('Final status: validation_failed', { leadId: intakeResult.lead.id });
      return res.status(400).json({
        error: 'Validation failed',
        details: intakeResult.errors,
        leadId: intakeResult.lead.id,
      });
    }

    const leadId = intakeResult.lead.id;

    // Agent 2: Qualification — set priority and status = qualified
    await runQualification(leadId);
    logger.info('Agent transition: received -> qualified', { leadId });

    // Agent 3: Dispatch — POST to external API with retry
    try {
      await runDispatch(leadId);
      logger.info('Final status: completed', { leadId });
      return res.status(201).json({
        message: 'Lead processed successfully',
        leadId,
        status: 'completed',
      });
    } catch (err) {
      logger.info('Final status: api_failed', { leadId });
      return res.status(502).json({
        error: 'Lead saved but dispatch to external API failed',
        leadId,
        status: 'api_failed',
      });
    }
  })
);

module.exports = router;
