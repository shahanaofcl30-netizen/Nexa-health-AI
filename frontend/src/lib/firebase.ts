import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAEc9qSWafF2j_HptM5waV_CXya1Kmfdpg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nexa-health-ai.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nexa-health-ai',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'nexa-health-ai.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '833503484366',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:833503484366:web:0763b444ba4bb3ac96b39f'
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
