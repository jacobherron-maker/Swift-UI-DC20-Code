import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();

export const isCloudConfigured = Boolean(apiKey && authDomain && projectId && appId);

const firebaseApp = isCloudConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp({ apiKey, authDomain, projectId, appId })
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
