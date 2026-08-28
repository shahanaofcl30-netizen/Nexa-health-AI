const fs = require('fs');

const patFile = 'backend/src/routes/patient.routes.ts';
let patContent = fs.readFileSync(patFile, 'utf8');

if (!patContent.includes("firebaseAdminDb")) {
  patContent = patContent.replace(
    "import { Patient, Vitals } from '../types/shared';",
    "import { Patient, Vitals } from '../types/shared';\nimport { firebaseAdminDb } from '../config/firebase';"
  );
}

// Modify GET /api/patients
const getPatientsStart = patContent.indexOf("router.get('/', (req: AuthenticatedRequest, res: Response) => {");
const getPatientsEnd = patContent.indexOf("});", getPatientsStart) + 3;

const newGetPatients = `router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  let results = [...store.patients];
  try {
    const fbPatients = await firebaseAdminDb.collection('patients').get();
    fbPatients.forEach(doc => {
      if (!results.find(p => p.id === doc.id)) {
        results.push(doc.data() as Patient);
      }
    });
  } catch(e) {}

  if (query) {
    results = results.filter(
      (p) =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.mrn.toLowerCase().includes(query) ||
        p.phone.includes(query)
    );
  }

  res.json(results);
});`;

patContent = patContent.substring(0, getPatientsStart) + newGetPatients + patContent.substring(getPatientsEnd);

fs.writeFileSync(patFile, patContent);

const docFile = 'backend/src/routes/doctor.routes.ts';
let docContent = fs.readFileSync(docFile, 'utf8');

if (!docContent.includes("firebaseAdminDb")) {
  docContent = docContent.replace(
    "import { Doctor } from '../types/shared';",
    "import { Doctor } from '../types/shared';\nimport { firebaseAdminDb } from '../config/firebase';"
  );
}

const getDoctorsStart = docContent.indexOf("router.get('/', (req: AuthenticatedRequest, res: Response) => {");
const getDoctorsEnd = docContent.indexOf("});", getDoctorsStart) + 3;

const newGetDoctors = `router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  const hospitalId = req.query.hospitalId as string;
  let results = [...store.doctors];

  try {
    const fbDoctors = await firebaseAdminDb.collection('doctors').get();
    fbDoctors.forEach(doc => {
      if (!results.find(d => d.id === doc.id)) {
        results.push(doc.data() as Doctor);
      }
    });
  } catch(e) {}

  if (hospitalId) {
    results = results.filter((d) => d.hospitalId === hospitalId);
  }

  if (query) {
    results = results.filter((d) => {
      const user = store.users.find(u => u.id === d.userId);
      const nameMatch = user ? (user.firstName.toLowerCase().includes(query) || user.lastName.toLowerCase().includes(query)) : false;
      return d.specialization.toLowerCase().includes(query) || d.licenseNumber.toLowerCase().includes(query) || nameMatch;
    });
  }

  res.json(results);
});`;

if (getDoctorsStart !== -1) {
  docContent = docContent.substring(0, getDoctorsStart) + newGetDoctors + docContent.substring(getDoctorsEnd);
  fs.writeFileSync(docFile, docContent);
}
