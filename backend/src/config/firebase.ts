import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  try {
    const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized with service account.');
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const firebaseAdminAuth = getAuth();
export const firebaseAdminDb = getFirestore();
