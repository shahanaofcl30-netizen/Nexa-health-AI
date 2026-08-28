import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const config = {
  host: 'db.angccjasjfselvktpucs.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'shahana30200',
  ssl: {
    rejectUnauthorized: false
  }
};

const migrationFiles = [
  '20260824_initial_schema.sql',
  '20260824_complete_auth_system.sql',
  '20260824_hospital_treatment_flow.sql',
  '20260824_tamil_nadu_hospitals.sql',
  '20260824_auth_verification.sql',
  '20260824_supabase_master_sync.sql',
  '20260825_add_full_name_to_profiles.sql'
];

async function main() {
  const client = new Client(config);
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    // 1. Run migrations
    const migrationsDir = path.join(__dirname, '../../../supabase/migrations');
    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsDir, filename);
      console.log(`Running migration: ${filename}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`Migration ${filename} completed successfully!`);
    }

    // 2. Run seed
    const seedPath = path.join(__dirname, '../../../supabase/seed.sql');
    console.log('Running seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('seed.sql completed successfully!');

    console.log('Database schema and seed data applied successfully!');
  } catch (err) {
    console.error('Error executing migrations/seed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
