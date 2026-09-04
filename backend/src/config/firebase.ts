import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Fix escaped newlines in the private key if provided via env vars
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        })
      });
      console.log('Firebase Admin initialized with environment variables.');
    } else {
      const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log('Firebase Admin initialized with service account JSON file.');
      } else {
        console.warn('Firebase Admin skipped: No environment variables or service account JSON found.');
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const firebaseAdminAuth = (getApps().length > 0 ? getAuth() : null) as unknown as Auth;
export const firebaseAdminDb = (getApps().length > 0 ? getFirestore() : null) as unknown as Firestore;
