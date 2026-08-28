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

async function main() {
  const client = new Client(config);
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    // Run migration
    const filePath = path.join(__dirname, '../../../supabase/migrations/20260825_firebase_auth_migration.sql');
    console.log(`Running migration: 20260825_firebase_auth_migration.sql...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log(`Migration completed successfully!`);

  } catch (err) {
    console.error('Error executing migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
