import { store } from '../db/store';
import { firebaseAdminDb } from '../config/firebase';

async function seedCollection(collectionName: string, dataArray: any[]) {
  if (!dataArray || dataArray.length === 0) return;
  console.log(`Seeding ${dataArray.length} documents into ${collectionName}...`);

  const batchSize = 400;
  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = firebaseAdminDb.batch();
    const chunk = dataArray.slice(i, i + batchSize);
    
    for (const item of chunk) {
      if (!item.id) continue;
      const docRef = firebaseAdminDb.collection(collectionName).doc(item.id);
      batch.set(docRef, item);
    }
    
    await batch.commit();
    console.log(` Committed batch of ${chunk.length} to ${collectionName}`);
  }
}

async function runSeed() {
  console.log('Starting Firestore Seed from store.ts...');
  
  try {
    await seedCollection('users', store.users);
    await seedCollection('hospitals', store.hospitals);
    await seedCollection('hospitalDoctors', store.hospitalDoctors || []);
    await seedCollection('tamilNaduDistricts', store.tamilNaduDistricts || []);
    await seedCollection('patients', store.patients);
    await seedCollection('doctors', store.doctors);
    await seedCollection('appointments', store.appointments);
    await seedCollection('treatments', store.treatments);
    await seedCollection('vitals', store.vitals);
    await seedCollection('clinicalNotes', store.clinicalNotes);
    await seedCollection('medications', store.medications);
    await seedCollection('prescriptions', store.prescriptions);
    await seedCollection('labOrders', store.labOrders);
    await seedCollection('invoices', store.invoices);
    await seedCollection('pharmacies', store.pharmacies);
    await seedCollection('clinicalAlerts', store.clinicalAlerts);
    await seedCollection('medicationReminders', store.medicationReminders);
    
    console.log('✅ Firestore Seed Complete!');
  } catch (error) {
    console.error('❌ Error during Firestore seed:', error);
  }
}

runSeed();
