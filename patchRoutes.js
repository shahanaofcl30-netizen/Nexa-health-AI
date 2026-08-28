const fs = require('fs');

const apptFile = 'backend/src/routes/appointment.routes.ts';
let apptContent = fs.readFileSync(apptFile, 'utf8');

if (!apptContent.includes("firebaseAdminDb")) {
  apptContent = apptContent.replace(
    "import { Appointment",
    "import { firebaseAdminDb } from '../config/firebase';\nimport { Appointment"
  );
}

// Modify POST /api/appointments
const postApptPattern = /store\.appointments\.unshift\(newAppointment\);/g;
apptContent = apptContent.replace(
  postApptPattern,
  "await firebaseAdminDb.collection('appointments').doc(newAppointment.id).set(newAppointment);\n  store.appointments.unshift(newAppointment);"
);

// Modify PUT /api/appointments/:id/status
const putApptPattern = /apt\.updatedAt = new Date\(\)\.toISOString\(\);/g;
apptContent = apptContent.replace(
  putApptPattern,
  "apt.updatedAt = new Date().toISOString();\n  await firebaseAdminDb.collection('appointments').doc(apt.id).update({ status: apt.status, dateTime: apt.dateTime, updatedAt: apt.updatedAt });"
);

// Modify Invoice Creation inside PUT
const invoicePattern = /store\.invoices\.unshift\(\{/g;
apptContent = apptContent.replace(
  invoicePattern,
  "const newInv = {\n"
);
const invoiceEndPattern = /createdAt: new Date\(\)\.toISOString\(\),\n        patient,\n      \}\);/g;
apptContent = apptContent.replace(
  invoiceEndPattern,
  "createdAt: new Date().toISOString(),\n        patient,\n      };\n      await firebaseAdminDb.collection('invoices').doc(newInv.id).set(newInv);\n      store.invoices.unshift(newInv);"
);

fs.writeFileSync(apptFile, apptContent);


const patFile = 'backend/src/routes/patient.routes.ts';
let patContent = fs.readFileSync(patFile, 'utf8');

const postPatPattern = /store\.patients\.unshift\(newPatient\);/g;
patContent = patContent.replace(
  postPatPattern,
  "await firebaseAdminDb.collection('patients').doc(newPatient.id).set(newPatient);\n  store.patients.unshift(newPatient);"
);

const putPatPattern = /Object\.assign\(patient, req\.body, \{ updatedAt: new Date\(\)\.toISOString\(\) \}\);/g;
patContent = patContent.replace(
  putPatPattern,
  "Object.assign(patient, req.body, { updatedAt: new Date().toISOString() });\n  await firebaseAdminDb.collection('patients').doc(patient.id).set(patient);"
);

const postVitalsPattern = /store\.vitals\.unshift\(vitalsRecord\);/g;
patContent = patContent.replace(
  postVitalsPattern,
  "await firebaseAdminDb.collection('vitals').doc(vitalsRecord.id).set(vitalsRecord);\n  store.vitals.unshift(vitalsRecord);"
);

const postAlertPattern = /store\.clinicalAlerts\.unshift\(\{/g;
patContent = patContent.replace(
  postAlertPattern,
  "const newAlert = {"
);
const postAlertEndPattern = /createdAt: new Date\(\)\.toISOString\(\),\n    \}\);/g;
patContent = patContent.replace(
  postAlertEndPattern,
  "createdAt: new Date().toISOString(),\n    };\n    await firebaseAdminDb.collection('clinicalAlerts').doc(newAlert.id).set(newAlert);\n    store.clinicalAlerts.unshift(newAlert);"
);

fs.writeFileSync(patFile, patContent);

console.log('Routes patched to write to Firestore');
