import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Explicitly check if the essential API key environment variable is set.
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error(
    'Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or empty in your environment configuration. ' +
    'Please create or check your .env.local file in the project root. It should contain all necessary Firebase `NEXT_PUBLIC_` variables. ' +
    'For example: NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here'
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  // This catch block handles errors during the initializeApp call itself.
  // These could be due to malformed config beyond just the API key (e.g., invalid projectId format).
  console.error("Firebase initialization error:", error);
  let errorMessage = 'Failed to initialize Firebase app. Please double-check your Firebase project configuration and ensure all `NEXT_PUBLIC_` environment variables (like NEXT_PUBLIC_FIREBASE_PROJECT_ID) are correctly set in your .env.local file.';
  if (error instanceof Error && error.message) {
    errorMessage += ` Specific Firebase error: ${error.message}`;
  }
  throw new Error(errorMessage);
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
