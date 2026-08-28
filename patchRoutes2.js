const fs = require('fs');

function patchFile(file, collection, varName, isUnshift = true) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes("firebaseAdminDb")) {
    content = content.replace(
      /import \{.*\} from '\.\.\/types\/shared';/,
      match => match + "\nimport { firebaseAdminDb } from '../config/firebase';"
    );
  }

  const pattern = new RegExp(`store\\.${collection}\\.${isUnshift ? 'unshift' : 'push'}\\(${varName}\\);`, 'g');
  content = content.replace(
    pattern,
    `await firebaseAdminDb.collection('${collection}').doc(${varName}.id).set(${varName});\n  store.${collection}.${isUnshift ? 'unshift' : 'push'}(${varName});`
  );

  fs.writeFileSync(file, content);
  console.log(`Patched ${file}`);
}

patchFile('backend/src/routes/treatment.routes.ts', 'treatments', 'newTreatment');
patchFile('backend/src/routes/prescription.routes.ts', 'prescriptions', 'newPrescription');
patchFile('backend/src/routes/clinicalNotes.routes.ts', 'clinicalNotes', 'newNote');
patchFile('backend/src/routes/lab.routes.ts', 'labOrders', 'newLabOrder');
patchFile('backend/src/routes/invoice.routes.ts', 'invoices', 'newInvoice');

