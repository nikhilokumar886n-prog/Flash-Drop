import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function createPool() {
  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (rawUrl) {
    // Strip query parameters like channel_binding that can break node-postgres SSL handshake
    const cleanUrl = rawUrl.split('?')[0];
    const isLocal = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');

    return new pg.Pool({
      connectionString: cleanUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return new pg.Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'FlashDrop',
    password: process.env.PG_PASSWORD || 'Nikhil@2007',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export let pool = createPool();

/**
 * Convert standard ? placeholders into PostgreSQL $1, $2, ... format
 */
function formatPgQuery(sql, params = []) {
  let paramIndex = 1;
  const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { pgSql, params };
}

export const query = {
  async run(sql, params = []) {
    const { pgSql } = formatPgQuery(sql, params);
    const res = await pool.query(pgSql, params);
    return { changes: res.rowCount, rowCount: res.rowCount, rows: res.rows };
  },

  async get(sql, params = []) {
    const { pgSql } = formatPgQuery(sql, params);
    const res = await pool.query(pgSql, params);
    return res.rows[0] || null;
  },

  async all(sql, params = []) {
    const { pgSql } = formatPgQuery(sql, params);
    const res = await pool.query(pgSql, params);
    return res.rows;
  },

  async exec(sql) {
    await pool.query(sql);
  }
};

let dbInitialized = false;

/**
 * Ensure FlashDrop database and tables exist in PostgreSQL
 */
export async function initDatabase() {
  if (dbInitialized) return;

  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  // Step 1: In local mode without DATABASE_URL, check if FlashDrop database exists
  if (!rawUrl) {
    try {
      const adminClient = new pg.Client({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: 'postgres',
        password: process.env.PG_PASSWORD || 'Nikhil@2007',
        port: parseInt(process.env.PG_PORT || '5432', 10),
      });

      await adminClient.connect();
      const checkDb = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        ['FlashDrop']
      );

      if (checkDb.rowCount === 0) {
        console.log(`📦 Database "FlashDrop" not found. Creating PostgreSQL database...`);
        await adminClient.query(`CREATE DATABASE "FlashDrop"`);
        console.log(`✅ PostgreSQL database "FlashDrop" created.`);
      }
      await adminClient.end();
    } catch (err) {
      console.log(`ℹ️ Postgres check note: ${err.message}`);
    }
  }

  // Step 2: Test pool connection
  try {
    const client = await pool.connect();
    client.release();
    console.log(`🐘 Connected to PostgreSQL Database (Ready for production & cloud)`);
  } catch (err) {
    console.error(`❌ Failed to connect to PostgreSQL: ${err.message}`);
    throw err;
  }

  // Step 3: Create FlashDrop tables and indexes
  await query.exec(`
    CREATE TABLE IF NOT EXISTS shares (
      id VARCHAR(64) PRIMARY KEY,
      access_code VARCHAR(16) NOT NULL UNIQUE,
      manage_key VARCHAR(64) NOT NULL,
      title VARCHAR(255),
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      download_count INT DEFAULT 0,
      last_downloaded_at BIGINT,
      is_deleted INT DEFAULT 0,
      status VARCHAR(32) DEFAULT 'active'
    );

    CREATE INDEX IF NOT EXISTS idx_shares_access_code ON shares(access_code);
    CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
    CREATE INDEX IF NOT EXISTS idx_shares_status ON shares(status);

    CREATE TABLE IF NOT EXISTS files (
      id VARCHAR(64) PRIMARY KEY,
      share_id VARCHAR(64) NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      size_bytes BIGINT NOT NULL,
      storage_path TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_share_id ON files(share_id);
  `);

  dbInitialized = true;
  console.log('✅ PostgreSQL Schema verified (shares & files tables ready).');
}

export default query;
