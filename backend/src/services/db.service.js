const { Pool } = require('pg');
const logger = require('./logger.service');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = (process.env.DATABASE_URL || '').trim().replace(/\r$/, '');
    if (!connectionString) {
      throw new Error('DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE) must be set');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.PGSSLMODE === 'require' || connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('error', (err) => logger.error('DB pool error', { error: err.message }));
  }
  return pool;
}

/**
 * Insert a new lead. Returns the inserted row (with id, created_at, etc.).
 */
async function insertLead(row) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `insert into leads (name, email, message, source, priority, status, api_response_code, retry_count)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        row.name,
        row.email,
        row.message,
        row.source,
        row.priority ?? null,
        row.status ?? null,
        row.api_response_code ?? null,
        row.retry_count ?? 0,
      ]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update lead by id. Only provided fields are updated.
 */
async function updateLead(id, updates) {
  const client = await getPool().connect();
  try {
    const allowed = ['priority', 'status', 'api_response_code', 'retry_count'];
    const setParts = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        setParts.push(`${key} = $${i}`);
        values.push(updates[key]);
        i++;
      }
    }
    if (setParts.length === 0) return null;
    values.push(id);
    const { rows } = await client.query(
      `update leads set ${setParts.join(', ')}, updated_at = now() where id = $${i} returning *`,
      values
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Get lead by id.
 */
async function getLeadById(id) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query('select * from leads where id = $1', [id]);
    return rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { getPool, insertLead, updateLead, getLeadById };
