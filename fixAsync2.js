const fs = require('fs');

// 1. Fix Invoice status
const apptFile = 'backend/src/routes/appointment.routes.ts';
let apptContent = fs.readFileSync(apptFile, 'utf8');
apptContent = apptContent.replace(/status: 'issued',/g, "status: 'issued' as any,");
fs.writeFileSync(apptFile, apptContent);

// 2. Fix PUT /api/patients/:id async and ClinicalAlert source
const patFile = 'backend/src/routes/patient.routes.ts';
let patContent = fs.readFileSync(patFile, 'utf8');
patContent = patContent.replace(/router\.put\('\/:id', \(req: AuthenticatedRequest/g, "router.put('/:id', async (req: AuthenticatedRequest");
patContent = patContent.replace(/source: 'vitals',/g, "source: 'vitals' as any,");
fs.writeFileSync(patFile, patContent);

console.log('Fixed additional typings and async');
