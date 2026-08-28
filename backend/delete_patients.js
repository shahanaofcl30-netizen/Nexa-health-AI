const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function deletePatients() {
  const snapshot = await db.collection('patients').get();
  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Found patient: ${doc.id} - ${data.firstName} ${data.lastName}`);
    if ((data.firstName === 'Robert' && data.lastName === 'Johnson') || 
        (data.firstName === 'shahana') || 
        (data.firstName === 'shahana k') ||
        (data.firstName === 'shahana' && data.lastName === 'k')) {
      console.log('Deleting', data.firstName, data.lastName);
      doc.ref.delete();
      count++;
    }
  });
  console.log(`Deleted ${count} patients.`);
  process.exit(0);
}

deletePatients().catch(err => {
  console.error(err);
  process.exit(1);
});
