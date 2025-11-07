#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lightsns_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  console.log('✓ Migrations table ready');
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  const result = await pool.query('SELECT filename FROM migrations ORDER BY id');
  return result.rows.map(row => row.filename);
}

/**
 * Get list of migration files
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  return files;
}

/**
 * Execute a migration file
 */
async function executeMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    await pool.query('BEGIN');

    // Execute migration SQL
    await pool.query(sql);

    // Record migration
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [filename]
    );

    await pool.query('COMMIT');
    console.log(`✓ Executed migration: ${filename}`);
    return true;
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`✗ Failed to execute migration: ${filename}`);
    console.error(`  Error: ${error.message}`);
    throw error;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  try {
    console.log('Starting database migrations...\n');

    // Create migrations table
    await createMigrationsTable();

    // Get executed and pending migrations
    const executedMigrations = await getExecutedMigrations();
    const allMigrations = getMigrationFiles();
    const pendingMigrations = allMigrations.filter(
      file => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations. Database is up to date.');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);
    pendingMigrations.forEach(file => console.log(`  - ${file}`));
    console.log('');

    // Execute each pending migration
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }

    console.log('\n✓ All migrations completed successfully!');
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();
