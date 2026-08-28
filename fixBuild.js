const fs = require('fs');
const path = require('path');

// 1. Fix ENV.JWT_SECRET in config/env.ts
const envFile = 'backend/src/config/env.ts';
let envContent = fs.readFileSync(envFile, 'utf8');
if (!envContent.includes('JWT_SECRET: string;')) {
  envContent = envContent.replace('export interface EnvConfig {', 'export interface EnvConfig {\n  JWT_SECRET: string;');
  envContent = envContent.replace('export const ENV: EnvConfig = {', "export const ENV: EnvConfig = {\n  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',");
  fs.writeFileSync(envFile, envContent);
}

// 2. Fix dbHealth.routes.ts
const dbHealthFile = 'backend/src/routes/dbHealth.routes.ts';
if (fs.existsSync(dbHealthFile)) {
  let dbContent = fs.readFileSync(dbHealthFile, 'utf8');
  dbContent = dbContent.replace("import { supabase } from '../db/supabaseClient';", "const supabase = null; // Removed supabase");
  fs.writeFileSync(dbHealthFile, dbContent);
}

// 3. Fix doctor.routes.ts
const docFile = 'backend/src/routes/doctor.routes.ts';
let docContent = fs.readFileSync(docFile, 'utf8');
// Fix missing imports from my earlier script
if (!docContent.includes("import { firebaseAdminDb } from '../config/firebase';")) {
  docContent = docContent.replace("import { Doctor } from '../types/shared';", "import { Doctor } from '../types/shared';\nimport { firebaseAdminDb } from '../config/firebase';");
}
docContent = docContent.replace(/fbDoctors\.forEach\(doc => \{/g, "fbDoctors.forEach((doc: any) => {");
fs.writeFileSync(docFile, docContent);

// Fix patient.routes.ts
const patFile = 'backend/src/routes/patient.routes.ts';
let patContent = fs.readFileSync(patFile, 'utf8');
patContent = patContent.replace(/fbPatients\.forEach\(doc => \{/g, "fbPatients.forEach((doc: any) => {");
fs.writeFileSync(patFile, patContent);

console.log("Fixes applied");
