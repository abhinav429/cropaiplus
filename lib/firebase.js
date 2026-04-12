import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Firebase client config — prefer NEXT_PUBLIC_* env vars so keys can be rotated
 * without code changes. Fallback values preserve existing project behavior when
 * env is not set (local dev).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDWdq_uVHIFlxeXvmg2Va_DlFBObyrB8nA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "cropai-1f3f7.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "cropai-1f3f7",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "cropai-1f3f7.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "829412701381",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:829412701381:web:6feef509416fdeee0b2cac",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-Z7YD29TM6S",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { auth };
